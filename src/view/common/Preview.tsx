import './Preview.less';
import React, { FC, useEffect, useRef, useState } from 'react';
import { ReteNode } from '../../types';
import { NodeView } from '../../rete/view/node';

export const Preview: FC<{ node: ReteNode; view: NodeView }> = ({ node, view }) => {
  const [show, setShow] = useState(node.data.preview);
  const canvasRef = useRef<HTMLDivElement | null>();

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas && view.trigger('previewclientcreate', { node, canvas, type: node.data.previewType, enable: show });
    return () => {
      canvas && view.trigger('previewclientremove', { canvas });
    };
  }, []);

  useEffect(() => {
    node.data.preview = show;
    node.dataChanged = true;
    const canvas = canvasRef.current;
    canvas && view.trigger('previewclientupdate', { canvas, enable: show });
  }, [show]);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas && view.trigger('previewclientupdate', { canvas, type: node.data.previewType || '2d' });
  }, [node.data.previewType]);

  return (
    <div className="sg-preview">
      <div className="sg-preview-btn" data-aria-expanded={show} onClick={() => setShow(!show)}>
        ▾
      </div>
      <div className="sg-preview-canvas-can">
        <div className="sg-preview-canvas" style={{ display: !show ? 'none' : 'block' }} ref={el => (canvasRef.current = el)} />
      </div>
    </div>
  );
};
