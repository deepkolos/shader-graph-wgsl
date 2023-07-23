import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ArrayElement, ExtendReteNode, Rete, ValueType } from '../../../types';
import { NodeView, DynamicControl, SelectControl } from '../../../view';
import { RC } from '../../ReteComponent';

const ModeOptions = ['default', 'reoriented'] as const;
type Mode = ArrayElement<typeof ModeOptions>;

export type ReteNormalBlendNode = ExtendReteNode<
  'NormalBlend',
  {
    aValue: number[];
    aValueType: ValueType.vec3;
    bValue: number[];
    bValueType: ValueType.vec3;
    outValue: number[];
    outValueType: ValueType.vec3;
    modeValue: Mode;
    modeValueType: ValueType.string;
  }
>;

export class NormalBlendRC extends RC {
  static Name = 'NormalBlend';
  constructor() {
    super(NormalBlendRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteNormalBlendNode) {
    const { data, meta } = node;
    node.initValueType('a', [0, 0, 1], ValueType.vec3);
    node.initValueType('b', [0, 0, 1], ValueType.vec3);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('mode', ModeOptions[0], ValueType.string);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'artistic/normal';
    meta.label = 'Normal Blend';
  }

  async builder(node: ReteNormalBlendNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('a', 'A', Sockets.vec3).addControl(new DynamicControl('a', node)))
      .addInput(new Rete.Input('b', 'B', Sockets.vec3).addControl(new DynamicControl('b', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.vec3))
      .addControl(new SelectControl('mode', node, 'Mode', ModeOptions as any, false));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteNormalBlendNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'normalBlend');
    const [aVar, bVar] = compiler.getInputVarConvertedArray(node, ['a', 'b']);
    const mode = node.data.modeValue;

    if (mode === 'default') {
      return {
        outputs: { out: outVar },
        code: `let ${outVar} = normalize(vec3f(${aVar}.rg + ${bVar}.rg, ${aVar}.b * ${bVar}.b));`,
      };
    } else {
      const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(A: vec3f, B: vec3f) -> vec3f {
  let t = A.xyz + vec3f(0.0, 0.0, 1.0);
  let u = B.xyz * vec3f(-1.0, -1.0, 1.0);
  return (t / t.z) * dot(t, u) - u;
}`;
      const fnVar = compiler.setContext('defines', node, mode, codeFn);

      return {
        outputs: { out: outVar },
        code: `let ${outVar} = ${fnVar}(${aVar}, ${bVar});`,
      };
    }
  }
}
