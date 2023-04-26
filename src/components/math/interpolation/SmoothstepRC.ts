import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteSmoothstepNode = ExtendReteNode<
  'Smoothstep',
  {
    edge1Value: number | number[];
    edge1ValueType: ValueType;
    edge2Value: number | number[];
    edge2ValueType: ValueType;
    inValue: number | number[];
    inValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class SmoothstepRC extends RC {
  constructor() {
    super('Smoothstep');
    this.data.component = NodeView;
  }

  initNode(node: ReteSmoothstepNode) {
    const { data, meta } = node;
    node.initValueType('edge1', 0, ValueType.float);
    node.initValueType('edge2', 0, ValueType.float);
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/interpolation';
  }

  async builder(node: ReteSmoothstepNode) {
    this.initNode(node);
    const a = new Rete.Input('edge1', 'Edge1', Sockets.dynamicVector);
    const b = new Rete.Input('edge2', 'Edge2', Sockets.dynamicVector);
    const t = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('edge1', node));
    b.addControl(new DynamicControl('edge2', node));
    t.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a).addInput(b).addInput(t);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSmoothstepNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'smoothstep');
    const edge1Var = compiler.getInputVarCoverted(node, 'edge1');
    const edge2Var = compiler.getInputVarCoverted(node, 'edge2');
    const inVar = compiler.getInputVarCoverted(node, 'in');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = smoothstep(${edge1Var}, ${edge2Var}, ${inVar});`,
    };
  }
}
