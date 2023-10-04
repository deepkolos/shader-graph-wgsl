import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete, SpaceValue, SpaceSuffixMap } from '../../../types';
import { NodeView, SelectControl } from '../../../view';
import { RC } from '../../ReteComponent';
import { TransformationMatrixRC } from '../matrix/TransformationMatrixRC';
import { NormalRC } from './NormalRC';

export type ReteTangentVectorNode = ExtendReteNode<
  'TangentVector',
  {
    outValue: number[];
    outValueType: ValueType.vec3;
    spaceValue: SpaceValue;
  }
>;

export class TangentVectorRC extends RC {
  static Name = 'TangentVector';
  constructor() {
    super(TangentVectorRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteTangentVectorNode) {
    const { data, meta } = node;
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('space', 'world', ValueType.string);
    data.exposed ??= true;
    data.preview ??= true;
    data.expanded ??= true;
    data.previewType ??= '3d';
    meta.category = 'input/geometry';
    meta.previewDisabled = false;
    meta.label = 'Tangent Vector';
  }

  async builder(node: ReteTangentVectorNode) {
    this.initNode(node);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);
    node.addOutput(out).addControl(new SelectControl('space', node, 'Space', ['object', 'view', 'world', 'tangent'], false));
  }

  static initTangentVectorContext(compiler: ShaderGraphCompiler, space: SpaceValue) {
    if (space === 'tangent') return 'vec3(1, 0, 0)';

    const node = { name: 'Tangent', data: {} } as any;
    const suffix = SpaceSuffixMap[space];
    const key = 'tangent' + suffix;
    let vertVar = key;
    const Mat = (type: Parameters<typeof TransformationMatrixRC.initMatrixContext>['1']) =>
      TransformationMatrixRC.initMatrixContext(compiler, type);
    if (space === 'object') {
      vertVar = '(*tangentOS)';
      compiler.setContext('attributes', node, key, {
        varName: 'tangentOS',
        code: ``,
      });
      const varyingVar = compiler.setContext('varyings', node, key, varName => `${varName}: vec4f`);
      const fragVar = compiler.setContext('fragShared', node, key, varName => `let ${varName} = normalize(${varyingVar}.xyz);`);
      const defVar = compiler.setVarNameMap(node, key + '_def', vertVar, fragVar);
      compiler.setAutoVaryings(node, key, varyingVar, vertVar);
      return defVar;
    } else {
      let code: string;
      const tangentOS = TangentVectorRC.initTangentVectorContext(compiler, 'object');
      const matrix = Mat(space === 'view' ? 'ModelView' : 'Model');
      code = `let ${vertVar} = mat3x3f(${matrix}[0].xyz, ${matrix}[1].xyz, ${matrix}[2].xyz) * ${tangentOS}.xyz;`;
      compiler.setContext('vertShared', node, key, { varName: vertVar, code });
      const varyingVar = compiler.setContext('varyings', node, key, varName => `${varName}: vec3f`);
      const fragVar = compiler.setContext('fragShared', node, key, varName => `let ${varName} = normalize(${varyingVar});`);
      const defVar = compiler.setVarNameMap(node, key + '_def', vertVar, fragVar);
      compiler.setAutoVaryings(node, key, varyingVar, vertVar);
      return defVar;
    }
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteTangentVectorNode>): SGNodeOutput {
    return { outputs: { out: TangentVectorRC.initTangentVectorContext(compiler, node.data.spaceValue) }, code: '' };
  }
}
