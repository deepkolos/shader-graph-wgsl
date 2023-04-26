import { GraphData } from '..';
import { RC } from '../components/ReteComponent';
import { deepCopy } from '../utils';

export abstract class GraphCompiler {
  graphData!: GraphData;
  nodesCompilation = new Map<number, any>();
  todo: Set<number> = new Set();
  done: Set<number> = new Set();
  ready: Set<number> = new Set();
  changed: [Set<number>, Set<number>] = [new Set(), new Set()];
  components = new Map<string, RC>();

  constructor(public fnName: 'compileSG') {}

  register(component: RC, force?: boolean) {
    if (!this.components.has(component.name) || force) this.components.set(component.name, component);
  }

  varId = 0;
  get nextVarId() {
    return this.varId++;
  }

  loopCheck(): boolean {
    return true; // TBD 编辑器层已经做了, 是否需要数据层再做
  }

  compileNode = async (nodeId: number) => {
    const node = this.graphData.nodes[nodeId];
    const comp = this.components.get(node.name);
    if (comp) this.nodesCompilation.set(nodeId, await comp[this.fnName]?.(this as any, node as any));
    else console.warn(`${node.name}'s componet doesn't register`);
  };

  async compile(graphData: GraphData): Promise<any> {
    const { todo, done, ready, changed, nodesCompilation } = this;
    [todo, done, ready, ...changed, nodesCompilation].forEach(i => i.clear());

    this.varId = 0;
    this.graphData = deepCopy(graphData);
    if (!this.loopCheck()) throw new Error('graphData has loop');

    const { nodes } = this.graphData;

    // add block to nodes map & init block map
    Object.values(nodes).forEach(node => {
      todo.add(node.id);
      node.blocks.forEach(block => {
        nodes[block.id] = block;
        todo.add(block.id);
      });
    });

    let iRead = 0;
    while (todo.size) {
      iRead = (iRead + 1) % 2;
      const changedRead = changed[iRead];
      const changedWrite = changed[(iRead + 1) % 2];
      changedWrite.clear();

      // 根据todo/changed 更新 ready
      (changedRead.size ? changedRead : todo).forEach(id => {
        const node = nodes[id];
        const inputsDone = Object.values(node.inputs).every(i => i.connections.every(con => done.has(con.node)));
        const blocksDone = node.blocks.every(block => done.has(block.id));
        if (inputsDone && blocksDone) {
          todo.delete(node.id);
          ready.add(node.id);
          Object.values(node.outputs).forEach(o => o.connections.forEach(con => changedWrite.add(con.node)));
        }
      });

      // 处理ready 更新 done
      await Promise.all([...ready].map(this.compileNode));
      ready.forEach(id => done.add(id));
      ready.clear();
    }
  }
}
