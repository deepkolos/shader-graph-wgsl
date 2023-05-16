import { Component } from '../engine/component';
import { Control } from '../control';
import { ControlView } from './control';
import { Emitter } from '../core/emitter';
import { EventsTypes } from '../events';
import { IO } from '../io';
import { Node } from '../node';
import { SocketView } from './socket';
import { NodeView } from './node';
import { listen, rebind } from './utils';
import { Drag } from './drag';

export class BlockView extends Emitter<EventsTypes> {
  node: Node;
  component: Component;
  sockets = new Map<IO, SocketView>();
  controls = new Map<Control, ControlView>();

  el: HTMLElement;
  contextView: NodeView;
  disposeListener!: () => void;
  drag!: Drag;

  dragInfo?: { centerYs: number[]; siblings: Element[]; nextIndex: number };

  constructor(el: HTMLElement, node: Node, component: Component, contextView: NodeView) {
    super(contextView);

    this.node = node;
    this.component = component;
    this.contextView = contextView;
    this.el = el;
    this.onRebind(el, true);
  }

  onRebind(el = this.el, force = false) {
    if (el !== this.el || force) {
      this.drag?.destroy();
      this.disposeListener?.();
      this.el = el;
      this.drag = new Drag(el, this.onTranslate, this.onSelect, this.onDragEnd);
      this.disposeListener = listen(this.el, 'contextmenu', e =>
        this.trigger('contextmenu', { e, node: this.node }),
      );
      setTimeout(() => {
        this.trigger('rendernode', {
          el: this.el,
          node: this.node,
          view: this,
          component: this.component.data,
          bindSocket: this.bindSocket,
          bindControl: this.bindControl,
        });
      })
    }
  }

  clearSockets() {
    const ios: IO[] = [...this.node.inputs.values(), ...this.node.outputs.values()];

    this.sockets.forEach(s => {
      if (!ios.includes(s.io)) this.sockets.delete(s.io);
    });
  }

  bindSocket = (el: HTMLElement, type: string, io: IO) => {
    this.clearSockets();
    rebind(this.sockets, io, el, () => new SocketView(el, type, io, this.node, this));
  };

  bindControl = (el: HTMLElement, control: Control) => {
    rebind(this.controls, control, el, () => new ControlView(el, control, this));
  };

  hasSocket(io: IO) {
    return this.sockets.has(io);
  }

  getSocketPosition(io: IO) {
    const socket = this.sockets.get(io);

    if (!socket) throw new Error(`Socket not found for ${io.name} with key ${io.key}`);

    return socket.getPosition(this.contextView.node, this.contextView.el);
  }

  onSelect = (e: MouseEvent) => {
    const payload = { node: this.node, accumulate: e.ctrlKey, e };

    this.onStart();
    this.trigger('multiselectnode', payload);
    this.trigger('selectnode', payload);
  };

  onStart = () => {
    const siblings = [...(this.el.parentElement!.children as any)];
    const centerYs = siblings.map(i => {
      // 计算出中线cy
      const rect = i.getBoundingClientRect();
      return rect.y + rect.height * 0.5;
    });
    this.dragInfo = { siblings, centerYs, nextIndex: -1 };
  };

  onTranslate = (dx: number, dy: number, e: PointerEvent) => {
    if (!this.dragInfo) return;

    const { siblings, centerYs } = this.dragInfo;
    const y = e.clientY;
    let nextIndex = 0;
    for (; nextIndex < centerYs.length; nextIndex++) {
      if (y < centerYs[nextIndex]) break;
    }
    siblings.forEach((el, i) =>
      el.setAttribute('data-indicator-show', i === nextIndex ? 'top' : 'none'),
    );
    if (nextIndex === centerYs.length) {
      siblings[nextIndex - 1].setAttribute('data-indicator-show', 'bottom');
    }
    this.dragInfo.nextIndex = nextIndex;
  };

  onDragEnd = (e: PointerEvent) => {
    if (!this.dragInfo) return;
    const { nextIndex, siblings } = this.dragInfo;
    if (nextIndex === -1) return;
    const contextNode = this.node.contextNode!;
    const index = contextNode.blocks.indexOf(this.node);

    siblings[Math.min(nextIndex, siblings.length - 1)].setAttribute('data-indicator-show', 'none');
    if (nextIndex - index > 1) {
      contextNode!.blocks.splice(index, 1);
      contextNode!.blocks.splice(nextIndex - 1, 0, this.node);
    } else if (index > nextIndex) {
      contextNode!.blocks.splice(index, 1);
      contextNode!.blocks.splice(nextIndex, 0, this.node);
    }
    contextNode.update();
    this.dragInfo = undefined;
  };

  dispose = () => {
    this.drag?.destroy();
    this.disposeListener?.();
    (this as any).contextView = undefined;
    (this.node as any).update = undefined;
    this.trigger('disposenode', { el: this.el });
    this.sockets.forEach(view => view.dispose());
    this.controls.forEach(view => view.dispose());
    this.sockets.clear();
    this.controls.clear();
  };
}
