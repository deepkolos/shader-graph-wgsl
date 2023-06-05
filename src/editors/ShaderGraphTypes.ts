import {
  ReteCustomInterpolatorBlock,
  ReteNormalBlock,
  ReteTangentBlock,
  RetePositionBlock,
  ReteAOBlock,
  ReteBaseColorBlock,
  ReteEmissionBlock,
  ReteSmoothnessBlock,
  ReteNormalTSBlock,
  ReteMetallicBlock,
  ReteColorNode,
  ReteTimeNode,
  ReteConstantNode,
  ReteFloatNode,
  ReteVec2Node,
  ReteVec3Node,
  ReteVec4Node,
  ReteAddNode,
  ReteParameterNode,
  ReteVertexContext,
  ReteFragmentContext,
  ReteSubtractNode,
  ReteDivideNode,
  ReteVaryingNode,
  ReteTexture2DAssetNode,
  ReteSampleTexture2DNode,
  ReteUVNode,
  ReteAlphaBlock,
  ReteAlphaClipBlock,
  ReteSineNode,
  ReteCosineNode,
  ReteArccosineNode,
  ReteArcsineNode,
  ReteArctangentNode,
  ReteArctangent2Node,
  ReteHyperbolicCosineNode,
  ReteHyperbolicSineNode,
  ReteHyperbolicTangentNode,
  ReteDegreesToRadiansNode,
  ReteRadiansToDegreesNode,
  ReteTangentNode,
  RetePowerNode,
  ReteSquareRootNode,
  ReteAbsoluteNode,
  ReteExponentialNode,
  ReteLengthNode,
  ReteLogNode,
  ReteModuloNode,
  ReteNegateNode,
  ReteNormalizeNode,
  RetePosterizeNode,
  ReteReciprocalNode,
  ReteReciprocalSquareRootNode,
  ReteDDXNode,
  ReteDDYNode,
  ReteLerpNode,
  ReteSmoothstepNode,
  ReteInverseLerpNode,
  ReteClampNode,
  ReteFractionNode,
  ReteMinimumNode,
  ReteMaximumNode,
  ReteOneMinusNode,
  ReteSaturateNode,
  ReteRemapNode,
  ReteRandomRangeNode,
  ReteCeilingNode,
  ReteFloorNode,
  ReteRoundNode,
  ReteSignNode,
  ReteTruncateNode,
  ReteStepNode,
  ReteCrossProductNode,
  ReteDistanceNode,
  ReteDotProductNode,
  ReteFresnelEffectNode,
  ReteProjectionNode,
  ReteReflectionNode,
  ReteRotateAboutAxisNode,
  ReteSphereMaskNode,
  ReteNoiseSineWaveNode,
  ReteSquareWaveNode,
  ReteSawtoothWaveNode,
  ReteTriangleWaveNode,
  ReteDDXYNode,
  ReteNormalNode,
  RetePositionNode,
  ReteViewVectorNode,
  ReteViewDirectionNode,
  ReteTransformNode,
  ReteCombineNode,
  ReteSplitNode,
  ReteSwizzleNode,
  ReteFlipNode,
  ReteCheckerboardNode,
  ReteGradientNoiseNode,
  ReteSimpleNoiseNode,
  ReteVoronoiNode,
  ReteEllipseNode,
  RetePolygonNode,
  ReteRectangleNode,
  ReteRoundedPolygonNode,
  ReteRoundedRectangleNode,
  ReteTexelSizeNode,
  ReteMultiplyNode,
  ReteTransformationMatrixNode,
  ReteMatrix4x4Node,
  ReteMatrix3x3Node,
  ReteMatrix2x2Node,
  RetePreviewNode,
  ReteCustomFunctionNode,
  ReteCoatSmoothnessBlock,
  ReteCoatMaskBlock,
  ReteOutputNode,
  ReteSubGraphNode,
  ReteChannelMixerNode,
  ReteContrastNode,
  ReteHueNode,
  ReteReplaceColorNode,
  ReteSaturationNode,
  ReteWhiteBalanceNode,
  ReteBlendNode,
  ReteColorSpaceConversionNode,
  ReteSamplerStateNode,
  RetePreviewNumberNode,
  ReteTilingAndOffsetNode,
  RetePolarCoordinatesNode,
  ReteRotateNode,
  ReteTwirlNode,
} from '../components';
import { NodeData } from '../rete/core/data';
import { Rete, ParameterData, GraphData } from '../types';
import { SettingValueCfgs } from '../view';

