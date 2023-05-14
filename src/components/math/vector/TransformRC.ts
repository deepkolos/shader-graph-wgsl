import { NodeView, DynamicControl, SelectControl, SelectDualControl } from '../../../view';
import { Sockets } from '../../../sockets';
import { ArrayElement, ExtendReteNode, Rete, ValueType } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { TransformationMatrixRC } from '../../input';

const TypeOptions = ['position', 'direction'] as const;
const SpaceOptions = ['object', 'view', 'world', 'tangent'] as const;
type TypeValue = ArrayElement<typeof TypeOptions>;
type SpaceValue = ArrayElement<typeof SpaceOptions>;

export type ReteTransformNode = ExtendReteNode<
  'Transform',
  {
    inValue: number[];
    inValueType: ValueType.vec3;
    outValue: number[];
    outValueType: ValueType.vec3;
    typeValue: TypeValue;
    typeValueType: ValueType.string;
    inSpaceValue: SpaceValue;
    inSpaceValueType: ValueType.string;
    outSpaceValue: SpaceValue;
    outSpaceValueType: ValueType.string;
  }
>;

export class TransformRC extends RC {
  constructor() {
    super('Transform');
    this.data.component = NodeView;
  }

  initNode(node: ReteTransformNode) {
    const { data, meta } = node;
    node.initValueType('in', [0, 0, 0], ValueType.vec3);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('type', TypeOptions[0], ValueType.string);
    node.initValueType('inSpace', SpaceOptions[0], ValueType.string);
    node.initValueType('outSpace', SpaceOptions[2], ValueType.string);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'math/vector';
  }

  async builder(node: ReteTransformNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.vec3);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);

    a.addControl(new DynamicControl('in', node));
    node
      .addOutput(out)
      .addInput(a)
      .addControl(new SelectDualControl(node, 'inSpace', 'outSpace', SpaceOptions as any, SpaceOptions as any))
      .addControl(new SelectControl('type', node, 'Type', TypeOptions as any, false));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteTransformNode>): SGNodeOutput {
    const inVar = compiler.getInputVarConverted(node, 'in');
    const inSpace = node.data.inSpaceValue;
    const outSpace = node.data.outSpaceValue;
    const combine = `${inSpace}_to_${outSpace}`;

    // space 相同直接转发inVar即可
    if (inSpace === outSpace) return { outputs: { out: inVar }, code: '' };

    const outVar = compiler.getOutVarName(node, 'out', 'transform');
    const typeClass = compiler.getTypeClass(node.data.outValueType);
    const Mat = (type: Parameters<typeof TransformationMatrixRC.initMatrixContext>['1']) =>
      TransformationMatrixRC.initMatrixContext(compiler, type);
    const w = node.data.typeValue === 'position' ? '1.0' : '0.0';
    const vec4Var = `vec4<f32>(${inVar}, ${w})`;

    // TODO tangent

    let varCode = `${typeClass}(0)`;
    if (combine === 'object_to_world') {
      varCode = `${Mat('Model')} * ${vec4Var}`;
    }
    if (combine === 'object_to_view') {
      varCode = `${Mat('I_View')} * ${Mat('Model')} * ${vec4Var}`;
    }
    if (combine === 'object_to_tangent') {
    }

    if (combine === 'world_to_object') {
      varCode = `${Mat('I_Model')} * ${vec4Var}`;
    }
    if (combine === 'world_to_view') {
      varCode = `${Mat('I_View')} * ${vec4Var}`;
    }
    if (combine === 'world_to_tangent') {
    }

    if (combine === 'view_to_object') {
      varCode = `${Mat('I_Model')} * ${Mat('View')} * ${vec4Var}`;
    }
    if (combine === 'view_to_world') {
      varCode = `${Mat('View')} * ${vec4Var}`;
    }
    if (combine === 'view_to_tangent') {
    }

    if (combine === 'tangent_to_object') {
    }
    if (combine === 'tangent_to_world') {
    }
    if (combine === 'tangent_to_view') {
    }

    return {
      outputs: { out: outVar },
      code: `let ${outVar} = (${varCode}).xyz;`,
    };
  }
}
