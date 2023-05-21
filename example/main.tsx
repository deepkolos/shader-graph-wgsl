import './index.css';
import { createRoot } from 'react-dom/client';
import React, { useEffect } from 'react';
import { GraphEditorPage } from './editor';
import { showEngineUsage } from './constant';
import { OrillusionPage } from './orillusion';

function App() {
  useEffect(() => {
    if ('gpu' in navigator === false) {
      alert('请使用Chrome Beta 113以上版本, 且打开WebGPU');
    }
  }, []);

  return (
    <div className="App" style={{ width: '100%', height: '100%' }}>
      {!showEngineUsage && <GraphEditorPage />}
      {showEngineUsage === 'Orillusion' && <OrillusionPage />}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
