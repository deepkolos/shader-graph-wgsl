import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteStepNode = ExtendReteNode<
  'Step',
  {
    edgeValue: number | number[];
    edgeValueType: ValueType;
    inValue: number | number[];
    inValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class StepRC extends RC {
  constructor() {
    super('Step');
    this.data.component = NodeView;
  }

  initNode(node: ReteStepNode) {
    const { data, meta } = node;
    node.initValueType('edge', 0, ValueType.float);
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/round';
  }

  async builder(node: ReteStepNode) {
    this.initNode(node);
    const a = new Rete.Input('edge', 'Edge', Sockets.dynamicVector);
    const b = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('edge', node));
    b.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a).addInput(b);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteStepNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'step');
    const edgeVar = compiler.getInputVarConverted(node, 'edge');
    const inVar = compiler.getInputVarConverted(node, 'in');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = step(${edgeVar}, ${inVar});`,
    };
  }
}
