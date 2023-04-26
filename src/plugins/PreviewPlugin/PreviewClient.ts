import { MathUtils, PerspectiveCamera, RawShaderMaterial } from 'three';
import { ReteNode } from '../../types';
import { MaterialTemplates } from '../../templates';
import { SGCompilation } from '../../compilers';
import { WebGPUMaterial } from '../../materials';

export class PreviewClient {
  enable: boolean = false;
  type: '2d' | '3d' = '2d';
  ctx: GPUCanvasContext;
  material = new WebGPUMaterial();

  constructor(
    public canvas: HTMLCanvasElement & { clientWidth_cache?: number; clientHeight_cache?: number },
    public node?: ReteNode,
  ) {
    this.ctx = canvas.getContext('webgpu')!;
  }

  set(enable?: boolean, type?: '2d' | '3d') {
    this.enable = enable ?? this.enable;
    this.type = type ?? this.type;
  }

  updateMaterial(compliation: SGCompilation, mainMaterial: RawShaderMaterial) {
    const { material } = this;
    material.vertexShader = MaterialTemplates.unlit.vert(compliation.vertCode);
    material.fragmentShader = MaterialTemplates.unlit.frag(compliation.fragCode);
    material.uniforms = mainMaterial.uniforms;
    material.sg.resource = compliation.resource;
    material.sg.uniformMap = compliation.uniformMap;
    material.sg.bindingMap = compliation.bindingMap;
    material.needsUpdate = true;
  }

  updateCamera(camera3D: PerspectiveCamera) {
    if (this.type === '3d') {
      const { width, height } = getClientSize(this.canvas);
      camera3D.aspect = width / height;
      camera3D.updateProjectionMatrix();
    }
  }

  dispose() {
    this.material.dispose();
  }
}

export function getClientSize(
  canvas: HTMLCanvasElement & {
    clientWidth_cache?: number;
    clientHeight_cache?: number;
    cacheNeedsUpdate?: boolean;
  },
) {
  if (!canvas.clientWidth_cache || canvas.cacheNeedsUpdate) {
    // TODO cache update
    canvas.clientWidth_cache = canvas.clientWidth;
    canvas.clientHeight_cache = canvas.clientHeight;
    canvas.cacheNeedsUpdate = false;
  }
  return { width: canvas.clientWidth_cache!, height: canvas.clientHeight_cache! };
}
