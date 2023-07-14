import { BoolControl, DynamicControl, NodeView } from '../../view';
import { Sockets } from '../../sockets';
import { ValueType, Rete, ExtendReteNode, VectorValueType, ValueComponentMap, ReteNode } from '../../types';
import { RC } from '../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';

export type ReteFlipNode = ExtendReteNode<
  'Flip',
  {
    inValue: number | number[];
    inValueType: VectorValueType;
    outValue: number | number[];
    outValueType: VectorValueType;
    flipXValue: boolean;
    flipYValue: boolean;
    flipZValue: boolean;
    flipWValue: boolean;
  }
>;

const checkDisable = (node: ReteNode, key: string): boolean => {
  const comLen = ValueComponentMap[node.data.inValueType];
  if (
    (key === 'flipX' && comLen >= 1) ||
    (key === 'flipY' && comLen >= 2) ||
    (key === 'flipZ' && comLen >= 3) ||
    (key === 'flipW' && comLen >= 4)
  ) {
    return false;
  }
  return true;
};

export class FlipRC extends RC {
  constructor() {
    super('Flip');
    this.data.component = NodeView;
  }

  initNode(node: ReteFlipNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    node.initValueType('flipX', false, ValueType.bool);
    node.initValueType('flipY', false, ValueType.bool);
    node.initValueType('flipZ', false, ValueType.bool);
    node.initValueType('flipW', false, ValueType.bool);
    data.expanded ??= true;

    meta.category = 'channel';
    meta.previewDisabled = false;
  }

  async builder(node: ReteFlipNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('in', 'In', Sockets.dynamicVector).addControl(new DynamicControl('in', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.dynamicVector))
      .addControl(new BoolControl('flipX', node, 'Red', false, checkDisable))
      .addControl(new BoolControl('flipY', node, 'Green', false, checkDisable))
      .addControl(new BoolControl('flipZ', node, 'Blue', false, checkDisable))
      .addControl(new BoolControl('flipW', node, 'Alpha', false, checkDisable));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteFlipNode>): SGNodeOutput {
    const { flipXValue, flipYValue, flipZValue, flipWValue, outValueType } = node.data;
    const inVar = compiler.getInputVar(node, 'in');
    const outVar = compiler.getOutVarName(node, 'out', 'flip');
    const typeClass = compiler.getTypeClass(outValueType);
    const typeLen = ValueComponentMap[outValueType];
    const flipVar = `${typeClass}(${[flipXValue, flipYValue, flipZValue, flipWValue]
      .slice(0, typeLen)
      .map(i => Number(i).toFixed(1))
      .join(', ')})`;
    return { outputs: { out: outVar }, code: `let ${outVar} = (${flipVar} * -2.0 + 1.0) * ${inVar};` };
  }
}
