import {
  BufferAttribute,
  Camera,
  Color,
  InterleavedBuffer,
  Matrix3,
  Matrix4,
  Mesh,
  Scene,
  Texture,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import { WebGPUMaterial } from './WebGPUMaterial';
import { wgsl } from './StructBuffer';
import { MaybePromise } from '../types';

declare global {
  interface GPUCanvasContext {
    configured: boolean;
  }
}

declare module 'three' {
  interface IUniform {
    type: wgsl.Primitive | 'texture2d_f32';
  }
}

interface GPUMaterial {
  pipeline?: GPURenderPipeline;
  pipelineNeedsUpdate?: boolean;
  bindGroup: GPUBindGroup;
  uniform?: GPUBuffer;
  uniformStruct: wgsl.StructBuffer<any>;
  version: number;
}

interface GPUGeometry {
  position?: GPUBuffer;
  uv?: GPUBuffer;
  normal?: GPUBuffer;
  index?: GPUBuffer;
}

const SideMap = ['front', 'back', 'none'] as const;

export class WebGPURenderer {
  adapter!: GPUAdapter;
  device!: GPUDevice;
  queue!: GPUQueue;
  canvasFormat!: GPUTextureFormat;
  canvasCfg!: GPUCanvasConfiguration;
  depthTextures = new Map<string, GPUTexture>();
  lastSubmit!: Promise<undefined>;
  samplerCache: { [k: string]: GPUSampler } = {};

  async init() {
    this.adapter = (await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }))!;
    this.device = await this.adapter!.requestDevice();
    this.queue = this.device.queue;
    this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    this.canvasCfg = {
      device: this.device,
      format: this.canvasFormat,
      alphaMode: 'opaque',
    } satisfies GPUCanvasConfiguration;
  }

  createBuffer(
    data: Float32Array | Uint32Array | Uint8Array | Uint16Array,
    usage: GPUFlagsConstant,
    mappedAtCreation = false,
    alignment = 4,
  ) {
    const buffer = this.device.createBuffer({
      usage,
      size: align(data.byteLength, alignment),
      mappedAtCreation,
    });
    if (mappedAtCreation) {
      // @ts-ignore
      new data.constructor(buffer.getMappedRange()).set(data);
      buffer.unmap();
    }
    return buffer;
  }

  async createTexture(texture: Texture, flipY = true) {
    const img = texture.image as HTMLImageElement;
    // TODO needsUpdate
    if (!texture.userData.gpuTexture) {
      await img.decode();
      const bitmap = await createImageBitmap(img, {
        // @ts-ignore
        imageOrientation: flipY ? 'flipY' : 'from-image',
      });
      const colorTexture = this.device.createTexture({
        size: [bitmap.width, bitmap.height, 1],
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.TEXTURE_BINDING,
      });
      this.queue.copyExternalImageToTexture({ source: bitmap }, { texture: colorTexture }, [
        bitmap.width,
        bitmap.height,
      ]);
      texture.userData.gpuTexture = colorTexture;
    }

    return texture.userData.gpuTexture as GPUTexture;
  }

  prepareCtx(targetCtx: GPUCanvasContext) {
    if (!targetCtx.configured) {
      targetCtx.configure({
        device: this.device,
        format: this.canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        alphaMode: 'opaque',
      });
      targetCtx.configured = true;
    }

    const { width, height } = targetCtx.canvas;
    const key = `${Math.ceil(width)}x${Math.ceil(height)}`;
    let depthTexture = this.depthTextures.get(key);
    if (!depthTexture) {
      depthTexture = this.device.createTexture({
        size: [width, height, 1],
        format: 'depth24plus',
        dimension: '2d',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this.depthTextures.set(key, depthTexture);
    }
    return depthTexture;
  }

  prepareMesh(mesh: Mesh) {
    const { device, queue } = this;
    const geometry = mesh.geometry;
    const material = (
      Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    ) as WebGPUMaterial;

    if (!material.vertexShader || !material.fragmentShader) return;

    const gpuGeometry = geometry.userData as GPUGeometry;
    const gpuMaterial = material.userData as GPUMaterial;

    if (!gpuGeometry.position) {
      (['position', 'normal', 'uv'] as const).forEach(name => {
        const attribute = geometry.getAttribute(name);
        let bufferAttribute = attribute as BufferAttribute;
        if (attribute instanceof InterleavedBuffer) {
          // @ts-ignore 变成bufferAttribute
          bufferAttribute = attribute.clone() as BufferAttribute;
        }
        gpuGeometry[name] = this.createBuffer(
          bufferAttribute.array as any,
          GPUBufferUsage.VERTEX,
          true,
        );
      });

      if (geometry.index) {
        gpuGeometry.index = this.createBuffer(
          geometry.index.array as any,
          GPUBufferUsage.INDEX,
          true,
        );
      }
    }

    if (material.version !== material.userData.version) {
      gpuMaterial.version = material.version;

      (async () => {
        // 分离binding和uniform
        const bindingLayoutEntries: GPUBindGroupLayoutEntry[] = [];
        const uniformStruct: wgsl.Struct = {};
        const bindingEntries: GPUBindGroupEntry[] = [];
        const uniformUsed = Object.values(material.sg.uniformMap).map(i => i.name);
        await Promise.all(
          Object.keys(material.uniforms).map(async key => {
            const uniform = material.uniforms[key];
            const bindingCfg = material.sg.bindingMap[key.replace('sg_', '')];
            if (uniform.type === 'texture2d_f32') {
              if (!bindingCfg) return;
              const binding = bindingCfg.index;
              bindingLayoutEntries.push({
                binding,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: {},
              });
              const texture = await this.createTexture(uniform.value);
              bindingEntries.push({ binding, resource: texture.createView() });
            } else if (uniformUsed.includes(key)) {
              uniformStruct[key] = uniform.type;
            }
          }),
        );

        Object.keys(material.sg.bindingMap).forEach(key => {
          const binding = material.sg.bindingMap[key];
          if (binding.type === 'sampler') {
            const { filter, warp } = material.sg.resource.sampler[key]!;
            const cacheKey = filter + '_' + warp;
            let sampler = this.samplerCache[cacheKey];
            if (!sampler) {
              const desc: GPUSamplerDescriptor = {};
              if (filter === 'point') {
                desc.minFilter = 'nearest';
                desc.magFilter = 'nearest';
                desc.mipmapFilter = 'nearest';
              } else if (filter === 'linear') {
                desc.minFilter = 'linear';
                desc.magFilter = 'linear';
                desc.mipmapFilter = 'nearest';
              } else {
                desc.minFilter = 'linear';
                desc.magFilter = 'linear';
                desc.mipmapFilter = 'linear';
              }

              let warpMode: GPUAddressMode;
              if (warp === 'clamp') warpMode = 'clamp-to-edge';
              else if (warp === 'mirror') warpMode = 'mirror-repeat';
              else warpMode = 'repeat';
              desc.addressModeU = warpMode;
              desc.addressModeV = warpMode;
              desc.addressModeW = warpMode;

              this.samplerCache[cacheKey] = sampler = device.createSampler(desc);
            }

            bindingLayoutEntries.push({
              binding: binding.index,
              visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
              sampler: {},
            });
            bindingEntries.push({ binding: binding.index, resource: sampler });
          }
        });

        const bindGroupLayout = device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
              buffer: {},
            },
            ...bindingLayoutEntries,
          ],
        });

        const uniformStructBuffer = new wgsl.StructBuffer(uniformStruct);
        const uniformBuffer = this.createBuffer(
          uniformStructBuffer.buffer,
          GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );

        const vsm = device.createShaderModule({ code: material.vertexShader });
        const fsm = device.createShaderModule({ code: material.fragmentShader });
        const pipeline = await device.createRenderPipelineAsync({
          layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
          vertex: {
            module: vsm,
            entryPoint: 'main',
            // position uv normal
            buffers: [
              {
                arrayStride: 4 * 3,
                attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
              },
              {
                arrayStride: 4 * 2,
                attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x2' }],
              },
              {
                arrayStride: 4 * 3,
                attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x3' }],
              },
            ],
          },
          fragment: {
            module: fsm,
            entryPoint: 'main',
            targets: [{ format: this.canvasFormat }],
            // TODO blend
          },
          primitive: {
            topology: 'triangle-list',
            cullMode: SideMap[material.side],
            frontFace: 'cw',
          },
          depthStencil: {
            depthWriteEnabled: material.depthWrite,
            depthCompare: 'less',
            format: 'depth24plus',
          },
        });

        const oldUniformBuffer = gpuMaterial.uniform;
        oldUniformBuffer && Promise.resolve(this.lastSubmit).then(() => oldUniformBuffer.destroy());

        gpuMaterial.pipeline = pipeline;
        gpuMaterial.uniform = uniformBuffer;
        gpuMaterial.uniformStruct = uniformStructBuffer;
        gpuMaterial.bindGroup = device.createBindGroup({
          layout: bindGroupLayout,
          entries: [{ binding: 0, resource: { buffer: uniformBuffer } }, ...bindingEntries],
        });
      })();
    }

    // 同步uniform
    const { uniform, uniformStruct } = gpuMaterial;
    if (uniform && uniformStruct) {
      Object.keys(material.uniforms).forEach(name => {
        const { type, value } = material.uniforms[name];
        if (value === undefined || value === null) return;
        if (type === 'f32' || type === 'i32' || type === 'u32') {
          if (uniformStruct.view[name] !== undefined) uniformStruct.view[name] = value;
        }
        if (type.startsWith('vec') || type.startsWith('mat')) {
          if (value instanceof Color) {
            uniformStruct.view[name]?.set([value.r, value.g, value.b]);
          } else if (value instanceof Vector2) {
            uniformStruct.view[name]?.set([value.x, value.y]);
          } else if (value instanceof Vector3) {
            uniformStruct.view[name]?.set([value.x, value.y, value.z]);
          } else if (value instanceof Vector4) {
            uniformStruct.view[name]?.set([value.x, value.y, value.z, value.w]);
          } else if (value instanceof Matrix3) {
            // TODO wgsl matrix3 内存布局和three不一样
          } else if (value instanceof Matrix4) {
            uniformStruct.view[name]?.set(value.elements);
          } else if (Array.isArray(value)) {
            uniformStruct.view[name]?.set(value);
          } else debugger;
        }
      });
      queue.writeBuffer(
        uniform,
        0,
        uniformStruct.buffer,
        uniformStruct.buffer.byteOffset,
        uniformStruct.buffer.byteLength,
      );
    }
  }

  render(scene: Scene, camera: Camera, targetCtx: GPUCanvasContext) {
    if (targetCtx.canvas.width === 0) return;

    const depthTexture = this.prepareCtx(targetCtx);
    // 绘制背景 只支持纯色
    const clearValue = { r: 1, g: 0, b: 0, a: 1 };
    const bgColor = scene.background as Color | undefined;
    if (bgColor && bgColor.isColor) Color.prototype.copy.call(clearValue, bgColor);

    // 更新矩阵
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();

    // 只是简单的shader graph 也不需要透明度排序啥
    scene.traverseVisible(node => {
      if (node instanceof Mesh) this.prepareMesh(node);
    });

    // 写入draw calls
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: targetCtx.getCurrentTexture().createView(),
          clearValue,
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    const { width: w, height: h } = targetCtx.canvas;
    passEncoder.setViewport(0, 0, w, h, 0, 1);
    passEncoder.setScissorRect(0, 0, w, h);

    scene.traverseVisible(node => {
      if (node instanceof Mesh) {
        const geometry = node.geometry;
        const material = (
          Array.isArray(node.material) ? node.material[0] : node.material
        ) as WebGPUMaterial;
        const gpuGeometry = geometry.userData as GPUGeometry;
        const gpuMaterial = material.userData as GPUMaterial;
        if (
          !material.vertexShader ||
          !material.fragmentShader ||
          !gpuMaterial.pipeline ||
          !gpuGeometry.position ||
          gpuMaterial.pipeline instanceof Promise
        )
          return;

        passEncoder.setPipeline(gpuMaterial.pipeline as GPURenderPipeline);
        passEncoder.setBindGroup(0, gpuMaterial.bindGroup);
        if (gpuGeometry.index) passEncoder.setIndexBuffer(gpuGeometry.index, 'uint16');
        passEncoder.setVertexBuffer(0, gpuGeometry.position!);
        passEncoder.setVertexBuffer(1, gpuGeometry.uv!);
        passEncoder.setVertexBuffer(2, gpuGeometry.normal!);
        if (gpuGeometry.index) {
          passEncoder.drawIndexed(geometry.index!.count);
        } else {
          passEncoder.draw(geometry.getAttribute('position').count);
        }
      }
    });
    passEncoder.end();
    this.queue.submit([commandEncoder.finish()]);
    this.lastSubmit = this.queue.onSubmittedWorkDone();
  }
}

