import './MainPreview.less';
import React, { FC, useContext, useEffect, useRef, useState } from 'react';
import { Rete } from '../../types';
import { ContextMenu, Moveable, moveableContext, Popup } from '../common';
import { PopupView, PopupViewProps } from '.';
import { stopPropagation } from '../utils';

const MainPreviewTitle: FC = () => {
  const ctx = useContext(moveableContext);
  return (
    <div className="sg-main-preview-title" ref={el => (ctx.startEl = el!)}>
      Main Preview
    </div>
  );
};

interface MainPreviewProps extends PopupViewProps {}

const MenuItems = [
  'Sphere',
  'Capsule',
  'Cylinder',
  'Cube',
  'Quad',
  'Sprite',
  'Custom Mesh',
  'Toggle Floor',
];

export const MainPreview: FC<MainPreviewProps> = ({ editor, view }) => {
  const [show, setShow] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>();

  const onMenuClick = (name: string) => {
    editor.trigger('previewsettingupdate', { geometry: name });
    setShow(false);
  };

  useEffect(() => {
    editor.trigger('previewclientcreate', {
      canvas: canvasRef.current,
      type: '3d',
      enable: view.showing,
    });
    return () => {
      editor.trigger('previewclientremove', { canvas: canvasRef.current });
    };
  }, [canvasRef.current]);

  return (
    <Popup
      view={view}
      mask={false}
      keepAlive
      root={editor.view.container}
      onShowChange={show =>
        editor.trigger('previewclientupdate', { canvas: canvasRef.current, enable: show })
      }
    >
      <Moveable x={Infinity} y={Infinity} gap={20} containerEl={editor.view.container}>
        <div className="sg-main-preview">
          <MainPreviewTitle />

          <ContextMenu
            className="sg-main-preview-canvas-can"
            root={editor.view.container}
            visiable={show}
            onVisiableChange={setShow}
            items={[MenuItems.map(name => ({ name, onclick: onMenuClick }))]}
          >
            <canvas
              onPointerDown={stopPropagation}
              onPointerMove={stopPropagation}
              className="sg-main-preview-canvas"
              ref={el => el && (canvasRef.current = el)}
            />
          </ContextMenu>
        </div>
      </Moveable>
    </Popup>
  );
};

export class MainPreviewView extends PopupView<MainPreviewProps> {
  constructor(editor: Rete.NodeEditor) {
    super(editor, MainPreview);
    this.props = { editor, view: this };
  }
}
