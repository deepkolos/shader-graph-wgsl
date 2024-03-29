import { useState, useEffect, useRef, MutableRefObject } from 'react';
import AreaPlugin from 'rete-area-plugin';
import { ShaderGraphEditor, AssetSimplePlugin, setResourceAdapter, PreviewCustomMeshPlugin } from '../src';
import { Presets } from './presets';
import { printCompile } from '../src/view/utils';

setResourceAdapter(asset => asset?.id);

export async function createEditor(container: HTMLElement) {
  const editor = new ShaderGraphEditor('', container);
  editor.use(AssetSimplePlugin);
  editor.use(PreviewCustomMeshPlugin);
  editor.setSubGraphProvider({
    getList: () =>
      Object.keys(Presets)
        .map(name => {
          const cfg = Presets[name];
          if (cfg.type === 'SubGraph') return { id: name, label: name };
        })
        .filter(i => Boolean(i)),
    getGraphData: asset => Presets[asset!.id],
  });

  await editor.initShaderGraphNodes();

  editor.view.resize();
  editor.trigger('process');
  AreaPlugin.zoomAt(editor, editor.nodes);

  // 测试序列化和反序列化
  // setTimeout(() => editor.fromJSON(editor.toJSON()), 500);
  // 测试内存泄漏, FIXME 目前有内存泄漏
  // setInterval(() => editor.fromJSON(editor.toJSON()), 500);

  setTimeout(async () => {
    printCompile(editor);
  }, 500);
  return editor;
}

export function useRete(): [ReturnType<typeof useState<HTMLElement>>['1'], MutableRefObject<ShaderGraphEditor | undefined>] {
  const [container, setContainer] = useState<HTMLElement>();
  const editorRef = useRef<ShaderGraphEditor>();

  useEffect(() => {
    if (container) {
      createEditor(container).then(value => {
        editorRef.current = value;
      });
    }
  }, [container]);

  useEffect(() => {
    return () => editorRef.current?.dispose();
  }, []);

  return [setContainer, editorRef];
}
