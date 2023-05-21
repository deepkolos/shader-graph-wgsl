import {
  BitmapTexture2D,
  BlendMode,
  Engine3D,
  MaterialBase,
  Matrix4,
  ShaderLib,
  Texture,
  Vector2,
  Vector3,
  Vector4,
} from '@orillusion/core/src';
import { SGCompilation, UniformMap, BindingMap, Resource } from '../compilers';
import { MaterialTemplates } from '../templates';
import { AssetValue } from '../types';
import { ResourceAdapter } from './ResourceAdapter';

interface TemplateStore {
  [template: string]: {
    frag?: (code: string) => string;
    vert?: (code: string) => string;
  };
}

type ISetting = SGCompilation['setting'];

const SideMap: { [k in ISetting['renderFace']]: GPUCullMode } = {
  back: 'back',
  both: 'none',
  front: 'front',
};

const DepthModesMap: { [k in ISetting['depthTest']]: GPUCompareFunction } = {
  always: 'always',
  equal: 'equal',
  'g equal': 'greater-equal',
  'l equal': 'less-equal',
  less: 'less',
  greater: 'greater',
  never: 'never',
  'not equal': 'not-equal',
};

type SetParams = {
  Parameter: { [k: string]: any };
  Time: {
    time: number;
    sinTime: number;
    cosTime: number;
    deltaTime: number;
    smoothDelta: number;
  };
  ViewVector: {
    cameraWS: Vector3;
  };
  // TexelSize: { [k: string]: Vector2 };
  Texture2D: { [k: string]: Texture | undefined };
  Matrix: {
    [k in
      | 'Model'
      | 'View'
      | 'Proj'
      | 'ViewProj'
      | 'ModelView'
      | 'I_Model'
      | 'I_View'
      | 'I_Proj'
      | 'I_ViewProj'
      | 'I_ModelView'
      | 'IT_Model'
      | 'IT_ModelView']: Matrix4;
  };
};

export class OrillusionSGController {
  time = 0;
  allowMaterialOverride = true;
  castShadows: boolean = false;
  uniformMap: UniformMap = {};
  bindingMap: BindingMap = {};
  resource!: Resource;

  constructor(public material: OrillusionSGMaterial) {}

  async init(compilation: SGCompilation, Templates: TemplateStore = MaterialTemplates) {
    const { material } = this;
    let vertCode = Templates[compilation.setting?.template || 'unlit']?.vert?.(
      compilation.vertCode,
    );
    let fragCode = Templates[compilation.setting?.template || 'unlit']?.frag?.(
      compilation.fragCode,
    );
    if (!vertCode || !fragCode) return;
    // replace uniform
    vertCode = this.adaptCode(vertCode);
    fragCode = this.adaptCode(fragCode);
    // console.log(vertCode, fragCode);
    ShaderLib.register(vertCode, vertCode);
    ShaderLib.register(fragCode, fragCode);
    const shader = material.setShader(vertCode, fragCode);
    shader.setShaderEntry('main', 'main');

    this.uniformMap = compilation.uniformMap;
    this.bindingMap = compilation.bindingMap;
    this.resource = compilation.resource;

    const uniformPromises = Object.keys(compilation.uniformMap).map(async contextKey => {
      const [nodeName, name] = contextKey.split('_');
      let value = undefined;
      const parameter = compilation.parameters.find(i => i.name === name);
      if (nodeName === 'Parameter') value = parameter?.defalutValue;
      else if (nodeName === 'Time') value = 0;
      // else if (nodeName === 'TransformationMatrix') value = new Matrix4();

      const unifromKey = compilation.uniformMap[contextKey];
      this.setUniform(unifromKey.type, unifromKey.name, value);

      if (parameter && parameter.type === 'texture2d') {
        await this.setTexture(contextKey, parameter.defalutValue);
      }
    });

    // init resource
    const resourcePromises = Object.keys(compilation.resource.texture).map(async contextKey => {
      const asset = compilation.resource.texture[contextKey];
      await this.setTexture(contextKey, asset);
    });

    await Promise.all([...resourcePromises, ...uniformPromises]);

    this.set('Matrix', 'IT_Model', []);
    this.set('Matrix', 'IT_ModelView', []);
    this.set('Matrix', 'I_Model', []);
    this.set('Matrix', 'Model', []);
    this.set('Matrix', 'ModelView', []);
    this.set('Matrix', 'Proj', []);
    this.set('ViewVector', 'cameraWS', []);

    // 设置渲染参数
    const setting = compilation.setting;
    // material.precision = setting.precision === 'single' ? 'highp' : 'mediump';
    // material.depthWrite = setting.depthWrite !== 'disable';
    material.transparent = setting.surfaceType === 'transparent';
    material.blendMode = setting.surfaceType === 'transparent' ? BlendMode.NORMAL : BlendMode.ALPHA;
    material.doubleSide = setting.renderFace === 'both';
    material.cullMode = SideMap[setting.renderFace];
    material.depthCompare = DepthModesMap[setting.depthTest];

    // TODO
    this.allowMaterialOverride = setting.allowMaterialOverride;
    this.castShadows = setting.castShadows;
  }

