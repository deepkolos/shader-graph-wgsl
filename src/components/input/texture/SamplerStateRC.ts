import { AssetControl, NodeView, SelectControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode, AssetValue, SamplerValue } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteSamplerStateNode = ExtendReteNode<
  'SamplerState',
  {
    outValue: SamplerValue;
    outValueType: ValueType.sampler;
  }
>;

export class SamplerStateRC extends RC {
  constructor() {
    super('SamplerState');
    this.data.component = NodeView;
  }

  initNode(node: ReteSamplerStateNode) {
    const { data, meta } = node;
    node.initValueType(
      'out',
      { filter: 'point', warp: 'clamp' } satisfies SamplerValue,
      ValueType.sampler,
    );
    data.expanded ??= true;

    meta.previewDisabled = true;
    meta.category = 'input/texture';
    meta.label = 'Sampler State';
  }

  async builder(node: ReteSamplerStateNode) {
    this.initNode(node);
    const out = new Rete.Output('out', 'Out', Sockets.sampler);

    node
      .addOutput(out)
      .addControl(
        new SelectControl('out.filter', node, 'Filter', ['linear', 'point', 'trilinear'], false),
      )
      .addControl(
        new SelectControl('out.warp', node, 'Wrap', ['repeat', 'clamp', 'mirror'], false),
      );
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSamplerStateNode>): SGNodeOutput {
    const outVar = compiler.compileValue(node.data.outValue, node.data.outValueType);
    return { outputs: { out: outVar }, code: '' };
  }
}
