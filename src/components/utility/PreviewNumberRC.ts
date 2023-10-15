import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, VectorValueType } from '../../types';
import { NodeView, DynamicControl } from '../../view';
import { UVRC } from '../input';
import { RC } from '../ReteComponent';

export type RetePreviewNumberNode = ExtendReteNode<
  'PreviewNumber',
  {
    inValue: number | number[];
    inValueType: VectorValueType;
    outValue: number | number[];
    outValueType: VectorValueType;
  }
>;

export class PreviewNumberRC extends RC {
  constructor() {
    super('PreviewNumber');
    this.data.component = NodeView;
  }

  initNode(node: RetePreviewNumberNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = 'utility';
    meta.label = 'Preview Number';
  }

  async builder(node: RetePreviewNumberNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);

    a.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<RetePreviewNumberNode>): SGNodeOutput {
    const fnBaseVar = compiler.setContext(
      'defines',
      node,
      'base',
      varName => /* wgsl */ `
// Smaller Number Printing - @P_Malin
// Creative Commons CC0 1.0 Universal (CC-0)

// Feel free to modify, distribute or use in commercial code, just don't hold me liable for anything bad that happens!
// If you use this code and want to give credit, that would be nice but you don't have to.

// I first made this number printing code in https://www.shadertoy.com/view/4sf3RN
// It started as a silly way of representing digits with rectangles.
// As people started actually using this in a number of places I thought I would try to condense the 
// useful function a little so that it can be dropped into other shaders more easily,
// just snip between the perforations below.
// Also, the licence on the previous shader was a bit restrictive for utility code.
//
// Disclaimer: The values printed may not be accurate!
// Accuracy improvement for fractional values taken from TimoKinnunen https://www.shadertoy.com/view/lt3GRj

// ---- 8< ---- GLSL Number Printing - @P_Malin ---- 8< ----
// Creative Commons CC0 1.0 Universal (CC-0) 
// https://www.shadertoy.com/view/4sBSWW

const ${varName}_DigitBin = array(
  480599.0,
  139810.0,
  476951.0,
  476999.0,
  350020.0,
  464711.0,
  464727.0,
  476228.0,
  481111.0,
  481095.0,
);

fn ${varName}_PrintValue( vStringCoords: vec2f, fValue_: f32, fMaxDigits: f32, fDecimalPlaces: f32 ) -> f32 {       
  if ((vStringCoords.y < 0.0) || (vStringCoords.y >= 1.0)) { 
    return 0.0;
  }
  
  let bNeg = ( fValue_ < 0.0 );
	let fValue = abs(fValue_);
    
	let fLog10Value = log2(abs(fValue)) / log2(10.0);
	let fBiggestIndex = max(floor(fLog10Value), 0.0);
	var fDigitIndex = fMaxDigits - floor(vStringCoords.x);
	var fCharBin = 0.0;
	if (fDigitIndex > (-fDecimalPlaces - 1.01)) {
		if (fDigitIndex > fBiggestIndex) {
			if ((bNeg) && (fDigitIndex < (fBiggestIndex+1.5))) { 
        fCharBin = 1792.0;
      }
		} else {		
			if (fDigitIndex == -1.0) {
				if (fDecimalPlaces > 0.0) { 
          fCharBin = 2.0;
        }
			} else {
        var fReducedRangeValue = fValue;
        if (fDigitIndex < 0.0) {
          fReducedRangeValue = fract( fValue ); fDigitIndex += 1.0;
        }
				let fDigitValue = (abs(fReducedRangeValue / (pow(10.0, fDigitIndex))));
        fCharBin = ${varName}_DigitBin[u32(floor(fDigitValue % 10.0))];
			}
    }
	}

  return floor((fCharBin / pow(2.0, floor(fract(vStringCoords.x) * 4.0) + (floor(vStringCoords.y * 5.0) * 4.0)) % 2.0));
}`,
    );
    const colorMap = {
      [ValueType.float]: 'vec3f(0.6627450980392157, 0.8784313725490196, 0.8941176470588236)',
      [ValueType.vec2]: 'vec3f(0.7294117647058823, 0.9137254901960784, 0.6392156862745098)',
      [ValueType.vec3]: 'vec3f(0.9764705882352941, 0.9882352941176471, 0.6901960784313725)',
      [ValueType.vec4]: 'vec3f(0.9294117647058824, 0.807843137254902, 0.9372549019607843)',
    };

    const print = (offset: string, suffix: string) =>
      /* wgsl */ `vColour = mix( vColour, fontColor, ${fnBaseVar}_PrintValue( (fragCoord - vec2f(${offset})) / vFontSize, value${suffix}, fDigits, fDecimalPlaces));`;
    // prettier-ignore
    const printCodeMap = {
      [ValueType.float]: print('-40, 45.0', ''),
      [ValueType.vec2]: print('-40, 55.0', '.x') + print('-40, 35.0', '.y'),
      [ValueType.vec3]: print('-40, 65.0', '.x') + print('-40, 45.0', '.y') + print('-40, 25.0', '.z'),
      [ValueType.vec4]: print('-40, 75.0', '.x') + print('-40, 55.0', '.y') + print('-40, 35.0', '.z') + print('-40, 15.0', '.w'),
    };
    const fnVar = compiler.setContext(
      'defines',
      node,
      node.data.inValueType,
      varName => /* wgsl */ `
fn ${varName}(uv: vec2f, value: ${compiler.getTypeClass(node.data.inValueType)}) -> vec3f{
  let fragCoord = uv * 100.0;
  var vColour = vec3f(0.0);
  let fontColor = ${colorMap[node.data.inValueType]};
  let vFontSize = vec2f(10.0, 15.0); // Multiples of 4x5 work best
  let fDecimalPlaces = 3.0;
  let fDigits = 7.0;

  // Print Value
  ${printCodeMap[node.data.inValueType]}

  return vColour;
}`,
    );
    const inVar = compiler.getInputVarConverted(node, 'in');
    const outVar = compiler.getOutVarName(node, 'out');
    const uvVar = UVRC.initUVContext(compiler);
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${fnVar}(${uvVar}, ${inVar});`,
    };
  }
}