  adaptCode(code: string) {
    code = code.replace(
      `@group(0) @binding(0) var<uniform> u: Uniform;`,
      `@group(2) @binding(0) var<uniform> materialUniform: MaterialUniform;`,
    );
    code = code.replaceAll('u.', 'materialUniform.');
    code = code.replaceAll('(*u).', '(*materialUniform).');
    code = code.replace(`struct Uniform {`, `struct MaterialUniform {`);
    code = code.replaceAll('@group(0)', '@group(1)');
    let patch = '';
    if (code.indexOf('@group(1)') === -1) {
      patch = `@group(1) @binding(auto) var baseMap: texture_2d<f32>;`;
    }
    code = code.replace(`  @location(0) position: vec3<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) normal: vec3<f32>,
`,
  `  @builtin(instance_index) index : u32,
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) TEXCOORD_1: vec2<f32>,
`
  )
    code = `
#include "Common_vert"
#include "Common_frag"
#include "UnLit_frag"

fn vert(vertex: VertexAttributes) {}
fn frag() {}
${patch}
${code}`;
    return code;
  }

  setUniform(type: string, name: string, value: any) {
    const shader = this.material.getShader();
    if (type === 'f32') {
      shader.setUniformFloat(name, value);
    } else if (type === 'vec2<f32>') {
      shader.setUniformVector2(name, new Vector2(...value));
    } else if (type === 'vec3<f32>') {
      shader.setUniformVector3(name, new Vector3(...value));
    } else if (type === 'vec4<f32>') {
      shader.setUniformVector4(name, new Vector4(...value));
    } else if (type === 'mat4x4<f32>') {
      const f32Arr = new Float32Array(16);
      value && f32Arr.set(value);
      shader.setUniformArray(name, f32Arr);
    }
  }

  async setTexture(name: string, asset: AssetValue) {
    const shader = this.material.getShader();
    const url = ResourceAdapter(asset);
    if (url) {
      const texture = new BitmapTexture2D();
      await texture.load(url);
      shader.setTexture(name, texture);
    } else shader.setTexture(name, Engine3D.res.whiteTexture);
  }

  has<NodeName extends keyof SetParams, Name extends keyof SetParams[NodeName]>(
    nodeName: NodeName,
    name: Name,
  ) {
    this.material.getShader().uniforms[`${nodeName}_${name as string}`] === undefined;
  }

  set<NodeName extends keyof SetParams, Name extends keyof SetParams[NodeName]>(
    nodeName: NodeName,
    name: Name,
    value: SetParams[NodeName][Name],
  ): void {
    const { uniformMap } = this;
    const contextKey = `${nodeName}_${name as string}`;
    const uniformKey = uniformMap[contextKey];
    if (uniformKey) {
      this.setUniform(uniformKey.type, uniformKey.name, value);
    }
  }

  /**
   * API 待定
   * @param deltaTime 时间单位(秒)
   */
  update(deltaTime: number) {
    this.time += deltaTime;
    this.set('Time', 'time', this.time);
    this.set('Time', 'sinTime', Math.sin(this.time));
    this.set('Time', 'cosTime', Math.cos(this.time));
    this.set('Time', 'deltaTime', deltaTime);
    this.set('Time', 'smoothDelta', deltaTime);
  }
}

export class OrillusionSGMaterial extends MaterialBase {
  sg: OrillusionSGController;
  constructor() {
    super();
    this.sg = new OrillusionSGController(this);
  }
}
