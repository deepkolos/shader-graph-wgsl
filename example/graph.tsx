import { useState, useEffect, useRef, MutableRefObject } from 'react';
// import AreaPlugin from 'rete-area-plugin';
import { ShaderGraphEditor, AssetSimplePlugin, setResourceAdapter, PreviewCustomMeshPlugin } from '../src';
import { Presets } from './presets';

setResourceAdapter(asset => asset?.id);

export async function createEditor(container: HTMLElement) {
  const editor = new ShaderGraphEditor('demo@0.1.0', container);
  editor.use(AssetSimplePlugin);
  editor.use(PreviewCustomMeshPlugin);
  editor.setSubGraphProvider({
    getList: () => [
      { id: 'devSubGraph', label: 'devSubGraph' },
      { id: 'devSubGraphNested', label: 'devSubGraphNested' },
    ],
    getGraphData: asset => Presets[asset!.id],
  });

  await editor.initShaderGraphNodes();

  editor.view.resize();
  editor.trigger('process');
  // AreaPlugin.zoomAt(editor, editor.nodes);

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
    return () => {
      editorRef.current?.destroy();
    };
  }, []);

  return [setContainer, editorRef];
}

export async function printCompile(editor?: ShaderGraphEditor) {
  if (editor) {
    let vertCode = '';
    let fragCode = '';
    if (editor.editing === 'ShaderGraph') {
      ({ vertCode, fragCode } = await editor.compiler.compile(editor.toJSON()));
    }
    if (editor.editing === 'SubGraph') {
      ({ vertCode, fragCode } = await editor.compiler.compileSubGraphPreview(editor.toJSON()));
    }
    console.log('===== vertCode =====');
    console.log('%c' + vertCode, 'font-size: 14px');
    console.log('===== fragCode =====');
    console.log('%c' + fragCode, 'font-size: 14px');
  }
}
