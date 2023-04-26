import { RawShaderMaterial } from 'three';
import { SGController } from './SGController';

export class WebGPUMaterial extends RawShaderMaterial {
  sg: SGController;

  constructor() {
    super();
    this.sg = new SGController(this);
    this.vertexShader = '';
    this.fragmentShader = '';
  }
}
