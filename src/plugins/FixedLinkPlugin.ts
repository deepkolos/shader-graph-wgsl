import { Rete } from '../types';
import { Plugin } from '../rete/core/plugin';

export const FixedLinkPlugin: Plugin = {
  name: 'FixedLinkPlugin',
  install(editor: Rete.NodeEditor) {
    editor.on('connectionpick', io => {
      return !io.connections.some(con => (con.data as any)?.fixed) || editor.silent;
    });
  },
};
