import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete } from '../../types';
import { NodeView, DynamicControl } from '../../view';
import { RC } from '../ReteComponent';

export type RetePreviewNode = ExtendReteNode<
  'Preview',
  {
    inValue: number | number[];
    inValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class PreviewRC extends RC {
  constructor() {
    super('Preview');
    this.data.component = NodeView;
  }

  initNode(node: RetePreviewNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'utility';
  }

  async builder(node: RetePreviewNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<RetePreviewNode>): SGNodeOutput {
    return { outputs: { out: compiler.getInputVarCoverted(node, 'in') }, code: `` };
  }
}
