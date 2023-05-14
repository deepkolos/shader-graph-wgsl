import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS } from '../../../types';
import { NodeView, SelectControl, FloatControl } from '../../../view';
import { ConstantRC, UVRC } from '../../input';
import { RC } from '../../ReteComponent';

export type ReteRoundedPolygonNode = ExtendReteNode<
  'RoundedPolygon',
  {
    uvValue: 'UV0' | 'UV1' | 'UV2' | 'UV3' | number[];
    uvValueType: ValueType.vec2;
    sidesValue: number;
    sidesValueType: ValueType.float;
    roundnessValue: number;
    roundnessValueType: ValueType.float;
    widthValue: number;
    widthValueType: ValueType.float;
    heightValue: number;
    heightValueType: ValueType.float;
    outValue: number;
    outValueType: ValueType.float;
  }
>;

export class RoundedPolygonRC extends RC {
  constructor() {
    super('RoundedPolygon');
    this.data.component = NodeView;
  }

  initNode(node: ReteRoundedPolygonNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('sides', 6, ValueType.float);
    node.initValueType('roundness', 0.3, ValueType.float);
    node.initValueType('width', 0.5, ValueType.float);
    node.initValueType('height', 0.5, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'procedural/shape';
    meta.label = 'Rounded Polygon';
  }

  async builder(node: ReteRoundedPolygonNode) {
    this.initNode(node);
    // prettier-ignore
    node
      .addInput(new Rete.Input('uv', 'UV', Sockets.vec2).addControl(new SelectControl('uv', node, '', UV_OPTIONS)))
      .addInput(new Rete.Input('width', 'Width', Sockets.float).addControl(new FloatControl('width', node)))
      .addInput(new Rete.Input('height', 'Height', Sockets.float).addControl(new FloatControl('height', node)))
      .addInput(new Rete.Input('sides', 'Sides', Sockets.float).addControl(new FloatControl('sides', node)))
      .addInput(new Rete.Input('roundness', 'Roundness', Sockets.float).addControl(new FloatControl('roundness', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.float));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteRoundedPolygonNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'roundpolygon');
    const sidesVar = compiler.getInputVarConverted(node, 'sides');
    const roundnessVar = compiler.getInputVarConverted(node, 'roundness');
    const widthVar = compiler.getInputVarConverted(node, 'width');
    const heightVar = compiler.getInputVarConverted(node, 'height');
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);
    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const piVar = ConstantRC.initConstantContext(compiler, 'PI');
    const piHalfVar = ConstantRC.initConstantContext(compiler, 'PI_HALF');
    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(UV_: vec2<f32>, Width: f32, Height: f32, Sides: f32, Roundness_: f32) -> f32 {
  var Out: f32;
  var UV = UV_ * 2. + vec2<f32>(-1.,-1.);
  UV.x = UV.x / Width;
  UV.y = UV.y / Height;
  let Roundness = clamp(Roundness_, 1e-6, 1.);
  let i_sides = floor( abs( Sides ) );
  let fullAngle = 2. * ${piVar} / i_sides;
  let halfAngle = fullAngle / 2.;
  let opositeAngle = ${piHalfVar} - halfAngle;
  let diagonal = 1. / cos( halfAngle );
  // Chamfer values
  let chamferAngle = Roundness * halfAngle; // Angle taken by the chamfer
  let remainingAngle = halfAngle - chamferAngle; // Angle that remains
  let ratio = tan(remainingAngle) / tan(halfAngle); // This is the ratio between the length of the polygon's triangle and the distance of the chamfer center to the polygon center
  // Center of the chamfer arc
  let chamferCenter = vec2<f32>(
      cos(halfAngle) ,
      sin(halfAngle)
  )* ratio * diagonal;
  // starting of the chamfer arc
  let chamferOrigin = vec2<f32>(
      1.,
      tan(remainingAngle)
  );
  // Using Al Kashi algebra, we determine:
  // The distance distance of the center of the chamfer to the center of the polygon (side A)
  let distA = length(chamferCenter);
  // The radius of the chamfer (side B)
  let distB = 1. - chamferCenter.x;
  // The refence length of side C, which is the distance to the chamfer start
  let distCref = length(chamferOrigin);
  // This will rescale the chamfered polygon to fit the uv space
  // diagonal = length(chamferCenter) + distB;
  let uvScale = diagonal;
  UV *= uvScale;
  var polaruv = vec2<f32>(
      atan2( UV.y, UV.x ),
      length(UV)
  );
  polaruv.x += ${piHalfVar} + 2.*${piVar};
  polaruv.x = (polaruv.x + halfAngle) % fullAngle;
  polaruv.x = abs(polaruv.x - halfAngle);
  UV = vec2<f32>( cos(polaruv.x), sin(polaruv.x) ) * polaruv.y;
  // Calculate the angle needed for the Al Kashi algebra
  let angleRatio = 1. - (polaruv.x-remainingAngle) / chamferAngle;
  // Calculate the distance of the polygon center to the chamfer extremity
  let distC = sqrt( distA*distA + distB*distB - 2.*distA*distB*cos( ${piVar} - halfAngle * angleRatio ) );
  Out = UV.x;
  let chamferZone = step(( halfAngle - polaruv.x ), chamferAngle); // ( halfAngle - polaruv.x ) < chamferAngle;
  Out = mix( UV.x, polaruv.y / distC, chamferZone );
  // Output this to have the shape mask instead of the distance field
  Out = clamp((1. - Out) / fwidth(Out), 0.0, 1.0);
  return Out;
}`;
    const fnVar = compiler.setContext('defines', node, 'fn', codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${uvVar}, ${widthVar}, ${heightVar}, ${sidesVar}, ${roundnessVar});`,
    };
  }
}
