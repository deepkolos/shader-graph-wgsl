import { BufferAttribute, BufferGeometry, Camera, Color, InterleavedBuffer, Matrix3, Matrix4, Mesh, Scene, Texture, Vector2, Vector3, Vector4 } from 'three';
import { WebGPUMaterial } from './WebGPUMaterial';
import { wgsl } from './StructBuffer';
import { OpaquePass } from './OpaquePass';

declare global {
  interface GPUCanvasContext {
    configured: boolean;
  }
}

declare module 'three' {
  interface IUniform {
    type: wgsl.Primitive | 'texture2d_f32' | 'texture_depth_2d' | 'texture_2d<f32>';
  }
}

export interface GPUMaterial {
  pipeline?: GPURenderPipeline;
  pipelineNeedsUpdate?: boolean;
  bindGroup: GPUBindGroup;
  uniform?: GPUBuffer;
  uniformStruct: wgsl.StructBuffer<any>;
  version: number;
}

export interface GPUGeometry {
  position?: GPUBuffer;
  uv?: GPUBuffer;
  normal?: GPUBuffer;
  tangent?: GPUBuffer;
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
  viewport: number[] = [0, 0];
  opaquePass = new OpaquePass(this);
  defaultDepthTexture?: GPUTexture;
  defaultColorTexture?: GPUTexture;
  defaultDepthTextureView?: GPUTextureView;
  defaultColorTextureView?: GPUTextureView;

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

