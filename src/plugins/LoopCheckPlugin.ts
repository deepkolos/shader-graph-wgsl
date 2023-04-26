import { Rete } from '../types';
import { Plugin } from '../rete/core/plugin';

export const LoopCheckPlugin: Plugin = {
  name: 'LoopCheckPlugin',
  install(editor: Rete.NodeEditor) {
    // loop check https://github.com/retejs/rete/issues/255
    editor.on('connectioncreate', c => {
      const nodes = editor.toJSON().nodes;
      let node = nodes[c.input.node!.id];
      if (c.input.node?.contextNode) {
        node = nodes[c.input.node!.contextNode.id].blocks.find(i => i.id === c.input.node!.id)!;
      }
      // prettier-ignore
      node.inputs[c.input.key].connections.push({ node: c.output.node!.id, output: c.output.key, data: {}, });
      const recurrectNode = new Rete.Recursion(nodes).detect();
      node.inputs[c.input.key].connections.pop();
      if (recurrectNode) {
        console.warn('Connection removed due to recursion');
        return false;
      }
    });
  },
};
