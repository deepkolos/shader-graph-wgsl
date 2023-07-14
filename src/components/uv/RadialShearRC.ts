import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS, UVValue } from '../../types';
import { NodeView, SelectControl, DynamicControl } from '../../view';
import { RC } from '../ReteComponent';
import { UVRC } from '../input';

export type ReteRadialShearNode = ExtendReteNode<
  'RadialShear',
  {
    uvValue: UVValue | number[];
    uvValueType: ValueType.vec2;
    centerValue: number[];
    centerValueType: ValueType.vec2;
    strengthValue: number[];
    strengthValueType: ValueType.vec2;
    offsetValue: number[];
    offsetValueType: ValueType.vec2;
    outValue: number[];
    outValueType: ValueType.vec2;
  }
>;

export class RadialShearRC extends RC {
  constructor() {
    super('RadialShear');
    this.data.component = NodeView;
  }

  initNode(node: ReteRadialShearNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('center', [0.5, 0.5], ValueType.vec2);
    node.initValueType('strength', [10, 10], ValueType.vec2);
    node.initValueType('offset', [0, 0], ValueType.vec2);
    node.initValueType('out', [0, 0], ValueType.vec2);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'UV';
    meta.label = 'Radial Shear';
  }

  async builder(node: ReteRadialShearNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('uv', 'UV', Sockets.vec2).addControl(new SelectControl('uv', node, '', UV_OPTIONS)))
      .addInput(new Rete.Input('center', 'Center', Sockets.vec2).addControl(new DynamicControl('center', node)))
      .addInput(new Rete.Input('strength', 'Strength', Sockets.float).addControl(new DynamicControl('strength', node)))
      .addInput(new Rete.Input('offset', 'Offset', Sockets.float).addControl(new DynamicControl('offset', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec2));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteRadialShearNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'radial_shear');
    const [centerVar, strengthVar, offsetVar] = compiler.getInputVarConvertedArray(node, ['center', 'strength', 'offset']);
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);
    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(UV: vec2f, Center: vec2f, Strength: vec2f, Offset: vec2f) -> vec2f {
  let delta = UV - Center;
  let delta2 = dot(delta.xy, delta.xy);
  let delta_offset = delta2 * Strength;
  return UV + vec2f(delta.y, -delta.x) * delta_offset + Offset;
}`;
    const fnVar = compiler.setContext('defines', node, 'fn', codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${uvVar}, ${centerVar}, ${strengthVar}, ${offsetVar});`,
    };
  }
}
