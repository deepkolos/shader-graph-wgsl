import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Plugin } from '../../rete/core/plugin';
import { Rete } from '../../types';

export const PreviewCustomMeshPlugin: Plugin = {
  name: 'PreviewCustomMeshPlugin',
  install(editor: Rete.NodeEditor) {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.position = 'absolute';
    input.style.left = '0';
    input.style.top = '0';
    input.style.transform = 'translateX(-100%)';
    input.accept = '*/glb';
    document.body.appendChild(input);
    const gltfLoader = new GLTFLoader();

    editor.on('previewcustommesh', callback => {
      input.value = '';
      input.onchange = async () => {
        if (input.files && input.files.length) {
          const file = input.files.item(0)!;
          const id = URL.createObjectURL(file);
          try {
            const gltf = await gltfLoader.loadAsync(id);
            let geometry: any;
            gltf.scene.traverse((node: any) => {
              geometry ??= (node as any)?.geometry;
            });
            callback(geometry); // 默认取第一个Geometry
          } catch (error) {
            console.error(error);
            callback(undefined);
          }
        } else callback(undefined);
      };
      input.click();
    });
  },
};