export type SGBlock =
  // vert
  | ReteCustomInterpolatorBlock
  | ReteNormalBlock
  | ReteTangentBlock
  | RetePositionBlock
  // frag
  | ReteAOBlock
  | ReteBaseColorBlock
  | ReteEmissionBlock
  | ReteSmoothnessBlock
  | ReteNormalTSBlock
  | ReteMetallicBlock
  | ReteAlphaClipBlock
  | ReteAlphaBlock
  | ReteCoatSmoothnessBlock
  | ReteCoatMaskBlock;
type SGContext = ReteVertexContext | ReteFragmentContext;
export type SGNodes =
  | SGContext
  | SGBlock
  | ReteOutputNode
  // input/basic
  | ReteVaryingNode
  | ReteParameterNode
  | ReteColorNode
  | ReteTimeNode
  | ReteConstantNode
  | ReteFloatNode
  | ReteVec2Node
  | ReteVec3Node
  | ReteVec4Node
  // input/texture
  | ReteTexture2DAssetNode
  | ReteSampleTexture2DNode
  | ReteTexelSizeNode
  | ReteSamplerStateNode
  // input/geometry
  | ReteUVNode
  | ReteNormalNode
  | RetePositionNode
  | ReteViewVectorNode
  | ReteViewDirectionNode
  // input/matrix
  | ReteTransformationMatrixNode
  | ReteMatrix4x4Node
  | ReteMatrix3x3Node
  | ReteMatrix2x2Node
  // math/basic
  | ReteSubtractNode
  | ReteDivideNode
  | ReteAddNode
  | RetePowerNode
  | ReteSquareRootNode
  | ReteMultiplyNode
  // math/trigonemetry
  | ReteTangentNode
  | ReteRadiansToDegreesNode
  | ReteDegreesToRadiansNode
  | ReteHyperbolicTangentNode
  | ReteHyperbolicSineNode
  | ReteHyperbolicCosineNode
  | ReteArctangent2Node
  | ReteArctangentNode
  | ReteArcsineNode
  | ReteArccosineNode
  | ReteCosineNode
  | ReteSineNode
  // math/advanced
  | ReteExponentialNode
  | ReteLengthNode
  | ReteLogNode
  | ReteModuloNode
  | ReteNegateNode
  | ReteNormalizeNode
  | RetePosterizeNode
  | ReteReciprocalNode
  | ReteReciprocalSquareRootNode
  | ReteAbsoluteNode
  // math/derivative
  | ReteDDXNode
  | ReteDDYNode
  | ReteDDXYNode
  // math/interpolation
  | ReteInverseLerpNode
  | ReteSmoothstepNode
  | ReteLerpNode
  // math/range
  | ReteClampNode
  | ReteMinimumNode
  | ReteMaximumNode
  | ReteOneMinusNode
  | ReteSaturateNode
  | ReteRemapNode
  | ReteRandomRangeNode
  | ReteFractionNode
  // math/round
  | ReteFloorNode
  | ReteRoundNode
  | ReteSignNode
  | ReteTruncateNode
  | ReteStepNode
  | ReteCeilingNode
  // math/vector
  | ReteDistanceNode
  | ReteDotProductNode
  | ReteFresnelEffectNode
  | ReteProjectionNode
  | ReteReflectionNode
  | ReteRotateAboutAxisNode
  | ReteSphereMaskNode
  | ReteCrossProductNode
  | ReteTransformNode
  // math/wave
  | ReteNoiseSineWaveNode
  | ReteSawtoothWaveNode
  | ReteTriangleWaveNode
  | ReteSquareWaveNode
  // channel
  | ReteCombineNode
  | ReteSwizzleNode
  | ReteFlipNode
  | ReteSplitNode
  // procedural
  | ReteCheckerboardNode
  | ReteGradientNoiseNode
  | ReteSimpleNoiseNode
  | ReteVoronoiNode
  | ReteEllipseNode
  | RetePolygonNode
  | ReteRectangleNode
  | ReteRoundedPolygonNode
  | ReteRoundedRectangleNode
  // utility
  | ReteCustomFunctionNode
  | ReteSubGraphNode
  | RetePreviewNode
  | RetePreviewNumberNode
  // artistic/adjustment
  | ReteChannelMixerNode
  | ReteContrastNode
  | ReteHueNode
  | ReteReplaceColorNode
  | ReteSaturationNode
  | ReteWhiteBalanceNode
  // artistic
  | ReteColorSpaceConversionNode
  | ReteBlendNode
  // uv
  | ReteTilingAndOffsetNode
  | RetePolarCoordinatesNode
  | ReteRotateNode
  | ReteTwirlNode;

