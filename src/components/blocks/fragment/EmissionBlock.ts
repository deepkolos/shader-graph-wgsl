import { BlockView, ColorControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteEmissionBlock = ExtendReteNode<
  'EmissionBlock',
  {
    emissionValue: number[];
    emissionValueType: ValueType.vec3;
  }
>;

export class EmissionBlock extends RCBlock {
  static Name = 'EmissionBlock';
  constructor() {
    super(EmissionBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteEmissionBlock) {
    const { data, meta } = node;
    node.initValueType('emission', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Emission';
  }

  async builder(node: ReteEmissionBlock) {
    await this.initNode(node);
    const emission = new Rete.Input('emission', node.label, Sockets.vec3);

    emission.addControl(new ColorControl('emission', node));
    node.addInput(emission);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteEmissionBlock>): SGNodeOutput {
    const inVar = compiler.getInputVarCoverted(node, 'emission');
    return { outputs: {}, code: inVar ? `emission = ${inVar};` : '' };
  }
}
