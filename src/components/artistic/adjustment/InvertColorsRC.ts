import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, VectorValueType, Rete, ValueComponentMap, ReteNode, ValueType } from '../../../types';
import { NodeView, DynamicControl, BoolControl } from '../../../view';
import { RC } from '../../ReteComponent';

export type ReteInvertColorsNode = ExtendReteNode<
  'InvertColors',
  {
    inValue: number | number[];
    inValueType: VectorValueType;
    outValue: number | number[];
    outValueType: VectorValueType;
    invertRValue: boolean;
    invertGValue: boolean;
    invertBValue: boolean;
    invertAValue: boolean;
  }
>;

const checkDisable = (node: ReteNode, key: string): boolean => {
  const comLen = ValueComponentMap[node.data.inValueType];
  if (
    (key === 'invertR' && comLen >= 1) ||
    (key === 'invertG' && comLen >= 2) ||
    (key === 'invertB' && comLen >= 3) ||
    (key === 'invertA' && comLen >= 4)
  ) {
    return false;
  }
  return true;
};

export class InvertColorsRC extends RC {
  constructor() {
    super('InvertColors');
    this.data.component = NodeView;
  }

  initNode(node: ReteInvertColorsNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    node.initValueType('invertR', false, ValueType.bool);
    node.initValueType('invertG', false, ValueType.bool);
    node.initValueType('invertB', false, ValueType.bool);
    node.initValueType('invertA', false, ValueType.bool);
    data.expanded ??= true;
    data.preview ??= true;

    meta.category = 'artistic/adjustment';
    meta.previewDisabled = false;
    meta.label = 'Invert Colors';
  }

  async builder(node: ReteInvertColorsNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('in', 'In', Sockets.dynamicVector).addControl(new DynamicControl('in', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.dynamicVector))
      .addControl(new BoolControl('invertR', node, 'Red', false, checkDisable))
      .addControl(new BoolControl('invertG', node, 'Green', false, checkDisable))
      .addControl(new BoolControl('invertB', node, 'Blue', false, checkDisable))
      .addControl(new BoolControl('invertA', node, 'Alpha', false, checkDisable));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteInvertColorsNode>): SGNodeOutput {
    const { invertRValue, invertGValue, invertBValue, invertAValue, outValueType } = node.data;
    const inVar = compiler.getInputVar(node, 'in');
    const outVar = compiler.getOutVarName(node, 'out', 'invert');
    const typeClass = compiler.getTypeClass(outValueType);
    const typeLen = ValueComponentMap[outValueType];
    const invertVar = `${typeClass}(${[invertRValue, invertGValue, invertBValue, invertAValue]
      .slice(0, typeLen)
      .map(i => Number(i).toFixed(1))
      .join(', ')})`;
    return { outputs: { out: outVar }, code: `let ${outVar} = abs(${invertVar} - ${inVar});` };
  }
}
