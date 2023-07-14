import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS } from '../../types';
import { NodeView, SelectControl, DynamicControl } from '../../view';
import { RC } from '../ReteComponent';
import { UVRC } from '../input';

export type ReteTilingAndOffsetNode = ExtendReteNode<
  'TilingAndOffset',
  {
    uvValue: 'UV0' | 'UV1' | 'UV2' | 'UV3' | number[];
    uvValueType: ValueType.vec2;
    tilingValue: number;
    tilingValueType: ValueType.vec2;
    offsetValue: number;
    offsetValueType: ValueType.vec2;
    outValue: number;
    outValueType: ValueType.vec2;
  }
>;

export class TilingAndOffsetRC extends RC {
  constructor() {
    super('TilingAndOffset');
    this.data.component = NodeView;
  }

  initNode(node: ReteTilingAndOffsetNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('tiling', [1, 1], ValueType.vec2);
    node.initValueType('offset', [0, 0], ValueType.vec2);
    node.initValueType('out', 0, ValueType.vec2);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'UV';
    meta.label = 'Tiling And Offset';
  }

  async builder(node: ReteTilingAndOffsetNode) {
    this.initNode(node);
    node
      .addInput(
        new Rete.Input('uv', 'UV', Sockets.vec2).addControl(
          new SelectControl('uv', node, '', UV_OPTIONS),
        ),
      )
      .addInput(
        new Rete.Input('tiling', 'Tiling', Sockets.vec2).addControl(
          new DynamicControl('tiling', node),
        ),
      )
      .addInput(
        new Rete.Input('offset', 'Offset', Sockets.vec2).addControl(
          new DynamicControl('offset', node),
        ),
      )
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec2));
  }

  compileSG(
    compiler: ShaderGraphCompiler,
    node: SGNodeData<ReteTilingAndOffsetNode>,
  ): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'tiling_offset');
    const tilingVar = compiler.getInputVarConverted(node, 'tiling');
    const offsetVar = compiler.getInputVarConverted(node, 'offset');
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);

    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${uvVar} * ${tilingVar} + ${offsetVar};`,
    };
  }
}
