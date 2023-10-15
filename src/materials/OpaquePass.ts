import { Matrix, Mesh, OrthographicCamera, PlaneGeometry, RawShaderMaterial } from 'three';
import { WebGPURenderer, disposeGeometry, disposeMaterial } from './WebGPURenderer';
import { OpaqueShader } from './OpaqueShader';
import { WebGPUMaterial } from './WebGPUMaterial';

/**
 * WebGPURenderer的子Pass
 * @internal
 */
export class OpaquePass {
  public enabled = false;
  public color?: GPUTexture;
  public depth?: GPUTexture;
  public colorView?: GPUTextureView;
  public depthView?: GPUTextureView;
  private _quad?: Mesh<PlaneGeometry, WebGPUMaterial>;
  private _camera?: OrthographicCamera;
  private _renderer: WebGPURenderer;

  constructor(renderer: WebGPURenderer) {
    this._renderer = renderer;
  }

  init(): void {
    if (!this.enabled) return;

    if (!this._quad) {
      this._quad = new Mesh(new PlaneGeometry(2, 2), new WebGPUMaterial());
      const material = this._quad.material;
      // @ts-ignore
      material.uniforms = OpaqueShader.uniforms;
      material.vertexShader = OpaqueShader.vertexShader;
      material.fragmentShader = OpaqueShader.fragmentShader;
      material.depthTest = false;
      material.depthWrite = true;
      material.sg.bindingMap = {
        defaultSampler: { index: 1, name: 'defaultSampler', type: 'sampler' },
        colorTexture: { index: 2, name: 'colorTexture', type: 'texture_2d<f32>' },
        depthTexture: { index: 3, name: 'depthTexture', type: 'texture_depth_2d' },
      };
      material.sg.uniformMap = {
        modelViewMatrix: { name: 'modelViewMatrix', type: 'mat4x4<f32>' },
        projectionMatrix: { name: 'projectionMatrix', type: 'mat4x4<f32>' },
      };
      material.sg.resource = {
        sampler: {
          defaultSampler: { filter: 'point', warp: 'clamp' },
        },
        texture: {},
      };
      this._camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1000);
      this._camera.updateMatrixWorld(true);
    }
    let [, , w, h] = this._renderer.viewport;
    if (!this.color || this.color.width !== w || this.color.height !== h) {
      w = w < 1 ? 200 : w;
      h = h < 1 ? 200 : h;
      this.color?.destroy();
      this.depth?.destroy();
      this.color = this._renderer.device.createTexture({
        size: [w, h, 1],
        format: this._renderer.canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      this.depth = this._renderer.device.createTexture({
        size: [w, h, 1],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      this.colorView = this.color.createView();
      this.depthView = this.depth.createView();
      const material = this._quad.material;
      material.uniforms.colorTexture.value = this.colorView;
      material.uniforms.depthTexture.value = this.depthView;
      material.uniforms.projectionMatrix.value = this._camera!.projectionMatrix;
    }
  }

  renderOpaque(passEncoder: GPURenderPassEncoder): void {
    if (!this.enabled) return;
    const quad = this._quad!;
    this._renderer.prepareMesh(quad);
    const modelViewMatrix = quad.material.uniforms.modelViewMatrix.value as Matrix;
    modelViewMatrix.copy(this._camera!.matrixWorldInverse);
    this._renderer.drawMesh(quad, passEncoder);
  }

  dispose(): void {
    this.enabled = false;
    if (this._quad) {
      disposeMaterial(this._quad.material as any);
      disposeGeometry(this._quad.geometry);
      delete this._quad;
    }
  }
}
