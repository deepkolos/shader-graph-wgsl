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
import { listen, rebind } from './utils';
import { Box2, Vector2 } from 'three';
import { EditorView } from '.';

const V2 = new Vector2();

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
  disposeContextMenu: () => void;
  boundingBox = new Box2();
  disposeMouseEnter: () => void;
  disposeMouseLeave: () => void;

  constructor(node: Node, component: Component, public editorView: EditorView, components: Map<string, Component>) {
    super(editorView);

    this.node = node;
    this.component = component;
    this.components = components;
    this.el = document.createElement('div');
    this.el.style.position = 'absolute';
    this.el.classList.add('rete-node-view');

    this._drag = new Drag(this.el, this.onTranslate, this.onSelect.bind(this), () => {
      this.trigger('nodedraged', node);
      this.trigger('nodedragged', node);
    });

    this.disposeContextMenu = listen(this.el, 'contextmenu', e => this.trigger('contextmenu', { e, node: this.node }));
    this.disposeMouseEnter = listen(this.el, 'mouseenter', () => {
      this.trigger('nodemouseenter', this.node);
      this.node.meta.hovering = true;
    });
    this.disposeMouseLeave = listen(this.el, 'mouseleave', () => {
      this.trigger('nodemouseleave', this.node);
      this.node.meta.hovering = false;
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
      this.updateBox();
    });

    this.resizeObserver.observe(this.el);

    this.node.blocks.forEach(block => {
      this.bindBlock(document.createElement('div'), block);
    });

    this.update();
  }

  updateBox() {
    const { width, height, top, left } = this.el.getBoundingClientRect();
    this.boundingBox.makeEmpty();
    this.boundingBox.expandByPoint(V2.fromArray([left, top]));
    this.boundingBox.expandByPoint(V2.fromArray([left + width, top + height]));
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

  dispose() {
    this._drag.destroy();
    this.resizeObserver.unobserve(this.el);
    (this.node as any).update = undefined;
    this.trigger('disposenode', { el: this.el });
    this.sockets.forEach(view => view.dispose());
    this.blocks.forEach(view => view.dispose());
    this.controls.forEach(view => view.dispose());
    this.sockets.clear();
    this.blocks.clear();
    this.controls.clear();
    this.disposeContextMenu();
    this.disposeMouseEnter();
    this.disposeMouseLeave();
  }
}
