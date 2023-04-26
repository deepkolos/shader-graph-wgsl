import { Rete } from '../types';
import { ReteNode } from '../types';
import { Plugin } from '../rete/core/plugin';

export const FixedNodePlugin: Plugin = {
  name: 'FixedNodePlugin',
  install(editor: Rete.NodeEditor) {
    editor.on('noderemove', node => {
      return !(node as ReteNode).meta.undeleteable || editor.silent;
    });
  },
};
