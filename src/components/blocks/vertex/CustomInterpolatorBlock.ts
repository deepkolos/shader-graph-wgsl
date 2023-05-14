import { BlockView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { Rete, ValueType, ExtendReteNode } from '../../../types';
import { RCBlock } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteCustomInterpolatorBlock = ExtendReteNode<
  'CustomInterpolatorBlock',
  {
    varyingValue: number[];
    varyingValueType: ValueType.vec3;
    varyingValueName: string;
  }
>;

const nodeCfgs: ReteCustomInterpolatorBlock['meta']['nodeCfgs'] = /*@__PURE__*/ {
  Name: {
    dataKey: 'varyingValueName',
    onChange(node: ReteCustomInterpolatorBlock, value: string, editor: Rete.NodeEditor): boolean {
      if (!node.contextNode || !value) return false;
      const doChange = node.contextNode.blocks
        .filter(block => block.name === CustomInterpolatorBlock.Name)
        .every(block => block.getValueName('varying') !== value);

      doChange &&
        editor.trigger('varyingchange', {
          name: node.getValueName('varying'),
          outValueName: value,
        });
      return doChange;
    },
  },
};

export class CustomInterpolatorBlock extends RCBlock {
  static Name = 'CustomInterpolatorBlock';
  constructor() {
    super(CustomInterpolatorBlock.Name); // 避免使用constructor name因为编译会改名
    this.data.component = BlockView;
  }

  async initNode(node: ReteCustomInterpolatorBlock) {
    const { data, meta } = node;
    node.initValueType('varying', [0, 0, 0, 0], ValueType.vec4, 'CustomInterpolator');
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = false;
    meta.previewDisabled = true;
    meta.nodeCfgs = nodeCfgs;
    meta.label = 'CustomInterpolator';
  }

  async builder(node: ReteCustomInterpolatorBlock) {
    await this.initNode(node);
    const varying = new Rete.Input('varying', node.label, Sockets.vec4);

    varying.addControl(new DynamicControl('varying', node));
    node.addInput(varying);
  }

  onAddToContextNode(contextNode: Rete.Node, blockNode: Rete.Node) {
    const nextIndex = contextNode.blocks.filter(
      i => i.name === CustomInterpolatorBlock.Name,
    ).length;
    blockNode.setValueName('varying', `CustomInterpolator${nextIndex}`);
    contextNode.addBlock(blockNode);
  }

  compileSG(
    compiler: ShaderGraphCompiler,
    node: SGNodeData<ReteCustomInterpolatorBlock>,
  ): SGNodeOutput {
    const varyingVar = compiler.setContext(
      'varyings',
      node,
      node.data.varyingValueName,
      varName => `${varName}: vec4<f32>`,
    );
    const inVar = compiler.getInputVarConverted(node, 'varying');
    return {
      outputs: { varying: varyingVar },
      code: `${varyingVar.replace('v.', '(*v).')} = ${inVar};`,
    };
  }
}
