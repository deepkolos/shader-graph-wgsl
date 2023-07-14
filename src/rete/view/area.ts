import { Drag } from './drag';
import { Emitter } from '../core/emitter';
import { EventsTypes } from '../events';
import { Zoom } from './zoom';
import { clamp, getOffset, listen } from './utils';
import { EditorView } from '.';
import { Box2, Vector2 } from 'three';

const V2 = new Vector2();

export interface Transform {
  k: number;
  x: number;
  y: number;
}
export interface Mouse {
  x: number;
  y: number;
}
export type ZoomSource = 'wheel' | 'touch' | 'dblclick';

export class Area extends Emitter<EventsTypes> {
  el: HTMLElement;
  container: HTMLElement;
  selectRectEl: HTMLDivElement;
  transform: Transform = { k: 1, x: 0, y: 0 };
  mouse: Mouse = { x: 0, y: 0 };

  private _startPosition: Transform | null = null;
  private _zoom: Zoom;
  private _drag: Drag;
  private _dragMode?: boolean;
  private _startSelect?: { cX: number; cY: number; pX: number; pY: number; canParentX: number; canParentY: number };
  private _selectBox = new Box2();

  constructor(container: HTMLElement, public editor: EditorView) {
    super(editor);

    const el = (this.el = document.createElement('div'));
    this.selectRectEl = document.createElement('div');
    this.selectRectEl.classList.add('rete-area-select');
    this.container = container;
    el.style.transformOrigin = '0 0';
    container.appendChild(this.selectRectEl);

    this._zoom = new Zoom(container, el, 0.1, this.onZoom);
    this._drag = new Drag(container, this.onTranslate, this.onStart, this.onEnd);

    editor.on('destroy', () => {
      this._zoom.destroy();
      this._drag.destroy();
      container.removeChild(this.selectRectEl);
    });
    editor.on('destroy', listen(container, 'pointermove', this.pointermove));

    this.update();
  }

  update() {
    const t = this.transform;

    this.el.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.k})`;
  }

  pointermove = (e: PointerEvent) => {
    const { clientX, clientY } = e;
    const rect = this.el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const k = this.transform.k;

    this.mouse = { x: x / k, y: y / k };
    this.trigger('mousemove', { ...this.mouse }); // TODO rename on `pointermove`
  };

  onStart = (e: PointerEvent) => {
    this._startPosition = { ...this.transform };
    this._dragMode = e.altKey || e.button === 1;
    if (!this._dragMode) {
      const { x: parentX, y: parentY } = getOffset(this.container, document.body, Infinity);
      const { x: canParentX, y: canParentY } = getOffset(this.el, document.body, Infinity);
      this._startSelect = { cX: e.clientX, cY: e.clientY, pX: parentX, pY: parentY, canParentX, canParentY };
      this.selectRectEl.classList.add('rete-area-select-active');
      this.editor.nodes.forEach(node => node.updateBox());
      this.updateSelectRect(e);
    }
  };

  onTranslate = (dx: number, dy: number, e: PointerEvent) => {
    if (this._dragMode) {
      if (this._zoom.translating) return; // lock translation while zoom on multitouch
      if (this._startPosition) this.translate(this._startPosition.x + dx, this._startPosition.y + dy);
    } else {
      this.updateSelectRect(e);
    }
  };

  onEnd = (e: PointerEvent) => {
    if (this._startSelect) {
      const { cX, cY } = this._startSelect;
      const { clientX: x, clientY: y } = e;
      this._selectBox.makeEmpty();
      this._selectBox.expandByPoint(V2.fromArray([x, y]));
      this._selectBox.expandByPoint(V2.fromArray([cX, cY]));
      // 遍历节点
      let accumulate = false;
      this.editor.nodes.forEach(nodeView => {
        if (this._selectBox.intersectsBox(nodeView.boundingBox) || this._selectBox.containsBox(nodeView.boundingBox)) {
          this.editor.editor.selectNode(nodeView.node, accumulate, true);
          accumulate = true;
        }
      });
      if (!accumulate) this.editor.editor.unselect();
    }
    this.selectRectEl.classList.remove('rete-area-select-active');
    delete this._startSelect;
  };

  onZoom = (delta: number, ox: number, oy: number, source: ZoomSource) => {
    if (this._startSelect) return;
    const zoom = clamp(this.transform.k * (1 + delta), 0.2, 2.5);
    this.zoom(zoom, ox, oy, source);
    this.update();
  };

  updateSelectRect(e: PointerEvent) {
    if (!this._startSelect) return;
    const { cX, cY, pX, pY } = this._startSelect;
    const rectEl = this.selectRectEl;
    const { clientX: x, clientY: y } = e;
    const mX = Math.min(cX, x);
    const mY = Math.min(cY, y);
    rectEl.style.top = `${mY - pY}px`;
    rectEl.style.left = `${mX - pX}px`;
    rectEl.style.width = `${Math.abs(x - cX)}px`;
    rectEl.style.height = `${Math.abs(y - cY)}px`;
  }

  convertToGraphSpace(screenSpace: [number, number]): [number, number] {
    const [sx, sy] = screenSpace;
    let parentX = 0;
    let parentY = 0;
    if (this._startSelect) {
      parentX = this._startSelect.canParentX;
      parentY = this._startSelect.canParentY;
    } else {
      ({ x: parentX, y: parentY } = getOffset(this.el, document.body, Infinity));
    }
    const { k: scale, x: tx, y: ty } = this.transform;
    const domX = sx - parentX;
    const domY = sy - parentY;
    const gx = (domX - tx) / scale;
    const gy = (domY - ty) / scale;
    return [gx, gy];
  }

  // convertToSpaceSpace(graphSpace: [number, number]): [number, number] {
  // }

  translate(x: number, y: number) {
    const params = { transform: this.transform, x, y };

    if (!this.trigger('translate', params)) return;

    this.transform.x = params.x;
    this.transform.y = params.y;

    this.update();
    this.trigger('translated');
  }

  zoom(zoom: number, ox = 0, oy = 0, source: ZoomSource) {
    const k = this.transform.k;
    const params = { transform: this.transform, zoom, source };

    if (!this.trigger('zoom', params)) return;

    const d = (k - params.zoom) / (k - zoom || 1);

    this.transform.k = params.zoom || 1;
    this.transform.x += ox * d;
    this.transform.y += oy * d;

    this.update();
    this.trigger('zoomed', { source });
  }

  appendChild(el: HTMLElement) {
    this.el.appendChild(el);
  }

  removeChild(el: HTMLElement) {
    this.el.removeChild(el);
  }
}
