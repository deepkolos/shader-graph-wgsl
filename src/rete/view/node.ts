import { Component } from '../engine/component';
import { Control } from '../control';
import { ControlView } from './control';
import { Drag } from './drag';
import { Emitter } from '../core/emitter';
import { EventsTypes } from '../events';
import { IO } from '../io';
import { Node } from '../node';
import { SocketView } from './socket';
import { BlockView } from './block';
import { rebind } from './utils';

export class NodeView extends Emitter<EventsTypes> {
  node: Node;
  component: Component;
  components: Map<string, Component>;
  sockets = new Map<IO, SocketView>();
  controls = new Map<Control, ControlView>();
  blocks = new Map<Node, BlockView>();

  el: HTMLElement;
  protected _startPosition: number[] = [];
  protected _drag: Drag;
  resizeObserver: ResizeObserver;

  constructor(node: Node, component: Component, emitter: Emitter<EventsTypes>, components: Map<string, Component>) {
    super(emitter);

    this.node = node;
    this.component = component;
    this.components = components;
    this.el = document.createElement('div');
    this.el.style.position = 'absolute';
    this.el.classList.add('rete-node-view');
    this.el.addEventListener('contextmenu', e => this.trigger('contextmenu', { e, node: this.node }));

    this._drag = new Drag(this.el, this.onTranslate, this.onSelect.bind(this), () => {
      this.trigger('nodedraged', node);
      this.trigger('nodedragged', node);
    });

    this.trigger('rendernode', {
      el: this.el,
      node,
      view: this,
      component: component.data,
      bindSocket: this.bindSocket,
      bindControl: this.bindControl,
      bindBlock: this.bindBlock,
      callback: () => this.node.blocks.forEach(node => node.update()),
    });

    let ignoreFirstResize = true;
    this.resizeObserver = new ResizeObserver(entries => {
      if (!ignoreFirstResize) this.trigger('nodetranslated', { node, prev: node });
      ignoreFirstResize = false;
    });

    this.resizeObserver.observe(this.el);

    this.node.blocks.forEach(block => {
      this.bindBlock(document.createElement('div'), block);
    });

    this.update();
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

  bindBlock = (el: HTMLElement, node: Node) => {
    node.contextNode = this.node;
    const component = this.components.get(node.name);
    rebind(this.blocks, node, el, () => new BlockView(el, node, component!, this), true);
  };

  hasSocket(io: IO) {
    return this.sockets.has(io);
  }

  getSocketPosition(io: IO) {
    const socket = this.sockets.get(io);

    if (!socket) throw new Error(`Socket not found for ${io.name} with key ${io.key}`);

    return socket.getPosition(this.node, this.el);
  }

  onSelect = (e: MouseEvent) => {
    const payload = { node: this.node, accumulate: e.ctrlKey, e };

    this.onStart();
    this.trigger('multiselectnode', payload);
    this.trigger('selectnode', payload);
  };

  onStart = () => {
    this._startPosition = [...this.node.position];
  };

  onTranslate = (dx: number, dy: number) => {
    this.trigger('translatenode', { node: this.node, dx, dy });
    this.blocks.forEach((blockView, block) => {
      this.trigger('translatenode', { node: block, dx, dy });
    });
  };

  onDrag = (dx: number, dy: number) => {
    const x = this._startPosition[0] + dx;
    const y = this._startPosition[1] + dy;

    this.translate(x, y);
  };

  translate(x: number, y: number) {
    const node = this.node;
    const params = { node, x, y };

    if (!this.trigger('nodetranslate', params)) return;

    const [px, py] = node.position;
    const prev: [number, number] = [px, py];

    node.position[0] = params.x;
    node.position[1] = params.y;

    this.update();
    this.trigger('nodetranslated', { node, prev });
  }

  update() {
    const [x, y] = this.node.position;

    this.el.style.transform = `translate(${x}px, ${y}px)`;
  }

  remove() {}

  destroy() {
    this._drag.destroy();
    this.resizeObserver.unobserve(this.el);
  }
}
