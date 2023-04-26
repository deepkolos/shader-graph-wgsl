import { Output, Input, Emitter } from '../../../rete';
import { EditorView } from '../../../rete/view/index';
import { EventsTypes } from '../../../rete/events';
import { renderConnection, renderPathData, updateConnection } from '../utils';

export class PickerView {
  private el: HTMLElement;

  constructor(private emitter: Emitter<EventsTypes>, private editorView: EditorView) {
    this.el = document.createElement('div');
    this.el.style.position = 'absolute';
    this.editorView.area.appendChild(this.el);
  }

  updatePseudoConnection(io: Output | Input | null) {
    if (io !== null) {
      this.renderConnection(io);
    } else if (this.el.parentElement) {
      this.el.innerHTML = '';
    }
  }

  private getPoints(io: Output | Input): number[] {
    const mouse = this.editorView.area.mouse;

    if (!io.node) throw new Error('Node in output/input not found');
    let x1: number, y1: number;
    if (io.node.contextNode) {
      const context = this.editorView.nodes.get(io.node.contextNode);
      if (!context) throw new Error('Context view not found');
      const block = context.blocks.get(io.node);
      if (!block) throw new Error('Block view not found');

      [x1, y1] = block.getSocketPosition(io);
    } else {
      const node = this.editorView.nodes.get(io.node);

      if (!node) throw new Error('Node view not found');

      [x1, y1] = node.getSocketPosition(io);
    }

    return io instanceof Output ? [x1, y1, mouse.x, mouse.y] : [mouse.x, mouse.y, x1, y1];
  }

  updateConnection(io: Output | Input) {
    const d = renderPathData(this.emitter, this.getPoints(io), undefined, io);

    updateConnection({ el: this.el, d });
  }

  renderConnection(io: Output | Input) {
    const d = renderPathData(this.emitter, this.getPoints(io), undefined, io);

    renderConnection({ el: this.el, d, io, editorView: this.editorView });
  }
}
