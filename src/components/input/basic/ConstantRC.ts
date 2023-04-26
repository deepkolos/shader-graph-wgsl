import { NodeView, SelectControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode, ArrayElement } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

const Options = ['PI', 'TAU', 'PHI', 'E', 'SQRT2', 'PI_HALF'] as const;
type TypeValue = ArrayElement<typeof Options>;
const ValueMap: { [k in TypeValue]: string } = {
  PI: '3.141592653589793', // TBD 使用引擎内部
  E: '2.718281828459045',
  PHI: '1.61803',
  SQRT2: '1.4142135623730',
  TAU: '6.2831855',
  PI_HALF: '1.57079632679',
};

export type ReteConstantNode = ExtendReteNode<
  'Constant',
  {
    typeValue: TypeValue;
    outValue: number;
    outValueType: ValueType.float;
  }
>;

export class ConstantRC extends RC {
  static Name = 'Constant';
  constructor() {
    super(ConstantRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteConstantNode) {
    const { data, meta } = node;
    node.initValueType('out', 0, ValueType.float);
    node.initValueType('type', Options[0], ValueType.string);
    data.expanded ??= true;
    meta.category = 'input/basic';
    meta.previewDisabled = true;
  }

  async builder(node: ReteConstantNode) {
    this.initNode(node);

    const out = new Rete.Output('out', 'Out', Sockets.float);
    node.addOutput(out).addControl(new SelectControl('type', node, '', Options as any, false));
  }

  static initConstantContext(compiler: ShaderGraphCompiler, type: TypeValue) {
    const node = { name: ConstantRC.Name, data: {} } as any;
    return compiler.setContext('defines', node, type, varName => `const ${varName} = ${ValueMap[type]};`);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteConstantNode>): SGNodeOutput {
    let outVar = '';
    if (node.outputs.out.connections.length) {
      outVar = ConstantRC.initConstantContext(compiler, node.data.typeValue);
    }
    return { outputs: { out: outVar }, code: '' };
  }
}
