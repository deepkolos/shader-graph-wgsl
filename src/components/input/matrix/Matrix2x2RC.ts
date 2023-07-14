import { InputGridControl, NodeView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode, ValueTypeCtor } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteMatrix2x2Node = ExtendReteNode<
  'Matrix2x2',
  {
    outValue: number[];
    outValueType: ValueType.mat2;
  }
>;

export class Matrix2x2RC extends RC {
  static Name = 'Matrix2x2';
  constructor() {
    super(Matrix2x2RC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteMatrix2x2Node) {
    const { data, meta } = node;
    node.initValueType('out', ValueTypeCtor.mat2(), ValueType.mat2);
    data.expanded ??= true;
    meta.category = 'input/matrix';
    meta.previewDisabled = true;
    meta.label = 'Matrix 2x2';
    meta.keywords = ['mat2'];
  }

  async builder(node: ReteMatrix2x2Node) {
    this.initNode(node);

    const out = new Rete.Output('out', 'Out', Sockets.mat2);
    node.addOutput(out).addControl(new InputGridControl('out', node, '', false));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteMatrix2x2Node>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'mat2');
    const values = node.data.outValue.map(Number).join(', ');
    return { outputs: { out: outVar }, code: `let ${outVar} = mat2x2<f32>(${values});` };
  }
}
