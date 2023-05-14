import { LabelControl, BlockView } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteTangentBlock = ExtendReteNode<
  'TangentBlock',
  {
    tangentValue: number[];
    tangentValueType: ValueType.vec3;
  }
>;

export class TangentBlock extends RCBlock {
  static Name = 'TangentBlock';
  constructor() {
    super(TangentBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteTangentBlock) {
    const { data, meta } = node;
    node.initValueType('tangent', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Tangent';
  }

  async builder(node: ReteTangentBlock) {
    await this.initNode(node);
    const tangent = new Rete.Input('tangent', node.label, Sockets.vec3);

    tangent.addControl(new LabelControl('tangent', node, 'Object Space'));
    node.addInput(tangent);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteTangentBlock>): SGNodeOutput {
    const inVar = compiler.getInputVarConverted(node, 'tangent', false);
    return { outputs: {}, code: inVar ? `tangentOS = ${inVar};` : '' };
  }
}
