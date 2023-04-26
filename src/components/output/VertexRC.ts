import { Rete, ValueType, ExtendReteContext } from '../../types';
import { RC } from '../ReteComponent';
import { PositionBlock, NormalBlock, TangentBlock, CustomInterpolatorBlock } from '../blocks';
import { Sockets } from '../../sockets';
import { ContextView } from '../../view';
import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';

const blockComponents: string[] /*#__PURE__*/ = [PositionBlock.Name, NormalBlock.Name, TangentBlock.Name, CustomInterpolatorBlock.Name];

export type ReteVertexContext = ExtendReteContext<'Vertex', { vertValue: 0; vertValueType: ValueType.vertex }>;

export class VertexRC extends RC {
  static Name = 'Vertex';
  constructor() {
    super(VertexRC.Name);
    this.data.component = ContextView;
  }

  async initNode(node: ReteVertexContext) {
    const { data, meta } = node;
    node.initValueType('vert', 0, ValueType.vertex);
    data.expanded ??= true;
    meta.category = '';
    meta.isContext = true;
    meta.previewDisabled = true;
    meta.undeleteable = true;
    meta.blockComponents = blockComponents;
  }

  async builder(node: ReteVertexContext) {
    await this.initNode(node);
    const vert = new Rete.Output('vert', 'Vert', Sockets.vertex);
    node.addOutput(vert);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteVertexContext>): SGNodeOutput {
    const template = compiler.graphData.setting.template;
    if (template !== 'lit' && template !== 'unlit' && template !== 'subgraph') throw new Error('template none support');
    return { outputs: {}, code: compiler.linkBlocks(node.blocks) };
  }
}
