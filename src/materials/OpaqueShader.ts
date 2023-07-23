import { Matrix4 } from 'three';

const OpaqueShader = {
  uniforms: {
    modelViewMatrix: { value: new Matrix4(), type: 'mat4x4_f32' },
    projectionMatrix: { value: new Matrix4(), type: 'mat4x4_f32' },
    colorTexture: { value: null, type: 'texture2d_f32' },
    depthTexture: { value: null, type: 'texture_depth_2d' },
  },

  vertexShader: /* wgsl */ `
struct Uniform {
  modelViewMatrix: mat4x4f,
  projectionMatrix: mat4x4f,
};
struct Varying {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2f,
}

@group(0) @binding(0) var<uniform> u: Uniform;

@vertex
fn main(
  @location(0) position: vec3<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) normal: vec3<f32>,
) -> Varying {
  var v: Varying;
  v.uv = uv;
  v.position = u.projectionMatrix * u.modelViewMatrix * vec4( position, 1.0 );
  return v;
}`,

  fragmentShader: /* wgsl */ `
@group(0) @binding(1) var defaultSampler: sampler;
@group(0) @binding(2) var colorTexture: texture_2d<f32>;
@group(0) @binding(3) var depthTexture: texture_depth_2d;

struct Varying {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2f,
}

struct FsOut {
  @builtin(frag_depth) depth: f32,
  @location(0) color: vec4<f32>
}

@fragment
fn main(v: Varying) -> FsOut {
  var o: FsOut;
  o.color = textureSample( colorTexture, defaultSampler, v.uv );
  o.depth = textureSample( depthTexture, defaultSampler, v.uv );
  return o;
}`,
};

export { OpaqueShader };
