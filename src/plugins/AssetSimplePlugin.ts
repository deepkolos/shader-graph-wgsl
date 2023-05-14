import { Plugin } from '../rete/core/plugin';
import { Rete } from '../types';

export const AssetSimplePlugin: Plugin = {
  name: 'AssetSimplePlugin',
  install(editor: Rete.NodeEditor) {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.position = 'absolute';
    input.style.left = '0';
    input.style.top = '0';
    input.style.transform = 'translateX(-100%)';
    input.accept = 'image/*';
    document.body.appendChild(input);

    editor.on('assetparse', ({ asset, type, callback }) => {
      callback(asset?.id || '');
    });

    editor.on('assetselect', ({ type, callback }) => {
      input.value = '';
      input.onchange = () => {
        if (input.files && input.files.length) {
          const file = input.files.item(0)!;
          const id = URL.createObjectURL(file);
          callback({ id, label: file.name });
        } else callback(undefined);
      };
      input.click();
    });

    editor.on('destroy', () => {
      document.body.removeChild(input);
    });
  },
};
