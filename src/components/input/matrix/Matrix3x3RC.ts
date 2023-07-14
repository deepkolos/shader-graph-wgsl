import { InputGridControl, NodeView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode, ValueTypeCtor } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteMatrix3x3Node = ExtendReteNode<
  'Matrix3x3',
  {
    outValue: number[];
    outValueType: ValueType.mat3;
  }
>;

export class Matrix3x3RC extends RC {
  static Name = 'Matrix3x3';
  constructor() {
    super(Matrix3x3RC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteMatrix3x3Node) {
    const { data, meta } = node;
    node.initValueType('out', ValueTypeCtor.mat3(), ValueType.mat3);
    data.expanded ??= true;
    meta.category = 'input/matrix';
    meta.previewDisabled = true;
    meta.label = 'Matrix 3x3';
    meta.keywords = ['mat3'];
  }

  async builder(node: ReteMatrix3x3Node) {
    this.initNode(node);

    const out = new Rete.Output('out', 'Out', Sockets.mat3);
    node.addOutput(out).addControl(new InputGridControl('out', node, '', false));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteMatrix3x3Node>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'mat3');
    const values = node.data.outValue.map(Number).join(', ');
    return { outputs: { out: outVar }, code: `let ${outVar} = mat3x3<f32>(${values});` };
  }
}
