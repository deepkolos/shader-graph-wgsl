import { ColorControl, BlockView } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteBaseColorBlock = ExtendReteNode<
  'BaseColorBlock',
  {
    baseColorValue: number[];
    baseColorValueType: ValueType.vec3;
  }
>;

export class BaseColorBlock extends RCBlock {
  static Name = 'BaseColorBlock';
  constructor() {
    super(BaseColorBlock.Name);
    this.data.component = BlockView;
  }

  async initNode(node: ReteBaseColorBlock) {
    const { data, meta } = node;
    node.initValueType('baseColor', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.label = 'Base Color';
  }

  async builder(node: ReteBaseColorBlock) {
    await this.initNode(node);
    const baseColor = new Rete.Input('baseColor', node.label, Sockets.vec3);

    baseColor.addControl(new ColorControl('baseColor', node));
    node.addInput(baseColor);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteBaseColorBlock>): SGNodeOutput {
    const inVar = compiler.getInputVarCoverted(node, 'baseColor');
    return { outputs: {}, code: inVar ? `*baseColor = ${inVar};` : '' };
  }
}
