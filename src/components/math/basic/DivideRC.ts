import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteDivideNode = ExtendReteNode<
  'Divide',
  {
    aValue: number | number[];
    aValueType: ValueType;
    bValue: number | number[];
    bValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class DivideRC extends RC {
  constructor() {
    super('Divide');
    this.data.component = NodeView;
  }

  initNode(node: ReteDivideNode) {
    const { data, meta } = node;
    node.initValueType('a', 0, ValueType.float);
    node.initValueType('b', 2, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/basic';
  }

  async builder(node: ReteDivideNode) {
    this.initNode(node);
    const a = new Rete.Input('a', 'A', Sockets.dynamicVector);
    const b = new Rete.Input('b', 'B', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('a', node));
    b.addControl(new DynamicControl('b', node));
    node.addOutput(out).addInput(a).addInput(b);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteDivideNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'add');
    const aVar = compiler.getInputVarConverted(node, 'a');
    const bVar = compiler.getInputVarConverted(node, 'b');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${aVar} / ${bVar};`,
    };
  }
}