export interface SGNodeData<Node extends Rete.Node> extends NodeData {
  name: Node['name'];
  data: NodeData['data'] & Node['data'];
  blocks: SGNodeData<SGBlock>[];
}

interface SGNodesData {
  [id: string]: SGNodeData<SGNodes>;
}

export interface SGSetting {
  template: 'lit' | 'unlit' | 'subgraph';
  precision: 'single' | 'float';
  allowMaterialOverride: boolean;
  surfaceType: 'opaque' | 'transparent';
  blendingMode: 'alpha' | 'premultiply' | 'additive' | 'multiply';
  renderFace: 'front' | 'back' | 'both';
  depthWrite: 'auto' | 'enable' | 'disable';
  depthTest: 'never' | 'less' | 'equal' | 'l equal' | 'greater' | 'not equal' | 'g equal' | 'always';
  alphaClipping: boolean;
  castShadows: boolean;
  clearCoat: boolean;
}

export interface ShaderGraphData extends GraphData {
  type: 'ShaderGraph' | 'SubGraph';
  version: string;
  UIState: {
    showMainPreview?: boolean;
    showBlackBoard?: boolean;
    showInspector?: boolean;
  };
  setting: SGSetting;
  parameters: Array<ParameterData>;
  nodes: SGNodesData;
}

export const DEFAULT_SETTING = (template: 'unlit' | 'lit' | 'subgraph' = 'unlit'): SGSetting => ({
  template,
  precision: 'single',
  allowMaterialOverride: false,
  surfaceType: 'opaque',
  blendingMode: 'alpha',
  renderFace: 'front',
  depthWrite: 'auto',
  depthTest: 'l equal',
  alphaClipping: false,
  castShadows: true,
  clearCoat: false,
});

export const SGSettingValueCfgs: SettingValueCfgs = {
  template: {
    options: ['lit', 'unlit'],
    excludes: {
      unlit: ['clearCoat'],
      subgraph: Object.keys(DEFAULT_SETTING()).filter(i => i !== 'precision'),
    },
  },
  precision: { options: ['single', 'float'] },
  surfaceType: {
    options: ['opaque', 'transparent'],
    excludes: {
      opaque: ['blendingMode'],
    },
  },
  renderFace: { options: ['front', 'back', 'both'] },
  depthWrite: { options: ['auto', 'enable', 'disable'] },
  depthTest: { options: ['never', 'less', 'equal', 'l equal', 'greater', 'not equal', 'g equal', 'always'] },
  blendingMode: { options: ['alpha', 'premultiply', 'additive', 'multiply'] },
};
