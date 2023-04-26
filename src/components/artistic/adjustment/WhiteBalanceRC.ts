import { NodeView, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteWhiteBalanceNode = ExtendReteNode<
  'WhiteBalance',
  {
    inValue: number[];
    inValueType: ValueType.vec3;
    outValue: number[];
    outValueType: ValueType.vec3;
    tintValue: number;
    tintValueType: ValueType.float;
    temperatureValue: number;
    temperatureValueType: ValueType.float;
  }
>;

export class WhiteBalanceRC extends RC {
  static Name = 'WhiteBalance';
  constructor() {
    super(WhiteBalanceRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteWhiteBalanceNode) {
    const { data, meta } = node;
    node.initValueType('in', [0, 0, 0], ValueType.vec3);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('tint', 0, ValueType.float);
    node.initValueType('temperature', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'artistic/adjustment';
    meta.label = 'White Balance';
  }

  async builder(node: ReteWhiteBalanceNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('in', 'In', Sockets.vec3).addControl(new DynamicControl('in', node)))
      .addInput(new Rete.Input('temperature', 'Temperature', Sockets.vec3).addControl(new DynamicControl('temperature', node)))
      .addInput(new Rete.Input('tint', 'Tint', Sockets.vec3).addControl(new DynamicControl('tint', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec3));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteWhiteBalanceNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'hue');
    const typeClass = compiler.getTypeClass(node.data.outValueType);
    const [tempVar, tintVar, inVar] = compiler.getInputVarCovertedArray(node, ['temperature', 'tint', 'in']);

    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(In: vec3<f32>, Temperature: f32, Tint: f32) -> vec3<f32> {
    // Range ~[-1.67;1.67] works best
    let t1 = Temperature * 10. / 6.;
    let t2 = Tint * 10. / 6.;

    // Get the CIE xy chromaticity of the reference white point.
    // Note: 0.31271 = x value on the D65 white point
    let t1Check = step(0, t1);
    let x = 0.31271 - t1 * (t1Check * 0.05 + (1.0 - t1Check) * 0.1);
    // let x = 0.31271 - t1 * (t1 < 0. ? 0.1 : 0.05);
    let standardIlluminantY = 2.87 * x - 3. * x * x - 0.27509507;
    let y = standardIlluminantY + t2 * 0.05;

    // Calculate the coefficients in the LMS space.
    let w1 = vec3<f32>(0.949237, 1.03542, 1.08728); // D65 white point

    // CIExyToLMS
    let Y = 1.;
    let X = Y * x / y;
    let Z = Y * (1. - x - y) / y;
    let L = 0.7328 * X + 0.4296 * Y - 0.1624 * Z;
    let M = -0.7036 * X + 1.6975 * Y + 0.0061 * Z;
    let S = 0.0030 * X + 0.0136 * Y + 0.9834 * Z;
    let w2 = vec3<f32>(L, M, S);

    let balance = vec3<f32>(w1.x / w2.x, w1.y / w2.y, w1.z / w2.z);

    let LIN_2_LMS_MAT = mat3x3<f32>(
      3.90405e-1, 7.08416e-2, 2.31082e-2,
      5.49941e-1, 9.63172e-1, 1.28021e-1,
      8.92632e-3, 1.35775e-3, 9.36245e-1
    );

    let LMS_2_LIN_MAT = mat3x3<f32>(
      2.85847e+0, -2.10182e-1, -4.18120e-2,
      -1.62879e+0, 1.15820e+0, -1.18169e-1,
      -2.48910e-2, 3.24281e-4,  1.06867e+0
    );

    var lms = LIN_2_LMS_MAT * In;
    lms *= balance;
    return LMS_2_LIN_MAT * lms;
}`;
    const fnVar = compiler.setContext('defineFns', node, 'fn', codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${inVar}, ${tempVar}, ${tintVar});`,
    };
  }
}
