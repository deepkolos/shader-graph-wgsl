import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteSquareRootNode = ExtendReteNode<
  'SquareRoot',
  {
    aValue: number | number[];
    aValueType: ValueType;
    bValue: number | number[];
    bValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class SquareRootRC extends RC {
  constructor() {
    super('SquareRoot');
    this.data.component = NodeView;
  }

  initNode(node: ReteSquareRootNode) {
    const { data, meta } = node;
    node.initValueType('a', 0, ValueType.float);
    node.initValueType('b', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/basic';
    meta.label = 'Square Root';
  }

  async builder(node: ReteSquareRootNode) {
    this.initNode(node);
    const a = new Rete.Input('a', 'A', Sockets.dynamicVector);
    const b = new Rete.Input('b', 'B', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('a', node));
    b.addControl(new DynamicControl('b', node));
    node.addOutput(out).addInput(a).addInput(b);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSquareRootNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'pow');
    const aVar = compiler.getInputVarCoverted(node, 'a');
    const bVar = compiler.getInputVarCoverted(node, 'b');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = pow(${aVar}, ${bVar});`,
    };
  }
}
