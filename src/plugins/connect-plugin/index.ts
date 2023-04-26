import { NodeEditor } from '../../rete';
import { renderConnection, renderPathData, updateConnection, getMapItemRecursively } from './utils';
import { Picker } from './picker';
import { Flow, FlowParams } from './flow';
import './events';
import './index.less';
import { Plugin } from '../../rete/core/plugin';

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

  editor.view.area.el.addEventListener(
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
  editor.view.area.el.addEventListener(
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

  function pointerDown(this: HTMLElement, e: PointerEvent) {
    const flowParams = socketsParams.get(this);

    if (flowParams) {
      const { input, output } = flowParams;

      editor.view.container.dispatchEvent(new PointerEvent('pointermove', e));
      e.preventDefault();
      e.stopPropagation();
      flow.start({ input, output }, input || output);
    }
  }

  function pointerUp(this: Window, e: PointerEvent) {
    const flowEl = document.elementFromPoint(e.clientX, e.clientY);

    if (picker.io) {
      editor.trigger('connectiondrop', picker.io);
    }
    if (flowEl) {
      flow.complete(getMapItemRecursively(socketsParams, flowEl) || {});
    }
  }

  editor.on('resetconnection', () => flow.complete());

  editor.on('rendersocket', ({ el, input, output }) => {
    socketsParams.set(el, { input, output });

    el.removeEventListener('pointerdown', pointerDown);
    el.addEventListener('pointerdown', pointerDown);
  });

  window.addEventListener('pointerup', pointerUp);

  editor.on('renderconnection', ({ el, connection, points }) => {
    const d = renderPathData(editor, points, connection);

    renderConnection({ el, d, connection, editorView: editor.view });
  });

  editor.on('updateconnection', ({ el, connection, points, updateColor }) => {
    const d = renderPathData(editor, points, connection);

    updateConnection({ el, d, updateColor, connection, points });
  });

  editor.on('destroy', () => {
    window.removeEventListener('pointerup', pointerUp);
  });
}

export const ConnectionPlugin: Plugin = {
  name: 'ConnectionPlugin',
  install,
};

export { defaultNodePath } from './utils';
