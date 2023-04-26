import { Sockets } from '../../sockets';
import { Rete, ValueType, ExtendReteContext } from '../../types';
import { ContextView } from '../../view';
import { RC } from '../ReteComponent';
import {
  AlphaBlock,
  AlphaClipBlock,
  AOBlock,
  BaseColorBlock,
  CoatMaskBlock,
  CoatSmoothnessBlock,
  EmissionBlock,
  MetallicBlock,
  NormalTangentSpaceBlock,
  SmoothnessBlock,
} from '../blocks';
import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData, SGNodes } from '../../editors';

const blockComponents: string[] = /*#__PURE__*/ [
  AOBlock.Name,
  BaseColorBlock.Name,
  MetallicBlock.Name,
  SmoothnessBlock.Name,
  EmissionBlock.Name,
  NormalTangentSpaceBlock.Name,
  AlphaBlock.Name,
  AlphaClipBlock.Name,
  CoatMaskBlock.Name,
  CoatSmoothnessBlock.Name,
];

export type ReteFragmentContext = ExtendReteContext<'Fragment', { vertValue: 0; vertValueType: ValueType.vertex }>;

const UnlitBlocks = [BaseColorBlock.Name, AlphaBlock.Name] as const;
const LitBlocks = [
  AOBlock.Name,
  BaseColorBlock.Name,
  AlphaBlock.Name,
  MetallicBlock.Name,
  SmoothnessBlock.Name,
  EmissionBlock.Name,
  NormalTangentSpaceBlock.Name,
] as const;
const BlockWeights = {
  [AlphaClipBlock.Name]: 1,
};

export class FragmentRC extends RC {
  static Name = 'Fragment';
  constructor() {
    super(FragmentRC.Name);
    this.data.component = ContextView;
  }

  async initNode(node: ReteFragmentContext) {
    const { data, meta } = node;
    node.initValueType('vert', 0, ValueType.vertex);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = true;
    meta.previewDisabled = true;
    meta.undeleteable = true;
    meta.blockComponents = blockComponents;
  }

  async builder(node: ReteFragmentContext) {
    await this.initNode(node);
    const vert = new Rete.Input('vert', 'Vert', Sockets.vertex);
    node.addInput(vert);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteFragmentContext>): SGNodeOutput {
    const { template, alphaClipping } = compiler.graphData.setting;

    let blockIncludes: string[] = [];
    if (template === 'lit') blockIncludes = [...LitBlocks];
    else if (template == 'unlit' || template === 'subgraph') blockIncludes = [...UnlitBlocks];

    if (alphaClipping) blockIncludes.push(AlphaClipBlock.Name);

    let blocks: SGNodeData<SGNodes>['blocks'] = node.blocks
      .filter(i => blockIncludes.includes(i.name))
      .sort((a, b) => (BlockWeights[b.name] || 0) - (BlockWeights[a.name] || 0));

    return { outputs: {}, code: compiler.linkBlocks(blocks) };
  }
}
