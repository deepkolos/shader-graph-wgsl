import type { NodeEditor } from '../../rete';
import { renderConnection, renderPathData, updateConnection, getMapItemRecursively } from './utils';
import { Picker } from './picker';
import { Flow, FlowParams } from './flow';
import './events';
import './index.less';
import { Plugin } from '../../rete/core/plugin';
import { listen, listenWindow } from '../../rete/view/utils';

function install(editor: NodeEditor) {
  editor.bind('connectionpath');
  editor.bind('connectiondrop');
  editor.bind('connectionpick');
  editor.bind('resetconnection');
  editor.bind('connectionselected');

  const picker = new Picker(editor);
  const flow = new Flow(picker);
  const socketsParams = new WeakMap<Element, FlowParams>();

  //#region path select
  const unselectPath = () => {
    const selectedPaths = editor.view.area.el.querySelectorAll('path.rete-connection-path.selected');
    selectedPaths.forEach(el => el.classList.remove('selected'));
  };

  const disposeClick = listen(
    editor.view.area.el,
    'click',
    e => {
      const path = e.target as HTMLElement;
      if (path.classList.contains('rete-connection-path')) {
        e.stopPropagation();
        unselectPath();
        path.classList.add('selected');
        editor.trigger('connectionselected', (path as any)._connection);
      }
    },
    true,
  );

  const disposeContextMenu = listen(
    editor.view.area.el,
    'contextmenu',
    e => {
      const path = e.target as HTMLElement;
      if (path.classList.contains('rete-connection-path')) {
        e.stopPropagation();
        // editor.trigger('connectionselected', (path as any)._connection);
        editor.trigger('contextmenu', { e, connection: (path as any)._connection });
      }
    },
    true,
  );

  editor.on(['click', 'nodeselect', 'connectionpick'], unselectPath);
  //#endregion

  let pointerDownTriggered = false;

  function pointerDown(this: HTMLElement, e: PointerEvent) {
    const flowParams = socketsParams.get(this);
    pointerDownTriggered = true;
    if (flowParams) {
      const { input, output } = flowParams;

      editor.view.container.dispatchEvent(new PointerEvent('pointermove', e));
      e.preventDefault();
      e.stopPropagation();
      flow.start({ input, output }, input || output);
    }
  }

  function pointerUp(this: Window, e: PointerEvent) {
    if (!pointerDownTriggered) return;
    pointerDownTriggered = false;
    const flowEl = document.elementFromPoint(e.clientX, e.clientY);

    if (picker.io) {
      editor.trigger('connectiondrop', picker.io);
    }
    if (flowEl) {
      let flowParams = getMapItemRecursively(socketsParams, flowEl);
      let io = flow.target;
      // 处理点击时, start end 均为相同io
      if (flowParams && io && (io === flowParams.input || io === flowParams.output)) {
        flowParams = io = null;
      }
      flow.complete(flowParams || {});

      if (!flowParams && io) {
        editor.trigger('showpopupadd', { x: e.clientX, y: e.clientY, scope: 'node-io-pick', io });
      }
    }
  }

  editor.on('resetconnection', () => flow.complete());

  editor.on('rendersocket', ({ el, input, output }) => {
    socketsParams.set(el, { input, output });

    el.removeEventListener('pointerdown', pointerDown);
    el.addEventListener('pointerdown', pointerDown);
  });

  editor.on('disposesocket', ({ el }) => {
    socketsParams.delete(el);
    el.removeEventListener('pointerdown', pointerDown);
  });

  const disposePointerUp = listenWindow('pointerup', pointerUp);

  editor.on('renderconnection', ({ el, connection, points }) => {
    const d = renderPathData(editor, points, connection);

    renderConnection({ el, d, connection, editorView: editor.view });
  });

  editor.on('updateconnection', ({ el, connection, points, updateColor }) => {
    const d = renderPathData(editor, points, connection);

    updateConnection({ el, d, updateColor, connection, points });
  });

  editor.on('disposeconnection', ({ el, connection }) => {
    const path = (el as any)._path;
    delete (el as any)._path;
    delete (el as any)._stop1;
    delete (el as any)._stop2;
    delete (el as any)._gradient;
    delete (el as any)._connection;
    delete (path as any)._connection;
    el.removeEventListener('pointerdown', pointerDown);
  });

  editor.on('destroy', () => {
    disposeClick();
    disposeContextMenu();
    disposePointerUp();
  });
}

class ConnectionPluginClass implements Plugin {
  name = 'ConnectionPlugin';
  install = install;
}

export const ConnectionPlugin = new ConnectionPluginClass();

export { defaultNodePath } from './utils';
