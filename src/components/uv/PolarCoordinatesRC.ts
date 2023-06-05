import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS } from '../../types';
import { NodeView, SelectControl, DynamicControl } from '../../view';
import { RC } from '../ReteComponent';
import { UVRC } from '../input';

export type RetePolarCoordinatesNode = ExtendReteNode<
  'PolarCoordinates',
  {
    uvValue: 'UV0' | 'UV1' | 'UV2' | 'UV3' | number[];
    uvValueType: ValueType.vec2;
    centerValue: number[];
    centerValueType: ValueType.vec2;
    radialScaleValue: number;
    radialScaleValueType: ValueType.float;
    lengthScaleValue: number;
    lengthScaleValueType: ValueType.float;
    outValue: number[];
    outValueType: ValueType.vec2;
  }
>;

export class PolarCoordinatesRC extends RC {
  constructor() {
    super('PolarCoordinates');
    this.data.component = NodeView;
  }

  initNode(node: RetePolarCoordinatesNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('center', [0.5, 0.5], ValueType.vec2);
    node.initValueType('radialScale', 1, ValueType.float);
    node.initValueType('lengthScale', 1, ValueType.float);
    node.initValueType('out', [0, 0], ValueType.vec2);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'uv';
    meta.label = 'Polar Coordinates';
  }

  async builder(node: RetePolarCoordinatesNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('uv', 'UV', Sockets.vec2).addControl(new SelectControl('uv', node, '', UV_OPTIONS)))
      .addInput(new Rete.Input('center', 'Center', Sockets.vec2).addControl(new DynamicControl('center', node)))
      .addInput(new Rete.Input('radialScale', 'Radial Scale', Sockets.float).addControl(new DynamicControl('radialScale', node)))
      .addInput(new Rete.Input('lengthScale', 'Length Scale', Sockets.float).addControl(new DynamicControl('lengthScale', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec2));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<RetePolarCoordinatesNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'polar_coord');
    const [centerVar, radialScaleVar, lengthScaleVar] = compiler.getInputVarConvertedArray(node, ['center', 'radialScale', 'lengthScale']);
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);
    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(UV: vec2f, Center: vec2f, RadialScale: f32, LengthScale: f32) -> vec2f {
  let delta = UV - Center;
  let radius = length(delta) * 2.0 * RadialScale;
  let angle = atan2(delta.x, delta.y) * 1.0 / 6.28 * LengthScale;
  return vec2f(radius, angle);
}`;
    const fnVar = compiler.setContext('defines', node, 'fn', codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${uvVar}, ${centerVar}, ${radialScaleVar}, ${lengthScaleVar});`,
    };
  }
}
