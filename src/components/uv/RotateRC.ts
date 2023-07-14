import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS } from '../../types';
import { NodeView, SelectControl, DynamicControl } from '../../view';
import { RC } from '../ReteComponent';
import { UVRC } from '../input';

export type ReteRotateNode = ExtendReteNode<
  'Rotate',
  {
    uvValue: 'UV0' | 'UV1' | 'UV2' | 'UV3' | number[];
    uvValueType: ValueType.vec2;
    centerValue: number[];
    centerValueType: ValueType.vec2;
    rotationValue: number;
    rotationValueType: ValueType.float;
    unitValue: 'radians' | 'degrees';
    unitValueType: ValueType.string;
    outValue: number;
    outValueType: ValueType.vec2;
  }
>;

const UnitOptions = ['degrees', 'radians'];

export class RotateRC extends RC {
  constructor() {
    super('Rotate');
    this.data.component = NodeView;
  }

  initNode(node: ReteRotateNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('center', [0.5, 0.5], ValueType.vec2);
    node.initValueType('rotation', 0, ValueType.float);
    node.initValueType('unit', 'radians', ValueType.string);
    node.initValueType('out', [0, 0], ValueType.vec2);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'UV';
  }

  async builder(node: ReteRotateNode) {
    this.initNode(node);
    node
      .addInput(
        new Rete.Input('uv', 'UV', Sockets.vec2).addControl(
          new SelectControl('uv', node, '', UV_OPTIONS),
        ),
      )
      .addInput(
        new Rete.Input('center', 'Center', Sockets.vec2).addControl(
          new DynamicControl('center', node),
        ),
      )
      .addInput(
        new Rete.Input('rotation', 'Rotation', Sockets.vec2).addControl(
          new DynamicControl('rotation', node),
        ),
      )
      .addControl(new SelectControl('unit', node, 'Unit', UnitOptions))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec2));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteRotateNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'rotate');
    const [centerVar, rotationVar] = compiler.getInputVarConvertedArray(node, [
      'center',
      'rotation',
    ]);
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);

    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const unit = node.data.unitValue;
    const unitVarName = unit === 'degrees' ? 'Degrees' : 'Rotation';
    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(UV_: vec2f, Center: vec2f, ${unitVarName}: f32) -> vec2f {
    ${unit === 'degrees' ? 'let Rotation = Degrees * (3.1415926/180.0);' : ''}
    var UV = UV_ - Center;
    let s = sin(Rotation);
    let c = cos(Rotation);
    let arg = (vec4f(c, s, -s, c) * 0.5 + 0.5) * 2.0 - 1.0;
    UV = UV.xy * mat2x2f(arg.xy, arg.zw);
    UV += Center;
    return UV;
}`;
    const fnVar = compiler.setContext('defines', node, node.data.unitValue, codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${uvVar}, ${centerVar}, ${rotationVar});`,
    };
  }
}
