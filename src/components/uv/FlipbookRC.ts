import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS, UVValue } from '../../types';
import { NodeView, SelectControl, DynamicControl, BoolControl } from '../../view';
import { RC } from '../ReteComponent';
import { UVRC } from '../input';

export type ReteFlipBookNode = ExtendReteNode<
  'FlipBook',
  {
    uvValue: UVValue | number[];
    uvValueType: ValueType.vec2;
    widthValue: number;
    widthValueType: ValueType.float;
    heightValue: number;
    heightValueType: ValueType.float;
    tileValue: number;
    tileValueType: ValueType.float;
    invertXValue: boolean;
    invertYValue: boolean;
    outValue: number;
    outValueType: ValueType.vec2;
  }
>;

export class FlipBookRC extends RC {
  constructor() {
    super('FlipBook');
    this.data.component = NodeView;
  }

  initNode(node: ReteFlipBookNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('width', 1, ValueType.float);
    node.initValueType('height', 1, ValueType.float);
    node.initValueType('tile', 0, ValueType.float);
    node.initValueType('invertX', false, ValueType.bool);
    node.initValueType('invertY', true, ValueType.bool);
    node.initValueType('out', [0, 0], ValueType.vec2);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'UV';
  }

  async builder(node: ReteFlipBookNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('uv', 'UV', Sockets.vec2).addControl(new SelectControl('uv', node, '', UV_OPTIONS)))
      .addInput(new Rete.Input('width', 'Width', Sockets.float).addControl(new DynamicControl('width', node)))
      .addInput(new Rete.Input('height', 'Height', Sockets.float).addControl(new DynamicControl('height', node)))
      .addInput(new Rete.Input('tile', 'Tile', Sockets.float).addControl(new DynamicControl('tile', node)))
      .addControl(new BoolControl('invertX', node, 'Invert X', false))
      .addControl(new BoolControl('invertY', node, 'Invert Y', false))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec2));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteFlipBookNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'flipbook');
    const [widthVar, heightVar, tileVar] = compiler.getInputVarConvertedArray(node, ['width', 'height', 'tile']);
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);

    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const invertX = node.data.invertXValue;
    const invertY = node.data.invertYValue;
    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(UV: vec2f, Width: f32, Height: f32, Tile_: f32, Invert: vec2f) -> vec2f {
  let Tile = Tile_ % (Width * Height);
  let tileCount = vec2f(1.0, 1.0) / vec2f(Width, Height);
  let tileY = abs(Invert.y * Height - (floor(Tile * tileCount.x) + Invert.y * 1.0));
  let tileX = abs(Invert.x * Width - ((Tile - Width * floor(Tile * tileCount.x)) + Invert.x * 1.0));
  return (UV + vec2f(tileX, tileY)) * tileCount;
}`;
    const fnVar = compiler.setContext('defines', node, 'fn', codeFn);
    const invertVar = `vec2f(${invertX ? '1.' : '0.'}, ${invertY ? '1.' : '0.'})`;
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${uvVar}, ${widthVar}, ${heightVar}, ${tileVar}, ${invertVar});`,
    };
  }
}
