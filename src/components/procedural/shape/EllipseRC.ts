import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS } from '../../../types';
import { NodeView, SelectControl, FloatControl } from '../../../view';
import { UVRC } from '../../input';
import { RC } from '../../ReteComponent';

export type ReteEllipseNode = ExtendReteNode<
  'Ellipse',
  {
    uvValue: 'UV0' | 'UV1' | 'UV2' | 'UV3' | number[];
    uvValueType: ValueType.vec2;
    widthValue: number;
    widthValueType: ValueType.float;
    heightValue: number;
    heightValueType: ValueType.float;
    outValue: number;
    outValueType: ValueType.float;
  }
>;

export class EllipseRC extends RC {
  constructor() {
    super('Ellipse');
    this.data.component = NodeView;
  }

  initNode(node: ReteEllipseNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('width', 0.5, ValueType.float);
    node.initValueType('height', 0.5, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'procedural/shape';
  }

  async builder(node: ReteEllipseNode) {
    this.initNode(node);
    // prettier-ignore
    node
      .addInput(new Rete.Input('uv', 'UV', Sockets.vec2).addControl(new SelectControl('uv', node, '', UV_OPTIONS)))
      .addInput(new Rete.Input('width', 'Width', Sockets.float).addControl(new FloatControl('width', node)))
      .addInput(new Rete.Input('height', 'Height', Sockets.float).addControl(new FloatControl('height', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.float));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteEllipseNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'ellipse');
    const widthVar = compiler.getInputVarConverted(node, 'width');
    const heightVar = compiler.getInputVarConverted(node, 'height');
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);
    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(UV: vec2<f32>, Width: f32, Height: f32) -> f32 {
  let d = length((UV * 2.0 - 1.) / vec2<f32>(Width, Height));
  return clamp((1.0 - d) / fwidth(d), 0.0, 1.0);
}`;
    const fnVar = compiler.setContext('defines', node, 'fn', codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${uvVar}, ${widthVar}, ${heightVar});`,
    };
  }
}
