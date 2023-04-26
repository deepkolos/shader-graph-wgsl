import type { SGNodeOutput, ShaderGraphCompiler } from '../compilers';
import { SGNodeData, SGNodes } from '../editors';
import { MaybePromise, Rete, ReteNode } from '../types';

export abstract class RC extends Rete.Component {
  data: { component?: any } = {};
  nodeLayout: Pick<ReteNode, 'data' | 'meta'>;

  constructor(name: string) {
    super(name);

    const nodeLayout = { data: {}, meta: {} } as ReteNode;
    Object.setPrototypeOf(nodeLayout, Rete.Node.prototype);
    this.initNode(nodeLayout);
    this.nodeLayout = nodeLayout;
  }

  abstract initNode(node: Rete.Node): void | Promise<void>;

  // !!! 设计为纯函数, 编译器方可脱离editor工作 !!!
  compileSG?(compiler: ShaderGraphCompiler, node: SGNodeData<SGNodes>): MaybePromise<SGNodeOutput>;
}

export abstract class RCBlock extends RC {
  onAddToContextNode?(contextNode: Rete.Node, blockNode: Rete.Node): void;
}