const align = (len: number, alignment: number = 4) => {
  return (len + (alignment - 1)) & ~(alignment - 1);
};

// prettier-ignore
// @ts-ignore
Matrix4.prototype.makePerspective = function ( left, right, top, bottom, near, far ) {

	const te = this.elements;
	const x = 2 * near / ( right - left );
	const y = 2 * near / ( top - bottom );

	const a = ( right + left ) / ( right - left );
	const b = ( top + bottom ) / ( top - bottom );
	const c = - far / ( far - near );
	const d = - far * near / ( far - near );

	te[ 0 ] = x;	te[ 4 ] = 0;	te[ 8 ] = a;	te[ 12 ] = 0;
	te[ 1 ] = 0;	te[ 5 ] = y;	te[ 9 ] = b;	te[ 13 ] = 0;
	te[ 2 ] = 0;	te[ 6 ] = 0;	te[ 10 ] = c;	te[ 14 ] = d;
	te[ 3 ] = 0;	te[ 7 ] = 0;	te[ 11 ] = - 1;	te[ 15 ] = 0;

	return this;

};

// prettier-ignore
Matrix4.prototype.makeOrthographic = function ( left, right, top, bottom, near, far ) {

	const te = this.elements;
	const w = 1.0 / ( right - left );
	const h = 1.0 / ( top - bottom );
	const p = 1.0 / ( far - near );

	const x = ( right + left ) * w;
	const y = ( top + bottom ) * h;
	const z = near * p;

	te[ 0 ] = 2 * w;	te[ 4 ] = 0;		te[ 8 ] = 0;		te[ 12 ] = - x;
	te[ 1 ] = 0;		te[ 5 ] = 2 * h;	te[ 9 ] = 0;		te[ 13 ] = - y;
	te[ 2 ] = 0;		te[ 6 ] = 0;		te[ 10 ] = - 1 * p;	te[ 14 ] = - z;
	te[ 3 ] = 0;		te[ 7 ] = 0;		te[ 11 ] = 0;		te[ 15 ] = 1;

	return this;

};
