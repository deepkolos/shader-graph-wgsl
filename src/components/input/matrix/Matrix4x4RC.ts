import { InputGridControl, NodeView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode, ValueTypeCtor } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteMatrix4x4Node = ExtendReteNode<
  'Matrix4x4',
  {
    outValue: number[];
    outValueType: ValueType.mat4;
  }
>;

export class Matrix4x4RC extends RC {
  static Name = 'Matrix4x4';
  constructor() {
    super(Matrix4x4RC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteMatrix4x4Node) {
    const { data, meta } = node;
    node.initValueType('out', ValueTypeCtor.mat4(), ValueType.mat4);
    data.expanded ??= true;
    meta.category = 'input/matrix';
    meta.previewDisabled = true;
    meta.label = 'Matrix 4x4';
    meta.keywords = ['mat4'];
  }

  async builder(node: ReteMatrix4x4Node) {
    this.initNode(node);

    const out = new Rete.Output('out', 'Out', Sockets.mat4);
    node.addOutput(out).addControl(new InputGridControl('out', node, '', false));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteMatrix4x4Node>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'mat4');
    const values = node.data.outValue.map(Number).join(', ');
    return { outputs: { out: outVar }, code: `let ${outVar} = mat4x4<f32>(${values});` };
  }
}
