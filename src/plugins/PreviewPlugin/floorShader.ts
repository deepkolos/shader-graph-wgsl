export const FloorShader = {
  vert: /* wgsl */ `
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

  frag: /* wgsl */ `
  struct Varying {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2f,
  }
  @fragment
  fn main() -> @location(0) vec4f {
    return vec4f(0.07, 0.2, 0.34, 1); // #123456
  }`,
};
