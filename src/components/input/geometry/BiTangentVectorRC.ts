import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete, SpaceValue, SpaceSuffixMap } from '../../../types';
import { NodeView, SelectControl } from '../../../view';
import { RC } from '../../ReteComponent';
import { TransformationMatrixRC } from '../matrix';
import { NormalRC } from './NormalRC';
import { TangentVectorRC } from './TangentVectorRC';

export type ReteBiTangentVectorNode = ExtendReteNode<
  'BiTangentVector',
  {
    outValue: number[];
    outValueType: ValueType.vec3;
    spaceValue: SpaceValue;
  }
>;

export class BiTangentVectorRC extends RC {
  static Name = 'BiTangentVector';
  constructor() {
    super(BiTangentVectorRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteBiTangentVectorNode) {
    const { data, meta } = node;
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('space', 'world', ValueType.string);
    data.exposed ??= true;
    data.preview ??= true;
    data.expanded ??= true;
    data.previewType ??= '3d';
    meta.category = 'input/geometry';
    meta.previewDisabled = false;
    meta.label = 'BiTangent Vector';
  }

  async builder(node: ReteBiTangentVectorNode) {
    this.initNode(node);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);
    node.addOutput(out).addControl(new SelectControl('space', node, 'Space', ['object', 'view', 'world', 'tangent'], false));
  }

  static initBiTangentVectorContext(compiler: ShaderGraphCompiler, space: SpaceValue) {
    if (space === 'tangent') return 'vec3(0, 1, 0)';

    const node = { name: 'BiTangent', data: {} } as any;
    const suffix = SpaceSuffixMap[space];
    const key = 'bitangent' + suffix;
    const vertVar = key;
    const normalSameSpace = NormalRC.initNormalContext(compiler, space);
    const tangentSameSpace = TangentVectorRC.initTangentVectorContext(compiler, space);
    const tangentOS = TangentVectorRC.initTangentVectorContext(compiler, 'object');
    const code = `let ${vertVar} = cross(${normalSameSpace}, ${tangentSameSpace}.xyz) * ${tangentOS}.w;`;
    compiler.setContext('vertShared', node, key, { varName: vertVar, code });
    const varyingVar = compiler.setContext('varyings', node, key, varName => `${varName}: vec3f`);
    const fragVar = compiler.setContext('fragShared', node, key, varName => `let ${varName} = normalize(${varyingVar});`);
    const defVar = compiler.setVarNameMap(node, key + '_def', vertVar, fragVar);
    compiler.setAutoVaryings(node, key, varyingVar, vertVar);
    return defVar;
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteBiTangentVectorNode>): SGNodeOutput {
    return { outputs: { out: BiTangentVectorRC.initBiTangentVectorContext(compiler, node.data.spaceValue) }, code: '' };
  }
}
