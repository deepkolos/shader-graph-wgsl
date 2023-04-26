import { VaryingRC } from '../components';
import { Plugin } from '../rete/core/plugin';
import { Rete } from '../types';
import { getIOLinkToContextType, walkNode } from './FragVertExclusivePlugin';

export const isIOLinkToVarying = (io: Rete.IO): boolean => {
  let linkTo = false;
  walkNode(
    io.node,
    node => (linkTo = node.name === VaryingRC.Name),
    'input',
  );
  return linkTo;
};

export const CheckVaryingLinkPlugin: Plugin = {
  name: 'CheckVaryingLinkPlugin',
  install(editor: Rete.NodeEditor) {
    editor.on('connectioncreate', con => {
      const isOutputLinkToVarying = isIOLinkToVarying(con.output);
      const isInputLinkToVertex = getIOLinkToContextType(con.input) === 'vert';
      if (isOutputLinkToVarying && isInputLinkToVertex) {
        console.warn('Connection removed due to varying can link to frag only');
        return false;
      }
    });
  },
};
