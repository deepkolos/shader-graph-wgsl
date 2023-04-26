import { NodeView, FloatControl, SelectControl, DynamicControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType, VectorValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteSphereMaskNode = ExtendReteNode<
  'SphereMask',
  {
    coordsValue: number | number[];
    coordsValueType: VectorValueType;
    centerValue: number | number[];
    centerValueType: VectorValueType;
    radiusValue: number;
    radiusValueType: ValueType.float;
    hardnessValue: number;
    hardnessValueType: ValueType.float;
    outValue: number | number[];
    outValueType: VectorValueType;
  }
>;

export class SphereMaskRC extends RC {
  constructor() {
    super('SphereMask');
    this.data.component = NodeView;
  }

  initNode(node: ReteSphereMaskNode) {
    const { data, meta } = node;
    node.initValueType('coords', 0, ValueType.float);
    node.initValueType('center', 0.5, ValueType.float);
    node.initValueType('radius', 0.1, ValueType.float);
    node.initValueType('hardness', 0.8, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/vector';
    meta.label = 'Sphere Mask';
  }

  async builder(node: ReteSphereMaskNode) {
    this.initNode(node);
    const a = new Rete.Input('coords', 'Coords', Sockets.dynamicVector);
    const b = new Rete.Input('center', 'Center', Sockets.dynamicVector);
    const c = new Rete.Input('radius', 'Radius', Sockets.float);
    const d = new Rete.Input('hardness', 'Hardness', Sockets.float);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('coords', node));
    b.addControl(new DynamicControl('center', node));
    c.addControl(new FloatControl('radius', node));
    d.addControl(new FloatControl('hardness', node));
    node.addOutput(out).addInput(a).addInput(b).addInput(c).addInput(d);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteSphereMaskNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'sphere_mask');
    const coordsVar = compiler.getInputVarCoverted(node, 'coords');
    const centerVar = compiler.getInputVarCoverted(node, 'center');
    const radiusVar = compiler.getInputVarCoverted(node, 'radius');
    const hardnessVar = compiler.getInputVarCoverted(node, 'hardness');

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = 1.0 - clamp( (distance(${coordsVar}, ${centerVar}) - ${radiusVar}) / (1.0 - ${hardnessVar}), 0.0, 1.0);`,
    };
  }
}
