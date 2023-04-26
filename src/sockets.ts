import { Rete } from './types';

const float = new Rete.Socket('Float value');
const vec2 = new Rete.Socket('Vec2 value');
const vec3 = new Rete.Socket('Vec3 value');
const vec4 = new Rete.Socket('Vec4 value');
const mat4 = new Rete.Socket('Mat4 value');
const mat3 = new Rete.Socket('Mat3 value');
const mat2 = new Rete.Socket('Mat2 value');
const dynamicVector = new Rete.Socket('Dynamic Vector value');
const dynamicVecMat = new Rete.Socket('Dynamic Vector Matrix value');
const vertex = new Rete.Socket('Vertex value');
const texture2d = new Rete.Socket('Texture2D value');
const sampler = new Rete.Socket('Sampler value');
const gradient = new Rete.Socket('Gradient value');
const string = new Rete.Socket('String value');
const bool = new Rete.Socket('Bool value');
const any = new Rete.Socket('Any value');

// prettier-ignore
export const Sockets = Object.freeze({ float, vec2, vec3, vec4, vertex, any, texture2d, dynamicVector, mat4, mat3, mat2, dynamicVecMat, sampler, gradient, string, bool } as const);

Object.values(Sockets).forEach(socket => {
  if (any !== socket) {
    any.combineWith(socket);
    socket.combineWith(any);
  }
});

[float, vec2, vec3, vec4].forEach((a, i, arr) => {
  arr.forEach(b => {
    if (a !== b) a.combineWith(b);
  });
  dynamicVector.combineWith(a);
  a.combineWith(dynamicVector);
  dynamicVecMat.combineWith(a);
  a.combineWith(dynamicVecMat);

  [mat2, mat3, mat4].forEach(mat => {
    mat.combineWith(a); // 单向兼容 mat -> vec
  });
});

[mat2, mat3, mat4, dynamicVector].forEach(a => {
  dynamicVecMat.combineWith(a);
  a.combineWith(dynamicVecMat);
});
