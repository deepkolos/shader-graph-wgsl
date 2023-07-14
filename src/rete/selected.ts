import { Box2 } from 'three';
import { NodeData } from './core/data';
import { NodeEditor } from './editor';
import { Node } from './node';

export class Selected {
  list: Node[] = [];
  copyed?: NodeData[];
  copyedBox: Box2 = new Box2();

  constructor(public editor: NodeEditor) {}

  add(item: Node, accumulate = false) {
    if (!accumulate) this.list = [item];
    else if (!this.contains(item)) this.list.push(item);
  }

  clear() {
    this.list = [];
  }

  remove(item: Node) {
    this.list.splice(this.list.indexOf(item), 1);
  }

  contains(item: Node) {
    return this.list.indexOf(item) !== -1;
  }

  each(callback: (n: Node, index: number) => void) {
    this.list.forEach(callback);
  }

  copy() {
    const list = this.list.filter(i => !i.meta.undeleteable);
    const { copyedBox, editor } = this;
    copyedBox.makeEmpty();
    this.copyed = list.map(i => {
      const data = i.toJSON();

      const nodeView = editor.view.nodes.get(i);
      if (nodeView) {
        nodeView.updateBox();
        copyedBox.union(nodeView.boundingBox);
      }
      return data;
    });
    const [gMinX, gMinY] = editor.view.area.convertToGraphSpace([copyedBox.min.x, copyedBox.min.y]);
    const [gMaxX, gMaxY] = editor.view.area.convertToGraphSpace([copyedBox.max.x, copyedBox.max.y]);
    copyedBox.min.set(gMinX, gMinY);
    copyedBox.max.set(gMaxX, gMaxY);
  }
}
