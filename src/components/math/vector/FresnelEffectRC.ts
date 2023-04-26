import { NodeView, LabelControl, FloatControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { NormalRC, ViewDirectionRC } from '../../input';

export type ReteFresnelEffectNode = ExtendReteNode<
  'FresnelEffect',
  {
    normalValue: number | number[];
    normalValueType: ValueType;
    viewDirValue: number | number[];
    viewDirValueType: ValueType;
    powerValue: number | number[];
    powerValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
  }
>;

export class FresnelEffectRC extends RC {
  constructor() {
    super('FresnelEffect');
    this.data.component = NodeView;
  }

  initNode(node: ReteFresnelEffectNode) {
    const { data, meta } = node;
    node.initValueType('normal', [0, 0, 0], ValueType.vec3);
    node.initValueType('viewDir', [0, 0, 0], ValueType.vec3);
    node.initValueType('power', 1, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;
    data.previewType ??= '3d';

    meta.previewDisabled = false;
    meta.category = 'math/vector';
    meta.label = 'Fresnel Effect';
  }

  async builder(node: ReteFresnelEffectNode) {
    this.initNode(node);
    const a = new Rete.Input('normal', 'Normal', Sockets.vec3);
    const b = new Rete.Input('viewDir', 'View Dir', Sockets.vec3);
    const t = new Rete.Input('power', 'Power', Sockets.float);
    const out = new Rete.Output('out', 'Out', Sockets.float);

    a.addControl(new LabelControl('normal', node, 'World Space'));
    b.addControl(new LabelControl('viewDir', node, 'World Space'));
    t.addControl(new FloatControl('power', node));
    node.addOutput(out).addInput(a).addInput(b).addInput(t);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteFresnelEffectNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'fresnel');
    let normalVar = compiler.getInputVarCoverted(node, 'normal', false);
    let viewDirVar = compiler.getInputVarCoverted(node, 'viewDir', false);
    const powerVar = compiler.getInputVarCoverted(node, 'power');
    const typeClass = compiler.getTypeClass(node.data.outValueType);

    const codeFn = (varName: string) => /* wgsl */ `
fn ${varName}(normal: vec3<f32>, viewDir: vec3<f32>, power: f32) -> ${typeClass} {
  return pow( (1.0 - clamp(dot(normalize(normal), normalize(viewDir)), 0.0, 1.0) ), power);
}`;
    const fnVarName = compiler.setContext('defineFns', node, node.data.outValueType, codeFn);

    if (!normalVar) normalVar = NormalRC.initNormalContext(compiler, 'world');
    if (!viewDirVar) viewDirVar = ViewDirectionRC.initViewDirectionContext(compiler, 'world');

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVarName}(${normalVar}, ${viewDirVar}, ${powerVar});`,
    };
  }
}
