import { Plugin } from '../rete/core/plugin';
import { AssetValue, Rete, ValueType } from '../types';

declare module '../../src/rete/core/events' {
  interface EventsTypes {
    assetparse: { asset: AssetValue; type: ValueType; callback: (src: string) => void };
    assetselect: { type: ValueType; callback: (asset: AssetValue) => void };
  }
}

export const AssetBasePlugin: Plugin = {
  name: 'AssetBasePlugin',
  install(editor: Rete.NodeEditor) {
    editor.bind('assetparse');
    editor.bind('assetselect');
  },
};
