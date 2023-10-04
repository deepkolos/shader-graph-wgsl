export const UnlitSGTemplate = Object.freeze({
  vert: (body: string) => /* wgsl */ `fn sg_vert(
  positionOS: ptr<function, vec3<f32>>, 
  normalOS: ptr<function, vec3<f32>>, 
  tangentOS: ptr<function, vec4<f32>>,
  v: ptr<function, Varying>,
  uv: vec2<f32>
) {
${body}
}`,
  frag: (body: string) => /* wgsl */ `fn sg_frag(
  baseColor: ptr<function, vec3<f32>>, 
  alpha: ptr<function, f32>,
  v: Varying
) {
${body}
}`,
} as const);

export const UnlitMaterialTemplate = {
  vert: (sgCode: string) => /* wgsl */ `${sgCode}

@group(0) @binding(0) var<uniform> u: Uniform;

@vertex
fn main(
  @location(0) position: vec3<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) normal: vec3<f32>,
  @location(3) tangent: vec4<f32>,
) -> Varying {
  var v: Varying;
  var sg_position = vec3<f32>(position);
  var sg_normal = vec3<f32>(normal);
  var sg_tangent = tangent;
  sg_vert(&sg_position, &sg_normal, &sg_tangent, &v, uv);

  v.position = u.sg_Matrix_Proj * u.sg_Matrix_ModelView * vec4<f32>(sg_position, 1.0);

  return v;
}`,

  frag: (sgCode: string) => /* wgsl */ `${sgCode}

@group(0) @binding(0) var<uniform> u: Uniform;

@fragment
fn main(v: Varying) -> @location(0) vec4<f32> {
  var sg_baseColor = vec3<f32>();
  var sg_alpha = 1.0;
  sg_frag(&sg_baseColor, &sg_alpha, v);

  return vec4<f32>(sg_baseColor, sg_alpha);
  // return vec4<f32>(0.0, 1.0, 0.0, 1.0);
}`,
};
