import { NodeView, FloatControl, SelectControl, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteRotateAboutAxisNode = ExtendReteNode<
  'RotateAboutAxis',
  {
    inValue: number[];
    inValueType: ValueType.vec3;
    axisValue: number[];
    axisValueType: ValueType.vec3;
    roateValue: number;
    roateValueType: ValueType.float;
    outValue: number[];
    outValueType: ValueType.vec3;
    unitValue: 'degrees' | 'radians';
  }
>;

export class RotateAboutAxisRC extends RC {
  constructor() {
    super('RotateAboutAxis');
    this.data.component = NodeView;
  }

  initNode(node: ReteRotateAboutAxisNode) {
    const { data, meta } = node;
    node.initValueType('in', [0, 0, 0], ValueType.vec3);
    node.initValueType('axis', [0, 0, 0], ValueType.vec3);
    node.initValueType('rotate', 1, ValueType.float);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('unit', 'radians');
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/vector';
    meta.label = 'Rotate About Axis';
  }

  async builder(node: ReteRotateAboutAxisNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.vec3);
    const b = new Rete.Input('axis', 'Axis', Sockets.vec3);
    const t = new Rete.Input('rotate', 'Rotate', Sockets.float);
    const out = new Rete.Output('out', 'Out', Sockets.float);

    a.addControl(new DynamicControl('in', node));
    b.addControl(new DynamicControl('axis', node));
    t.addControl(new FloatControl('rotate', node));
    node.addOutput(out).addInput(a).addInput(b).addInput(t);
    node.addControl(new SelectControl('unit', node, 'Unit', ['radians', 'degrees'], false));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteRotateAboutAxisNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'rotate');
    const inVar = compiler.getInputVarCoverted(node, 'in');
    const axisVar = compiler.getInputVarCoverted(node, 'axis');
    const rotateVar = compiler.getInputVarCoverted(node, 'rotate');
    const typeClass = compiler.getTypeClass(node.data.outValueType);

    const isDeg = node.data.unitValue === 'degrees';
    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(in_: vec3<f32>, axis_: vec3<f32>, ${isDeg ? 'rotate_deg' : 'rotate_rad'}: f32) -> ${typeClass} {
  ${isDeg ? 'let rotate_rad = radians(rotate_deg);' : ''}
  let s = sin(rotate_rad);
  let c = cos(rotate_rad);
  let one_minus_c = 1.0 - c;

  let axis = normalize(axis_);
  let rot_mat = mat3x3<f32>(
    one_minus_c * axis.x * axis.x + c, one_minus_c * axis.x * axis.y + axis.z * s, one_minus_c * axis.z * axis.x - axis.y * s,
    one_minus_c * axis.x * axis.y - axis.z * s, one_minus_c * axis.y * axis.y + c, one_minus_c * axis.y * axis.z + axis.x * s,
    one_minus_c * axis.z * axis.x + axis.y * s, one_minus_c * axis.y * axis.z - axis.x * s, one_minus_c * axis.z * axis.z + c
  );
  return rot_mat * in_;
}`;
    const fnVarName = compiler.setContext('defineFns', node, `${node.data.unitValue}_${node.data.outValueType}`, codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVarName}(${inVar}, ${axisVar}, ${rotateVar});`,
    };
  }
}
