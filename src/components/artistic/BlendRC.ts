import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, ArrayElement } from '../../types';
import { NodeView, DynamicControl, SelectControl } from '../../view';
import { RC } from '../ReteComponent';

const ModeOptions = [
  'Burn',
  'Darken',
  'Difference',
  'Dodge',
  'Divide',
  'Exclusion',
  'HardLight',
  'HardMix',
  'Lighten',
  'LinearBurn',
  'LinearDodge',
  'LinearLight',
  'LinearLightAddSub',
  'Multiply',
  'Negation',
  'Overlay',
  'PinLight',
  'Screen',
  'SoftLight',
  'Subtract',
  'VividLight',
  'Overwrite',
] as const;
type ModeValueType = ArrayElement<typeof ModeOptions>;

export type ReteBlendNode = ExtendReteNode<
  'Blend',
  {
    baseValue: number | number[];
    baseValueType: ValueType;
    blendValue: number | number[];
    blendValueType: ValueType;
    opacityValue: number;
    opacityValueType: ValueType.float;
    outValue: number | number[];
    outValueType: ValueType;
    modeValue: ModeValueType;
  }
>;

export class BlendRC extends RC {
  static Name = 'Blend';
  constructor() {
    super(BlendRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteBlendNode) {
    const { data, meta } = node;
    node.initValueType('base', 0, ValueType.float);
    node.initValueType('blend', 0, ValueType.float);
    node.initValueType('opacity', 0, ValueType.float);
    node.initValueType('mode', 'Overlay', ValueType.string);
    node.initValueType('out', 0, ValueType.float);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.keywords = ModeOptions as any;
    meta.category = 'artistic/blend';
  }

  async builder(node: ReteBlendNode) {
    this.initNode(node);

    node
      .addInput(new Rete.Input('base', 'Base', Sockets.dynamicVector).addControl(new DynamicControl('base', node)))
      .addInput(new Rete.Input('blend', 'Blend', Sockets.dynamicVector).addControl(new DynamicControl('blend', node)))
      .addInput(new Rete.Input('opacity', 'Opacity', Sockets.float).addControl(new DynamicControl('opacity', node)))
      .addOutput(new Rete.Output('out', 'Out', Sockets.dynamicVector))
      .addControl(new SelectControl('mode', node, 'Mode', ModeOptions as any, false));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteBlendNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'blend');
    const [opacityVar, blendVar, baseVar] = compiler.getInputVarCovertedArray(node, ['opacity', 'blend', 'base']);
    const mode = node.data.modeValue;

    let mixMidVar = '';
    let code = '';

    if (mode === 'Burn') {
      mixMidVar = `1.0 - (1.0 - ${blendVar}) / (${baseVar} + 0.000000000001)`;
    } else if (mode === 'Darken') {
      mixMidVar = `min(${blendVar}, ${baseVar})`;
    } else if (mode === 'Difference') {
      mixMidVar = `abs(${blendVar} - ${baseVar})`;
    } else if (mode === 'Dodge') {
      mixMidVar = `${baseVar} / (1.0 - clamp(${blendVar}, 0.000001, 0.999999))`;
    } else if (mode === 'Divide') {
      mixMidVar = `${baseVar} / (${blendVar} + 0.000000000001)`;
    } else if (mode === 'Exclusion') {
      mixMidVar = `${blendVar} + ${baseVar} - (2.0 * ${blendVar} * ${baseVar})`;
    } else if (mode === 'HardLight' || mode === 'Overlay') {
      code = `
  let ${outVar}_result1 = 1.0 - 2.0 * (1.0 - ${baseVar}) * (1.0 - ${blendVar});
  let ${outVar}_result2 = 2.0 * ${baseVar} * ${blendVar};
  let ${outVar}_zeroOrOne = step(0.5, ${blendVar});
  let ${outVar} = mix(${baseVar}, ${outVar}_result2 * ${outVar}_zeroOrOne + (1.0 - ${outVar}_zeroOrOne) * ${outVar}_result1, ${opacityVar});
`;
    } else if (mode === 'HardMix') {
      mixMidVar = `step(1. - ${baseVar}, ${blendVar})`;
    } if (mode === 'Lighten') {
      mixMidVar = `max(${baseVar}, ${blendVar})`;
    } else if (mode === 'LinearBurn') {
      mixMidVar = `${baseVar} + ${blendVar} - 1.0`;
    } else if (mode === 'LinearDodge') {
      mixMidVar = `${baseVar} + ${blendVar}`;
    } else if (mode === 'LinearLight') {
      code = `
  let ${outVar}_check = step(0.5, ${blendVar});
  let ${outVar}_result1 = ${outVar}_check * max(${baseVar} + (2. * ${blendVar}) - 1., 0.);
  let ${outVar} = mix(${baseVar}, ${outVar}_result1 + (1.0 - ${outVar}_check) * min(${baseVar} + 2. * (${blendVar} - 0.5), 1.), ${opacityVar});
`;
    } else if (mode === 'LinearLightAddSub') {
      mixMidVar = `${blendVar} + 2.0 * ${baseVar} - 1.0`;
    } else if (mode === 'Multiply') {
      mixMidVar = `${blendVar} * ${baseVar}`;
    } else if (mode === 'Negation') {
      mixMidVar = `1.0 - abs(1.0 - ${blendVar} - ${baseVar})`;
    } else if (mode === 'PinLight') {
      code = `
  let ${outVar}_check = step(0.5, ${blendVar});
  let ${outVar}_result1 = ${outVar}_check * max(2.0 * (${baseVar} - 0.5), ${blendVar});
  let ${outVar} = mix(${baseVar}, ${outVar}_result1 + (1.0 - ${outVar}_check) * min(2.0 * ${baseVar}, ${blendVar}), ${opacityVar});
`;
    } else if (mode === 'Screen') {
      mixMidVar = `1.0 - (1.0 - ${blendVar}) * (1.0 - ${baseVar})`;
    } else if (mode === 'SoftLight') {
      code = `
  let ${outVar}_result1 = 2.0 * ${baseVar} * ${blendVar} + ${baseVar} * ${baseVar} * (1.0 - 2.0 * ${blendVar});
  let ${outVar}_result2 = sqrt(${baseVar}) * (2.0 * ${blendVar} - 1.0) + 2.0 * ${baseVar} * (1.0 - ${blendVar});
  let ${outVar}_zeroOrOne = step(0.5, ${blendVar});
  let ${outVar} = mix(${baseVar}, ${outVar}_result2 * ${outVar}_zeroOrOne + (1.0 - ${outVar}_zeroOrOne) * ${outVar}_result1, ${opacityVar});
`;
    } else if (mode === 'Subtract') {
      mixMidVar = `${baseVar} - ${blendVar}`;
    } else if (mode === 'VividLight') {
      code = `
  let ${outVar}_base = clamp(${baseVar}, 0.000001, 0.999999);
  let ${outVar}_result1 = 1.0 - (1.0 - ${blendVar}) / (2.0 * ${outVar}_base);
  let ${outVar}_result2 = ${blendVar} / (2.0 * (1.0 - ${outVar}_base));
  let ${outVar}_zeroOrOne = step(0.5, ${blendVar});
  let ${outVar} = mix(${outVar}_base, ${outVar}_result2 * ${outVar}_zeroOrOne + (1.0 - ${outVar}_zeroOrOne) * ${outVar}_result1, ${opacityVar});
`;
    } else if (mode === 'Overwrite') {
      mixMidVar = `${blendVar}`;
    }

    return {
      outputs: { out: outVar },
      code: code || `let ${outVar} = mix(${baseVar}, ${mixMidVar}, ${opacityVar});`,
    };
  }
}
