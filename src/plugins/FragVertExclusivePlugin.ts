import { Rete } from '../types';
import { Plugin } from '../rete/core/plugin';

export const walkNode = (root: Rete.Node | null, walker: (node: Rete.Node) => boolean | void, ioType: 'input' | 'output' = 'output') => {
  if (root) {
    const shouldBreak = walker(root);
    if (shouldBreak) return true;

    outerLoop: for (let [, io] of ioType === 'output' ? root.outputs : root.inputs) {
      for (let i = 0, il = io.connections.length; i < il; i++) {
        const conn = io.connections[i];
        const shouldBreak = walkNode(conn[ioType === 'output' ? 'input' : 'output'].node, walker);
        if (shouldBreak) break outerLoop;
      }
    }
  }
};

export const getIOLinkToContextType = (io: Rete.IO): '' | 'vert' | 'frag' => {
  let linkTo: '' | 'vert' | 'frag' = '';
  walkNode(io.node, node => {
    if (node.contextNode) {
      if (node.contextNode.name === 'Fragment') linkTo = 'frag';
      else if (node.contextNode.name === 'Vertex') linkTo = 'vert';
      if (linkTo) return true;
    }
  });
  return linkTo;
};

export const FragVertExclusivePlugin: Plugin = {
  name: 'FragVertExclusivePlugin',
  install(editor: Rete.NodeEditor) {
    editor.on('connectioncreate', con => {
      const inputLinkToContext = getIOLinkToContextType(con.input);
      const outputLinkToContext = getIOLinkToContextType(con.output);
      if (
        inputLinkToContext &&
        outputLinkToContext &&
        inputLinkToContext !== outputLinkToContext &&
        ![''].includes(con.output.name) // TODO update list
      ) {
        console.warn('Connection removed due to vert & frag exclusive');
        return false;
      }
    });
  },
};
