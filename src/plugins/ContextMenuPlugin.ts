import { Rete } from '../types';
import { Plugin } from '../rete/core/plugin';
import { PopupNodeAddView, EditorMenuView, PopupNodeAddProps } from '../view';

declare module '../rete/core/events' {
  interface EventsTypes {
    hidecontextmenu: void;
    showcontextmenu: void;
    showpopupadd: PopupNodeAddProps;
  }
}

function install(editor: Rete.NodeEditor) {
  editor.bind('hidecontextmenu');
  editor.bind('showcontextmenu');
  editor.bind('showpopupadd');

  const popupAdd = new PopupNodeAddView(editor);
  const menu = new EditorMenuView(editor, popupAdd);

  editor.on('contextmenu', params => {
    const { e, connection, node } = params;
    e.preventDefault();
    e.stopPropagation();

    if (!editor.trigger('showcontextmenu', params)) return;

    menu.show({ x: e.clientX, y: e.clientY, node, connection });
  });

  editor.on('showpopupadd', props => popupAdd.show(props));
}

class EditorContextMenuPluginClass implements Plugin {
  name = 'EditorContextMenuPlugin';
  install = install;
}

export const EditorContextMenuPlugin = new EditorContextMenuPluginClass();
