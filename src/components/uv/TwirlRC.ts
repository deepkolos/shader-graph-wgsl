import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS } from '../../types';
import { NodeView, SelectControl, DynamicControl } from '../../view';
import { RC } from '../ReteComponent';
import { UVRC } from '../input';

export type ReteTwirlNode = ExtendReteNode<
  'Twirl',
  {
    uvValue: 'UV0' | 'UV1' | 'UV2' | 'UV3' | number[];
    uvValueType: ValueType.vec2;
    centerValue: number[];
    centerValueType: ValueType.vec2;
    strengthValue: number;
    strengthValueType: ValueType.vec2;
    offsetValue: number[];
    offsetValueType: ValueType.vec2;
    outValue: number;
    outValueType: ValueType.vec2;
  }
>;

export class TwirlRC extends RC {
  constructor() {
    super('Twirl');
    this.data.component = NodeView;
  }

  initNode(node: ReteTwirlNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('center', [0.5, 0.5], ValueType.vec2);
    node.initValueType('strength', 10, ValueType.float);
    node.initValueType('offset', [0, 0], ValueType.vec2);
    node.initValueType('out', 0, ValueType.vec2);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'uv';
  }

  async builder(node: ReteTwirlNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('uv', 'UV', Sockets.vec2).addControl(new SelectControl('uv', node, '', UV_OPTIONS)))
      .addInput(new Rete.Input('center', 'Center', Sockets.vec2).addControl(new DynamicControl('center', node)))
      .addInput(new Rete.Input('strength', 'Strength', Sockets.vec2).addControl(new DynamicControl('strength', node)))
      .addInput(new Rete.Input('offset', 'Offset', Sockets.vec2).addControl(new DynamicControl('offset', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec2));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteTwirlNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'twirl');
    const [centerVar, strengthVar, offsetVar] = compiler.getInputVarConvertedArray(node, ['center', 'strength', 'offset']);
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);

    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(UV: vec2f, Center: vec2f, Strength: f32, Offset: vec2f) -> vec2f {
  let delta = UV - Center;
  let angle = Strength * length(delta);
  let x = cos(angle) * delta.x - sin(angle) * delta.y;
  let y = sin(angle) * delta.x + cos(angle) * delta.y;
  return vec2f(x + Center.x + Offset.x, y + Center.y + Offset.y);
}`;
    const fnVar = compiler.setContext('defines', node, 'fn', codeFn);

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${uvVar}, ${centerVar}, ${strengthVar}, ${offsetVar});`,
    };
  }
}
