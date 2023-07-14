import type { SGNodeOutput, ShaderGraphCompiler } from '../compilers';
import { SGNodeData, SGNodes } from '../editors';
import { Node } from '../rete';
import { MaybePromise, Rete, ReteNode } from '../types';

export abstract class RC extends Rete.Component {
  data: { component?: any } = {};
  // nodeLayout: Pick<ReteNode, 'data' | 'meta'>;
  nodeLayout: ReteNode;

  constructor(name: string) {
    super(name);

    // layout实现有待改善... 主要用于给增加菜单提供信息
    // const nodeLayout = { data: {}, meta: {} } as ReteNode;
    const nodeLayout = new Node(name) as ReteNode;
    Object.setPrototypeOf(nodeLayout, Rete.Node.prototype);
    this.builder(nodeLayout);
    this.nodeLayout = nodeLayout;
    nodeLayout.inputs.forEach(i => {
      if (i.control) {
        i.control.parent = null;
        i.control = null;
      }
    });
    nodeLayout.controls.clear();
    nodeLayout.dispose();
  }

  abstract initNode(node: Rete.Node): void | Promise<void>;

  // !!! 设计为纯函数, 编译器方可脱离editor工作 !!!
  compileSG?(compiler: ShaderGraphCompiler, node: SGNodeData<SGNodes>): MaybePromise<SGNodeOutput>;
}

export abstract class RCBlock extends RC {
  onAddToContextNode?(contextNode: Rete.Node, blockNode: Rete.Node): void;
}
