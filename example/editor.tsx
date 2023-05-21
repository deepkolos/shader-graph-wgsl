import copy from 'copy-to-clipboard';
import React, { FC, MutableRefObject, useState, useEffect } from 'react';
import { ShaderGraphEditor, Select } from '../src';
import { useRete, printCompile } from './graph';
import { Presets } from './presets';
import { defaultGraph, graphKey, getUrlWithParams, params, showTestToolBar } from './constant';

let toasted = false;

const Preset: FC<{ editorRef: MutableRefObject<ShaderGraphEditor> }> = ({ editorRef }) => {
  const [preset, setPreset] = useState<string>();

  const onChange = (name: any) => {
    editorRef.current.fromJSON(Presets[name]);
    setPreset(name);
    history.replaceState(null, '', getUrlWithParams(graphKey, name));
  };

  useEffect(() => {
    const graph = params.get(graphKey) || defaultGraph;
    if (graph && Presets[graph]) {
      setTimeout(() => onChange(graph), 200);
    }
  }, []);

  return <Select value={preset} options={Object.keys(Presets)} onChange={onChange} />;
};

const GraphEditor: FC<{}> = () => {
  const [setContainer, editorRef] = useRete();

  return (
    <div className="App" style={{ width: '100%', height: '100%' }}>
      <div className="toolbar">
        <button className="btn" onClick={() => editorRef.current?.blackboardView.toggle()}>
          BlackBoard
        </button>
        <button className="btn" onClick={() => editorRef.current?.mainPreviewView.toggle()}>
          MainPreview
        </button>
        <button className="btn" onClick={() => editorRef.current?.inspectorView.toggle()}>
          Inspector
        </button>
        <button
          className="btn"
          onClick={() => {
            copy(JSON.stringify(editorRef.current?.toJSON(), null, 2));
            if (!toasted) {
              alert('已复制, 可Console查看结果');
              toasted = true;
            }
          }}
        >
          Export
        </button>
        <button className="btn" onClick={() => printCompile(editorRef.current)}>
          Compile
        </button>
        <button
          className="btn"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.clear(true);
              editor.initShaderGraphNodes();
            }
          }}
        >
          NewShaderGraph
        </button>
        <button
          className="btn"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.clear(true);
              editor.initSubGraphNodes();
            }
          }}
        >
          NewSubGraph
        </button>
        <Preset editorRef={editorRef as any} />
        <button
          className="btn"
          onClick={() => (location.href = getUrlWithParams('engine', 'Orillusion'))}
        >
          Used In Orillusion
        </button>
      </div>
      <div className="sg-editor" ref={ref => ref && setContainer(ref)} />
    </div>
  );
};

export const GraphEditorPage = () => {
  const [visible, setVisible] = useState(true);

  return (
    <>
      {visible && <GraphEditor />}
      {showTestToolBar && (
        <div className="test-toolbar">
          <button className="btn" onClick={() => setVisible(false)}>
            Hide Editor
          </button>
          <button className="btn" onClick={() => setVisible(true)}>
            Show Editor
          </button>
        </div>
      )}
    </>
  );
};
