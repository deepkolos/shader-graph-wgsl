import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteArctangent2Node = ExtendReteNode<
  'Arctangent2',
  {
    aValue: number | number[];
    aValueType: ValueType;
    bValue: number | number[];
    bValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class Arctangent2RC extends RC {
  constructor() {
    super('Arctangent2');
    this.data.component = NodeView;
  }

  initNode(node: ReteArctangent2Node) {
    const { data, meta } = node;
    node.initValueType('a', 0, ValueType.float);
    node.initValueType('b', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/trigonometry';
  }

  async builder(node: ReteArctangent2Node) {
    this.initNode(node);
    const a = new Rete.Input('a', 'A', Sockets.dynamicVector);
    const b = new Rete.Input('b', 'B', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('a', node));
    b.addControl(new DynamicControl('a', node));
    node.addOutput(out).addInput(a).addInput(b);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteArctangent2Node>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'atan2');
    const aVar = compiler.getInputVarConverted(node, 'a');
    const bVar = compiler.getInputVarConverted(node, 'b');
    return {  
      outputs: { out: outVar },
      code: `let ${outVar} = atan2(${aVar}, ${bVar});`,
    };
  }
}
