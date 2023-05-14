import { BlockView, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteCoatSmoothnessBlock = ExtendReteNode<
  'CoatSmoothnessBlock',
  {
    CoatsmoothnessValue: number;
    CoatsmoothnessValueType: ValueType.float;
  }
>;

export class CoatSmoothnessBlock extends RCBlock {
  static Name = 'CoatSmoothnessBlock';
  constructor() {
    super(CoatSmoothnessBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteCoatSmoothnessBlock) {
    const { data, meta } = node;
    node.initValueType('Coatsmoothness', 1, ValueType.float);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Coat Smoothness';
  }

  async builder(node: ReteCoatSmoothnessBlock) {
    await this.initNode(node);
    const Coatsmoothness = new Rete.Input('Coatsmoothness', node.label, Sockets.float);

    Coatsmoothness.addControl(new FloatControl('Coatsmoothness', node));
    node.addInput(Coatsmoothness);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteCoatSmoothnessBlock>): SGNodeOutput {
    const inVar = compiler.getInputVarConverted(node, 'Coatsmoothness');
    return { outputs: {}, code: inVar ? `coatSmoothness = ${inVar};` : '' };
  }
}
