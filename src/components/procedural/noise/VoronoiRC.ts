import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete, UV_OPTIONS } from '../../../types';
import { NodeView, SelectControl, FloatControl } from '../../../view';
import { UVRC } from '../../input';
import { RC } from '../../ReteComponent';

export type ReteVoronoiNode = ExtendReteNode<
  'Voronoi',
  {
    uvValue: 'UV0' | 'UV1' | 'UV2' | 'UV3' | number[];
    uvValueType: ValueType.vec2;
    angleOffsetValue: number;
    angleOffsetValueType: ValueType.float;
    cellDensityValue: number;
    cellDensityValueType: ValueType.float;
    outValue: number;
    outValueType: ValueType.float;
    cellsValue: number;
    cellsValueType: ValueType.float;
  }
>;

export class VoronoiRC extends RC {
  constructor() {
    super('Voronoi');
    this.data.component = NodeView;
  }

  initNode(node: ReteVoronoiNode) {
    const { data, meta } = node;
    node.initValueType('uv', 'UV0', ValueType.vec2);
    node.initValueType('angleOffset', 2, ValueType.float);
    node.initValueType('cellDensity', 5, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    node.initValueType('cells', 0, ValueType.float);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'procedural/noise';
  }

  async builder(node: ReteVoronoiNode) {
    this.initNode(node);
    node
      .addInput(
        new Rete.Input('uv', 'UV', Sockets.vec2).addControl(
          new SelectControl('uv', node, '', UV_OPTIONS),
        ),
      )
      .addInput(
        new Rete.Input('angleOffset', 'Angel Offset', Sockets.float).addControl(
          new FloatControl('angleOffset', node),
        ),
      )
      .addInput(
        new Rete.Input('cellDensity', 'Cell Density', Sockets.float).addControl(
          new FloatControl('cellDensity', node),
        ),
      )
      .addOutput(new Rete.Output('out', 'Out', Sockets.float))
      .addOutput(new Rete.Output('cells', 'Cells', Sockets.float));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteVoronoiNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'voronoi');
    const angleOffsetVar = compiler.getInputVarConverted(node, 'angleOffset');
    const cellDensityVar = compiler.getInputVarConverted(node, 'cellDensity');
    let uvVar = compiler.getInputVarConverted(node, 'uv', false);
    if (!uvVar) uvVar = UVRC.initUVContext(compiler);

    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}_rand (UV_: vec2<f32>, offset: f32) -> vec2<f32> {
  let m = mat2x2<f32>(15.27, 47.63, 99.41, 89.98);
  let UV = fract(sin(UV_ * m) * 46839.32);
  return vec2<f32>(sin(UV.y*offset) * 0.5+0.5, cos(UV.x*offset)*0.5+0.5);
}

fn ${varName}(UV: vec2<f32>, AngleOffset: f32, CellDensity: f32) -> vec2<f32> {
  let g = floor(UV * CellDensity);
  let f = fract(UV * CellDensity);
  let t = 8.0;
  var res = vec3<f32>(8.0, 0.0, 0.0);

  for(var y: i32 = -1 ; y <= 1; y++){
    for(var x: i32 = -1; x <= 1; x++){
      let lattice = vec2<f32>(f32(x),f32(y));
      let offset = ${varName}_rand(lattice + g, AngleOffset);
      let d = distance(lattice + offset, f);
      if(d < res.x){
        res = vec3<f32>(d, offset.x, offset.y);
      }
    }
  }
  return res.xy;
}`;
    const fnVar = compiler.setContext('defines', node, 'fn', codeFn);

    return {
      outputs: { out: outVar + '.x', cell: outVar + '.y' },
      code: `let ${outVar} = ${fnVar}(${uvVar}, ${angleOffsetVar}, ${cellDensityVar});`,
    };
  }
}
