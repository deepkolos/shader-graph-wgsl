import React, { FC, useEffect } from 'react';
import { Popup } from '../common/Popup';
import { PopupNodeAddView } from './PopupNodeAdd';
import { MenuList, MenuListProps } from '..';
import { Rete, ReteNode } from '../../types';
import { PopupViewProps, PopupView } from './PopupView';
import { listenWindow } from '../../rete/view/utils';
import copy from 'copy-to-clipboard';

interface MenuProps extends PopupViewProps {
  popupAdd: PopupNodeAddView;
  connection?: Rete.Connection;
  node?: ReteNode | Rete.Node;
  x?: number;
  y?: number;
}

const EditorContextMenu: FC<MenuProps> = ({ editor, connection, node, popupAdd, view, x = 0, y = 0 }) => {
  const isContextNode = node && node.meta.isContext;
  const nodeHasConnection = node && node.getConnections().length > 0;
  const nodeCanPreview = node && !node.meta.previewDisabled;

  useEffect(() => {
    return listenWindow('keyup', e => {
      if (e.key === 'Escape') view._setPopupShow(false);
    });
  }, []);

  return (
    <Popup view={view}>
      <MenuList
        x={x}
        y={y}
        items={
          [
            node &&
              !isContextNode &&
              [
                {
                  name: '复制预览Shader',
                  onclick: () => {
                    editor.trigger('previewcopyshader', {
                      node,
                      callback: data => {
                        console.log('VertCode:\n', data?.vertCode);
                        console.log('FragCode:\n', data?.fragCode);
                        data && copy(JSON.stringify(data, null, 2));
                        view.hide();
                      },
                    });
                  },
                  disabled: !nodeCanPreview,
                },
                {
                  name: '断开所有连接',
                  onclick: () => {
                    node.getConnections().forEach(i => editor.removeConnection(i));
                    view.hide();
                  },
                  disabled: !nodeHasConnection,
                },
              ].filter(i => !!i),
            ((!node && !connection) || isContextNode) && [
              {
                name: '增加节点',
                onclick: () => {
                  view.hide();
                  if (isContextNode) {
                    popupAdd.show({ x, y, scope: 'context', contextNode: node });
                  } else {
                    popupAdd.show({ x, y, scope: 'node' });
                  }
                },
              },
            ],
            !connection && [
              { name: '复制', onclick: () => {}, disabled: true },
              { name: '粘贴', onclick: () => {}, disabled: true },
              { name: '剪切', onclick: () => {}, disabled: true },
            ],
            node && [
              {
                name: '删除',
                onclick: () => {
                  try {
                    editor.removeNode(node!);
                  } catch (error) {
                    console.log(error);
                  } finally {
                    view.hide();
                  }
                },
                disabled: !node || node.meta.undeleteable,
              },
            ],
            connection && [
              {
                name: '删除',
                onclick: () => {
                  try {
                    editor.removeConnection(connection!);
                  } catch (error) {
                    console.log(error);
                  } finally {
                    view.hide();
                  }
                },
                disabled: !connection || (connection.data as any).fixed,
              },
            ],
            !connection && [{ name: '克隆', onclick: () => {}, disabled: true }],
            !connection && [
              {
                name: '选择',
                onclick: () => {},
                sublist: [{ name: '未使用节点', disabled: true }],
              },
            ],
          ].filter(i => !!i) as MenuListProps['items']
        }
      />
    </Popup>
  );
};

export class EditorMenuView extends PopupView<MenuProps> {
  constructor(public editor: Rete.NodeEditor, popupAdd: PopupNodeAddView) {
    super(editor, EditorContextMenu, 'sg-editor-context-menu');
    this.props = { editor, view: this, popupAdd };
  }
}
