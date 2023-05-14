import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type RetePosterizeNode = ExtendReteNode<
  'Posterize',
  {
    inValue: number | number[];
    inValueType: ValueType;
    stepsValue: number | number[];
    stepsValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class PosterizeRC extends RC {
  constructor() {
    super('Posterize');
    this.data.component = NodeView;
  }

  initNode(node: RetePosterizeNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('steps', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/advanced';
  }

  async builder(node: RetePosterizeNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const b = new Rete.Input('steps', 'Steps', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    b.addControl(new DynamicControl('steps', node));
    node.addOutput(out).addInput(a).addInput(b);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<RetePosterizeNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'posterize');
    const inVar = compiler.getInputVarConverted(node, 'in');
    const stepsVar = compiler.getInputVarConverted(node, 'steps');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = floor(${inVar} / (1.0 / ${stepsVar})) * (1.0 / ${stepsVar});`,
    };
  }
}
