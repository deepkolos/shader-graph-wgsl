import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete, SpaceValue, SpaceSuffixMap } from '../../../types';
import { NodeView, SelectControl } from '../../../view';
import { RC } from '../../ReteComponent';
import { TransformationMatrixRC } from '../matrix';

export type RetePositionNode = ExtendReteNode<
  'Position',
  {
    outValue: number[];
    outValueType: ValueType.vec3;
    spaceValue: SpaceValue;
  }
>;

export class PositionRC extends RC {
  static Name = 'Position';
  constructor() {
    super(PositionRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: RetePositionNode) {
    const { data, meta } = node;
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('space', 'world', ValueType.string);
    data.exposed ??= true;
    data.expanded ??= true;
    data.previewType ??= '3d';
    meta.category = 'input/geometry';
    meta.previewDisabled = false;
  }

  async builder(node: RetePositionNode) {
    this.initNode(node);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);
    node
      .addOutput(out)
      .addControl(
        new SelectControl('space', node, 'Space', ['object', 'view', 'world', 'tangent'], false),
      );
  }

  static initPositionContext(compiler: ShaderGraphCompiler, space: SpaceValue) {
    const node = { name: PositionRC.Name, data: {} } as any;
    const suffix = SpaceSuffixMap[space];
    const key = 'position' + suffix;
    let vertVar = key;

    if (space !== 'object') {
      let code = '';
      if (space === 'world') {
        const ModelVar = TransformationMatrixRC.initMatrixContext(compiler, 'Model');
        code = `let ${vertVar} = (${ModelVar} * vec4<f32>(*positionOS, 1.0)).xyz;`;
      } else if (space === 'view') {
        const ModelViewVar = TransformationMatrixRC.initMatrixContext(compiler, 'ModelView');
        code = `let ${vertVar} = (${ModelViewVar} * vec4<f32>(*positionOS, 1.0)).xyz;`;
      } else {
        code = `let ${vertVar} = vec3<f32>(0);`; // TODO
      }
      compiler.setContext('vertShared', node, key, { varName: vertVar, code });
    } else {
      vertVar = '*' + vertVar;
    }

    const varyingVar = compiler.setContext(
      'varyings',
      node,
      key,
      varName => `${varName}: vec3<f32>`,
    );
    const defVar = compiler.setVarNameMap(node, key + '_def', vertVar, varyingVar);
    compiler.setAutoVaryings(node, key, varyingVar, vertVar);
    return defVar;
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<RetePositionNode>): SGNodeOutput {
    return {
      outputs: { out: PositionRC.initPositionContext(compiler, node.data.spaceValue) },
      code: '',
    };
  }
}
