import { NodeView, SelectControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode, ArrayElement } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

const Options = [
  'Model',
  'View',
  'Proj',
  'ViewProj',
  'ModelView',

  'I_Model',
  'I_View',
  'I_Proj',
  'I_ViewProj',
  'I_ModelView',

  'IT_Model',
  'IT_ModelView',
] as const;
type TypeValue = ArrayElement<typeof Options>;

export type ReteTransformationMatrixNode = ExtendReteNode<
  'TransformationMatrix',
  {
    typeValue: TypeValue;
    outValue: number[];
    outValueType: ValueType.mat4;
  }
>;

export class TransformationMatrixRC extends RC {
  static Name = 'TransformationMatrix';
  constructor() {
    super(TransformationMatrixRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteTransformationMatrixNode) {
    const { data, meta } = node;
    node.initValueType('out', 0, ValueType.mat4);
    node.initValueType('type', Options[0], ValueType.string);
    data.expanded ??= true;
    meta.category = 'input/matrix';
    meta.previewDisabled = true;
    meta.label = 'Transformation Matrix';
  }

  async builder(node: ReteTransformationMatrixNode) {
    this.initNode(node);

    const out = new Rete.Output('out', 'Out', Sockets.mat4);
    node.addOutput(out).addControl(new SelectControl('type', node, '', Options as any, false));
  }

  static initMatrixContext(compiler: ShaderGraphCompiler, type: TypeValue) {
    const node = { name: 'Matrix', data: {} } as any;
    return compiler.setContext('uniforms', node, type, varName => `${varName}: mat4x4<f32>`);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteTransformationMatrixNode>): SGNodeOutput {
    let outVar = '';
    if (node.outputs.out.connections.length) {
      outVar = TransformationMatrixRC.initMatrixContext(compiler, node.data.typeValue);
    }
    return { outputs: { out: outVar }, code: '' };
  }
}
