import { BiTangentVectorRC, NormalRC, TangentVectorRC } from '../components';
import { ShaderGraphCompiler } from './ShaderGraphCompiler';

export const initRandContext = (compiler: ShaderGraphCompiler) => {
  const node = { name: 'Rand', data: {} } as any;
  const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(seed: vec2<f32>) -> f32 {
return fract(sin(dot(seed, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}`;
  return compiler.setContext('defines', node, 'fn', codeFn);
};

export const initTBNContext = (compiler: ShaderGraphCompiler, space: 'world' = 'world') => {
  const node = { name: 'TBNMat3', data: {} } as any;

  if (space === 'world') {
    const bitangentWS = BiTangentVectorRC.initBiTangentVectorContext(compiler, 'world');
    const tangentWS = TangentVectorRC.initTangentVectorContext(compiler, 'world');
    const normalWS = NormalRC.initNormalContext(compiler, 'world');
    // 原见TransformWorldToTangent
    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(tangentToWorld: mat3x3f, matTBN_I_T: ptr<function, mat3x3f>, sgn: ptr<function, f32>) {
  let tangentToWorld_T = transpose(tangentToWorld);
  let row0 = tangentToWorld_T[0];
  let row1 = tangentToWorld_T[1];
  let row2 = tangentToWorld_T[2];
  let col0 = cross(row1, row2);
  let col1 = cross(row2, row0);
  let col2 = cross(row0, row1);
  let determinant = dot(row0, col0);
  *sgn = -step(determinant, 0) * 2.0 + 1.0; // determinant<0.0 ? (-1.0) : 1.0;
  *matTBN_I_T = transpose(mat3x3f(col0, col1, col2));
}`;

    const fnVar = compiler.setContext('defines', node, 'get_TBN_IT_sgn', codeFn);
    const TangentToWorldFn = (varName: string) =>
      /* wgsl */ `let ${varName} = transpose(mat3x3f(${tangentWS}, ${bitangentWS}, ${normalWS}));`;
    const TBN_TangentToWorld_ITFn = (varName: string) =>
      /* wgsl */ `var ${varName}: mat3x3f; var ${varName}_sgn: f32; ${fnVar}(transpose(mat3x3f(${tangentWS}, ${bitangentWS}, ${normalWS})), &${varName}, &${varName}_sgn);`;
    const vert_TBN_TangentToWorld = compiler.setContext('vertShared', node, 'TangentToWorld', TangentToWorldFn);
    const vert_TBN_TangentToWorld_IT = compiler.setContext('vertShared', node, 'TBN_TangentToWorld_IT', TBN_TangentToWorld_ITFn);
    const vert_TBN_TangentToWorld_sgn = vert_TBN_TangentToWorld_IT + '_sgn';
    const frag_TBN_TangentToWorld = compiler.setContext('fragShared', node, 'TangentToWorld', TangentToWorldFn);
    const frag_TBN_TangentToWorld_IT = compiler.setContext('fragShared', node, 'TBN_TangentToWorld_IT', TBN_TangentToWorld_ITFn);
    const frag_TBN_TangentToWorld_sgn = frag_TBN_TangentToWorld_IT + '_sgn';
    const def_TBN_TangentToWorld = compiler.setVarNameMap(node, 'TBN_TangentToWorld_def', vert_TBN_TangentToWorld, frag_TBN_TangentToWorld);
    const def_TBN_TangentToWorld_IT = compiler.setVarNameMap(
      node,
      'TBN_TangentToWorld_IT_def',
      vert_TBN_TangentToWorld_IT,
      frag_TBN_TangentToWorld_IT,
    );
    const def_TBN_TangentToWorld_IT_sgn = compiler.setVarNameMap(
      node,
      'TBN_TangentToWorld_sgn_def',
      vert_TBN_TangentToWorld_sgn,
      frag_TBN_TangentToWorld_sgn,
    );
    return {
      TBN: def_TBN_TangentToWorld,
      TBN_IT: def_TBN_TangentToWorld_IT,
      TBN_IT_sgn: def_TBN_TangentToWorld_IT_sgn,
    };
  }
};
