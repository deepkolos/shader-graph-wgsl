import { ShaderGraphCompiler } from './ShaderGraphCompiler';

export const initRandContext = (compiler: ShaderGraphCompiler) => {
  const node = { name: 'Rand', data: {} } as any;
  const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(seed: vec2<f32>) -> f32 {
return fract(sin(dot(seed, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}`;
  return compiler.setContext('defineFns', node, 'fn', codeFn);
};
