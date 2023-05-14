import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput, initRandContext } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteRandomRangeNode = ExtendReteNode<
  'RandomRange',
  {
    seedValue: number | number[];
    seedValueType: ValueType;
    minValue: number | number[];
    minValueType: ValueType;
    maxValue: number | number[];
    maxValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class RandomRangeRC extends RC {
  constructor() {
    super('RandomRange');
    this.data.component = NodeView;
  }

  initNode(node: ReteRandomRangeNode) {
    const { data, meta } = node;
    node.initValueType('seed', [0, 0], ValueType.vec2);
    node.initValueType('min', 0, ValueType.float);
    node.initValueType('max', 1, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/range';
    meta.label = 'Random Range';
  }

  async builder(node: ReteRandomRangeNode) {
    this.initNode(node);
    const a = new Rete.Input('seed', 'Seed', Sockets.vec2);
    const b = new Rete.Input('min', 'Min', Sockets.float);
    const t = new Rete.Input('max', 'Max', Sockets.float);
    const out = new Rete.Output('out', 'Out', Sockets.float);

    a.addControl(new DynamicControl('seed', node));
    b.addControl(new DynamicControl('min', node));
    t.addControl(new DynamicControl('max', node));
    node.addOutput(out).addInput(a).addInput(b).addInput(t);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteRandomRangeNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'rand');
    const seedVar = compiler.getInputVarConverted(node, 'seed');
    const minVar = compiler.getInputVarConverted(node, 'min');
    const maxVar = compiler.getInputVarConverted(node, 'max');
    const fnVarName = initRandContext(compiler);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = mix(${minVar}, ${maxVar}, ${fnVarName}(${seedVar}));`,
    };
  }
}