  createBuffer(data: Float32Array | Uint32Array | Uint8Array | Uint16Array, usage: GPUFlagsConstant, mappedAtCreation = false, alignment = 4) {
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

  private async createTextureFromImg(img: HTMLImageElement, flipY: boolean) {
    await img.decode();
    const bitmap = await createImageBitmap(img, {
      // @ts-ignore
      imageOrientation: flipY ? 'flipY' : 'from-image',
    });
    const colorTexture = this.device.createTexture({
      size: [bitmap.width, bitmap.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.queue.copyExternalImageToTexture({ source: bitmap }, { texture: colorTexture }, [bitmap.width, bitmap.height]);
    return colorTexture;
  }

  createTexture(texture: Texture, flipY = true) {
    const img = texture.image as HTMLImageElement;
    // TODO needsUpdate
    if (!texture.userData.gpuTexture) {
      texture.userData.gpuTexture = this.createTextureFromImg(img, flipY).then(colorTexture => {
        texture.userData.gpuTexture = colorTexture;
        return colorTexture;
      });
    }

    return texture.userData.gpuTexture as GPUTexture | Promise<GPUTexture>;
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
    this.viewport = [width, height];
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

    if (!this.defaultDepthTexture) {
      this.defaultDepthTexture = this.device.createTexture({
        size: [1, 1, 1],
        format: 'depth24plus',
        dimension: '2d',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      this.defaultDepthTextureView = this.defaultDepthTexture.createView();
    }
    if (!this.defaultColorTexture) {
      this.defaultColorTexture = this.device.createTexture({
        size: [1, 1, 1],
        format: this.canvasFormat,
        dimension: '2d',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      this.defaultColorTextureView = this.defaultColorTexture.createView();
    }
    return depthTexture;
  }

  prepareMesh(mesh: Mesh) {
    const { device, queue } = this;
    const geometry = mesh.geometry;
    const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as WebGPUMaterial;

    if (!material.vertexShader || !material.fragmentShader) return;

    const gpuGeometry = geometry.userData as GPUGeometry;
    const gpuMaterial = material.userData as GPUMaterial;

    if (!gpuGeometry.position) {
      geometry.computeTangents();
      (['position', 'normal', 'uv', 'tangent'] as const).forEach(name => {
        const attribute = geometry.getAttribute(name);
        let bufferAttribute = attribute as BufferAttribute;
        if (attribute instanceof InterleavedBuffer) {
          // @ts-ignore 变成bufferAttribute
          bufferAttribute = attribute.clone() as BufferAttribute;
        }
        gpuGeometry[name] = this.createBuffer(bufferAttribute.array as any, GPUBufferUsage.VERTEX, true);
      });

      if (geometry.index) {
        gpuGeometry.index = this.createBuffer(geometry.index.array as any, GPUBufferUsage.INDEX, true);
      }
    }

    if (material.version !== material.userData.version) {
      gpuMaterial.version = material.version;
      // console.log(material, material.uniforms);

      (async () => {
        // 分离binding和uniform
        const bindingLayoutEntries: GPUBindGroupLayoutEntry[] = [];
        const uniformStruct: wgsl.Struct = {};
        const bindingEntries: GPUBindGroupEntry[] = [];
        const uniformUsed = Object.values(material.sg.uniformMap).map(i => i.name);
        await Promise.all(
          Object.keys(material.uniforms)
            .sort()
            .map(async key => {
              const uniform = material.uniforms[key];
              const bindingCfg = material.sg.bindingMap[key.replace('sg_', '')];
              const isDepthTexture = uniform.type === 'texture_depth_2d';
              const isColorTexture = uniform.type === 'texture2d_f32' || uniform.type === 'texture_2d<f32>';
              if (isDepthTexture || isColorTexture) {
                if (!bindingCfg) return;
                const binding = bindingCfg.index;
                bindingLayoutEntries.push({
                  binding,
                  visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                  texture: { sampleType: isDepthTexture ? 'depth' : undefined },
                });
                if (uniform.value instanceof GPUTextureView) {
                  bindingEntries.push({ binding, resource: uniform.value });
                } else if (uniform.value) {
                  const texture = await this.createTexture(uniform.value);
                  bindingEntries.push({ binding, resource: texture.createView() });
                } else {
                  bindingEntries.push({
                    binding,
                    resource: isDepthTexture ? this.defaultDepthTextureView! : this.defaultColorTextureView!,
                  });
                }
              } else if (uniformUsed.includes(key)) {
                uniformStruct[key] = uniform.type as wgsl.Primitive;
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

        // console.log(bindingLayoutEntries);

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
        const uniformBuffer = this.createBuffer(uniformStructBuffer.buffer, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

        const vsm = device.createShaderModule({ code: material.vertexShader });
        const fsm = device.createShaderModule({ code: material.fragmentShader });
        const pipeline = await device.createRenderPipelineAsync({
          layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
          vertex: {
            module: vsm,
            entryPoint: 'main',
            // position uv normal tangent
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
              {
                arrayStride: 4 * 4,
                attributes: [{ shaderLocation: 3, offset: 0, format: 'float32x4' }],
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
      queue.writeBuffer(uniform, 0, uniformStruct.buffer, uniformStruct.buffer.byteOffset, uniformStruct.buffer.byteLength);
    }
  }

  drawMesh(node: Mesh, passEncoder: GPURenderPassEncoder) {
    this.prepareMesh(node);
    const geometry = node.geometry;
    const material = (Array.isArray(node.material) ? node.material[0] : node.material) as WebGPUMaterial;
    const gpuGeometry = geometry.userData as GPUGeometry;
    const gpuMaterial = material.userData as GPUMaterial;
    if (!material.vertexShader || !material.fragmentShader || !gpuMaterial.pipeline || !gpuGeometry.position || gpuMaterial.pipeline instanceof Promise) return;

    passEncoder.setPipeline(gpuMaterial.pipeline as GPURenderPipeline);
    passEncoder.setBindGroup(0, gpuMaterial.bindGroup);
    if (gpuGeometry.index) passEncoder.setIndexBuffer(gpuGeometry.index, 'uint16');
    passEncoder.setVertexBuffer(0, gpuGeometry.position!);
    passEncoder.setVertexBuffer(1, gpuGeometry.uv!);
    passEncoder.setVertexBuffer(2, gpuGeometry.normal!);
    passEncoder.setVertexBuffer(3, gpuGeometry.tangent!);
    if (gpuGeometry.index) {
      passEncoder.drawIndexed(geometry.index!.count);
    } else {
      passEncoder.draw(geometry.getAttribute('position').count);
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
    const opaqueList: Mesh[] = [];
    const transparentList: Mesh[] = [];
    scene.traverseVisible(node => {
      if (node instanceof Mesh) {
        if (node.material.transparent) transparentList.push(node);
        else opaqueList.push(node);
      }
    });

    const canvasColorView = targetCtx.getCurrentTexture().createView();
    const canvasDepthView = depthTexture.createView();
    const useOpaquePass = this.opaquePass.enabled;
    this.opaquePass.init();
    // 写入draw calls
    const commandEncoder = this.device.createCommandEncoder();
    let passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: useOpaquePass ? this.opaquePass.colorView! : canvasColorView,
          clearValue,
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: useOpaquePass ? this.opaquePass.depthView! : canvasDepthView,
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    const { width: w, height: h } = targetCtx.canvas;
    passEncoder.setViewport(0, 0, w, h, 0, 1);
    passEncoder.setScissorRect(0, 0, w, h);

    opaqueList.forEach(node => this.drawMesh(node, passEncoder));
    if (useOpaquePass) {
      passEncoder.end();
      passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: canvasColorView,
            clearValue,
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        depthStencilAttachment: {
          view: canvasDepthView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      });
      // render opaque mesh
      this.opaquePass.renderOpaque(passEncoder);
      transparentList.forEach(node => this.drawMesh(node, passEncoder));
      passEncoder.end();
    } else {
      transparentList.forEach(node => this.drawMesh(node, passEncoder));
      passEncoder.end();
    }

    this.queue.submit([commandEncoder.finish()]);
    this.lastSubmit = this.queue.onSubmittedWorkDone();
  }

  async dispose() {
    await this.lastSubmit;
    this.depthTextures.forEach(textrue => textrue.destroy());
    this.depthTextures.clear();
    this.device.destroy();
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

export function disposeGeometry(geometry: BufferGeometry) {
  const gpuGeometry = geometry.userData as GPUGeometry;
  gpuGeometry.index?.destroy();
  gpuGeometry.normal?.destroy();
  gpuGeometry.position?.destroy();
  gpuGeometry.tangent?.destroy();
  gpuGeometry.uv?.destroy();
}

export function disposeMaterial(material: WebGPUMaterial) {
  const gpuMaterial = material.userData as GPUMaterial;
  gpuMaterial.uniform?.destroy();
}

export function disposeTexture(texture: Texture) {
  if (texture.image) {
    if (texture.image?.src) texture.image.src = '';
    texture.image = null;
  }
  if (texture.mipmaps?.length) texture.mipmaps.length = 0;

  (texture.userData.gpuTexture as GPUTexture | undefined)?.destroy();
}
