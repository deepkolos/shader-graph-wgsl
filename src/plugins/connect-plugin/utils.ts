import { ValueType, ValueTypeColorMap } from '../../types';
import { Emitter, Connection, IO } from '../../rete';
import { EventsTypes } from '../../rete/events';
import { EditorView } from '../../rete/view';

function toTrainCase(str: string) {
  return str.toLowerCase().replace(/ /g, '-');
}

export function getMapItemRecursively<T extends any>(
  map: WeakMap<Element, T>,
  el: Element,
): T | null {
  return map.get(el) || (el.parentElement ? getMapItemRecursively(map, el.parentElement) : null);
}

export function defaultNodePath(points: number[], curvature: number, offsetH: number) {
  let [x1, y1, x2, y2] = points;
  // fix svg gradient 创建直线无颜色问题...
  if (x1 === x2) x1 += 0.01;
  if (y1 === y2) y1 += 0.01;
  const hx1 = x1 + Math.abs(x2 - x1) * curvature + offsetH;
  const hx2 = x2 - Math.abs(x2 - x1) * curvature - offsetH;

  return `M ${x1} ${y1} h ${offsetH} C ${hx1} ${y1} ${hx2} ${y2} ${
    x2 - offsetH
  } ${y2} h ${offsetH}`;
}

export function defaultContextPath(points: number[], curvature: number, offsetV: number) {
  let [x1, y1, x2, y2] = points;
  // fix svg gradient 创建直线无颜色问题...
  if (y1 === y2) y1 += 0.01;
  if (x1 === x2) x1 += 0.01;
  const hy1 = y1 + Math.abs(y2 - y1) * curvature + offsetV;
  const hy2 = y2 - Math.abs(y2 - y1) * curvature - offsetV;

  return `M ${x1} ${y1} v ${offsetV} C ${x1} ${hy1} ${x2} ${hy2} ${x2} ${
    y2 - offsetV
  } v ${offsetV}`;
}

const isContext = (connection?: Connection, io?: IO) => {
  return (
    (connection && (connection.input.node?.isContext() || connection.output.node?.isContext())) ||
    io?.node?.isContext()
  );
};

export const clamp = (x: number, min = 0, max = 1) => {
  return Math.min(max, Math.max(x, min));
};

export function renderPathData(
  emitter: Emitter<EventsTypes>,
  points: number[],
  connection?: Connection,
  io?: IO,
) {
  const data = { points, connection, d: '' };

  emitter.trigger('connectionpath', data);

  if (data.d) return data.d;

  return isContext(connection, io)
    ? defaultContextPath(points, 0.15, 20)
    : defaultNodePath(points, 0.15, 20);
}

export function updateConnection({
  el,
  d,
  connection,
  updateColor,
  points,
}: {
  el: HTMLElement;
  d: string;
  connection?: Connection;
  updateColor?: boolean;
  points?: number[];
}) {
  const path = (el as any)._path as Element;
  // const pathHover = (el as any)._pathHover as Element;
  const stop1 = (el as any)._stop1 as Element;
  const stop2 = (el as any)._stop2 as Element;
  const gradient = (el as any)._gradient as SVGGradientElement;

  if (!path) throw new Error('Path of connection was broken');
  if (updateColor && connection) {
    const { input, output } = connection;
    const inputValueType = input.node!.getValueType(input.key) as ValueType;
    const outputValueType = output.node!.getValueType(output.key) as ValueType;
    stop1.setAttribute('stop-color', ValueTypeColorMap[outputValueType]);
    stop2.setAttribute('stop-color', ValueTypeColorMap[inputValueType]);
    (path as any)._connection = connection;
  }

  if (points) {
    const [x1, y1, x2, y2] = points;
    const cx = (x2 + x1) * 0.5;
    const cy = (y2 + y1) * 0.5;
    gradient.setAttribute('x1', clamp(x1 - cx - 0.5) as any);
    gradient.setAttribute('y1', clamp(y1 - cy - 0.5) as any);
    gradient.setAttribute('x2', clamp(x2 - cx - 0.5) as any);
    gradient.setAttribute('y2', clamp(y2 - cy - 0.5) as any);
  }

  path.setAttribute('d', d);
  // pathHover.setAttribute('d', d);
}

let gradientId = 0;

export function renderConnection({
  el,
  d,
  io,
  connection,
  editorView,
}: {
  el: HTMLElement;
  d: string;
  connection?: Connection;
  io?: IO;
  editorView: EditorView;
}) {
  const classed = !connection
    ? []
    : [
        'input-' + toTrainCase(connection.input.name),
        'output-' + toTrainCase(connection.output.name),
        'socket-input-' + toTrainCase(connection.input.socket.name),
        'socket-output-' + toTrainCase(connection.output.socket.name),
      ];

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  // const pathHover = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  // 会导致翻倍path数目, 看情况在使用这种方式
  svg.classList.add('connection', ...classed);
  path.classList.add('rete-connection-path');
  if (!connection) path.classList.add('disable-hover');
  // pathHover.classList.add('rete-connection-path-hover');
  path.setAttribute('d', d);
  // pathHover.setAttribute('d', d);
  // path.setAttribute('fill', 'none');
  // path.setAttribute('stroke-width', '5px');
  path.setAttribute('stroke', `url(#Gradient${gradientId})`);
  gradient.id = 'Gradient' + gradientId;

  stop1.setAttribute('offset', '0%');
  stop2.setAttribute('offset', '100%');

  if (io) {
    const valueType = io.node!.getValueType(io.key) as ValueType;
    stop1.setAttribute('stop-color', ValueTypeColorMap[valueType]);
    stop2.setAttribute('stop-color', ValueTypeColorMap[valueType]);
  }

  if (connection) {
    const { input, output } = connection;
    const inputValueType = input.node!.getValueType(input.key) as ValueType;
    const outputValueType = output.node!.getValueType(output.key) as ValueType;
    stop1.setAttribute('stop-color', ValueTypeColorMap[outputValueType]);
    stop2.setAttribute('stop-color', ValueTypeColorMap[inputValueType]);
  }

  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.appendChild(defs);
  // svg.appendChild(pathHover);
  svg.appendChild(path);
  el.appendChild(svg);

  (el as any)._path = path;
  // (el as any)._pathHover = pathHover;
  (el as any)._stop1 = stop1;
  (el as any)._stop2 = stop2;
  (el as any)._gradient = gradient;
  (el as any)._connection = connection;
  (path as any)._connection = connection;

  updateConnection({ el, d });
  gradientId++;
}
