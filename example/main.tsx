import './index.css';
import { createRoot } from 'react-dom/client';
import React, { FC, MutableRefObject, useEffect, useState } from 'react';
import { printCompile, useRete } from './graph';
import copy from 'copy-to-clipboard';
import { Select, ShaderGraphEditor } from '../src';
import { Presets } from './presets';

const Preset: FC<{ editorRef: MutableRefObject<ShaderGraphEditor> }> = ({ editorRef }) => {
  const [preset, setPreset] = useState<string>();

  const onChange = (name: any) => {
    editorRef.current.fromJSON(Presets[name]);
    setPreset(name);
  };

  useEffect(() => {
    setTimeout(() => onChange('demoFresnelOutline'), 200);
  }, []);

  return <Select value={preset} options={Object.keys(Presets)} onChange={onChange} />;
};

function App() {
  const [visible, setVisible] = useState(true);
  const [setContainer, editorRef] = useRete();

  return (
    <div className="App" style={{ width: '100%', height: '100%' }}>
      <div style={{ width: '500px', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <button className="btn" onClick={() => setVisible(false)}>
          Destroy
        </button>
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
          onClick={() => copy(JSON.stringify(editorRef.current?.toJSON(), null, 2))}
        >
          Export
        </button>
        <button
          className="btn"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              const json = editor.toJSON();
              editor.clear();
              setTimeout(() => editor.fromJSON(json), 500);
            }
          }}
        >
          Export & Import
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
      </div>
      {visible && <div ref={ref => ref && setContainer(ref)} />}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
