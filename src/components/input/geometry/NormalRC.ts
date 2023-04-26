import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete, SpaceValue, SpaceSuffixMap } from '../../../types';
import { NodeView, SelectControl } from '../../../view';
import { RC } from '../../ReteComponent';
import { TransformationMatrixRC } from '../matrix';

export type ReteNormalNode = ExtendReteNode<
  'Normal',
  {
    outValue: number[];
    outValueType: ValueType.vec3;
    spaceValue: SpaceValue;
  }
>;

export class NormalRC extends RC {
  static Name = 'Normal';
  constructor() {
    super(NormalRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteNormalNode) {
    const { data, meta } = node;
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('space', 'world');
    data.exposed ??= true;
    data.expanded ??= true;
    data.previewType ??= '3d';
    meta.category = 'input/geometry';
    meta.previewDisabled = false;
  }

  async builder(node: ReteNormalNode) {
    this.initNode(node);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);
    node
      .addOutput(out)
      .addControl(
        new SelectControl('space', node, 'Space', ['object', 'view', 'world', 'tangent'], false),
      );
  }

  static initNormalContext(compiler: ShaderGraphCompiler, space: SpaceValue) {
    const node = { name: NormalRC.Name, data: {} } as any;
    const suffix = SpaceSuffixMap[space];
    const key = 'normal' + suffix;
    const vertVar = key;

    if (space !== 'object') {
      let code = '';
      if (space === 'world') {
        const IT_ModelVar = TransformationMatrixRC.initMatrixContext(compiler, 'IT_Model');
        code = `let ${vertVar} = mat3x3<f32>(${IT_ModelVar}[0].xyz, ${IT_ModelVar}[1].xyz, ${IT_ModelVar}[2].xyz) * (*normalOS);`;
      } else if (space === 'view') {
        const IT_ModelViewVar = TransformationMatrixRC.initMatrixContext(compiler, 'IT_ModelView');
        code = `let ${vertVar} = mat3x3<f32>(${IT_ModelViewVar}[0].xyz, ${IT_ModelViewVar}[1].xyz, ${IT_ModelViewVar}[2].xyz) * (*normalOS);`;
      } else {
        code = `let ${vertVar} = vec3<f32>(0);`; // TODO
      }
      compiler.setContext('vertShared', node, key, { varName: vertVar, code });
    }
    const varyingVar = compiler.setContext(
      'varyings',
      node,
      key,
      varName => `${varName}: vec3<f32>`,
    );
    const fragVar = compiler.setContext(
      'fragShared',
      node,
      key,
      varName => `let ${varName} = normalize(${varyingVar});`,
    );
    const defVar = compiler.setVarNameMap(node, key + '_def', vertVar, fragVar);
    compiler.setAutoVaryings(node, key, varyingVar, vertVar);
    return defVar;
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteNormalNode>): SGNodeOutput {
    return {
      outputs: { out: NormalRC.initNormalContext(compiler, node.data.spaceValue) },
      code: '',
    };
  }
}
