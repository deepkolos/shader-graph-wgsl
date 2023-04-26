import { Plugin } from '../rete/core/plugin';
import { Rete } from '../types';
import { getIOLinkToContextType } from './FragVertExclusivePlugin';

export const CheckDDXYLinkPlugin: Plugin = {
  name: 'CheckDDXYLinkPlugin',
  install(editor: Rete.NodeEditor) {
    editor.on('connectioncreate', con => {
      if (con.output.node?.meta.category === 'math/derivative') {
        const isLinkToContext = getIOLinkToContextType(con.input);
        if (isLinkToContext === 'vert') {
          console.warn('Connection removed due to derivative nodes can link to frag only');
          return false;
        }
      }
    });
  },
};
