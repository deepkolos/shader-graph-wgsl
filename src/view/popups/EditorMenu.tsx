import React, { FC, useEffect } from 'react';
import { Popup } from '../common/Popup';
import { PopupNodeAddView } from './PopupNodeAdd';
import { MenuList, MenuListProps } from '..';
import { Rete, ReteNode } from '../../types';
import { PopupViewProps, PopupView } from './PopupView';
import { listenWindow } from '../../rete/view/utils';
import copy from 'copy-to-clipboard';
import { Input, Node, Output } from '../../rete';
import { NodeData } from '../../rete/core/data';
import { getIOLinkToContextType } from '../../plugins';

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

  const selectedCloneableNodes = editor.selected.list.filter(i => !i.meta.undeleteable && !i.meta.uncloneable);

  useEffect(() => {
    return listenWindow('keyup', e => {
      if (e.key === 'Escape') view._setPopupShow(false);
    });
  }, []);

  const copyShaderLink =
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
    ].filter(i => !!i);

  const addNode = ((!node && !connection) || isContextNode) && [
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
  ];

  const copyPasteCut = !connection && [
    {
      name: '复制',
      onclick: () => {
        editor.selected.copy();
        view.hide();
      },
      disabled: selectedCloneableNodes.length === 0,
    },
    {
      name: '粘贴',
      onclick: async () => {
        const copyed = editor.selected.copyed!;
        const copyedBox = editor.selected.copyedBox;
        // 静音
        editor.silent = true;

        // 实例化所复制的节点并更新id
        const idMap: { [k: number]: number } = {};
        const nodedCopyedMap: { [k: number]: Node } = {};
        const contextNodes = editor.nodes.filter(i => i.isContext());
        const nodedCopyed = await Promise.all(
          copyed.map(async nodeData => {
            const needNewId = editor.nodes.some(n => n.id === nodeData.id);
            const node = await editor.buildNode(nodeData);
            idMap[nodeData.id] = nodeData.id;
            if (needNewId) {
              node.id = Node.incrementId();
              idMap[nodeData.id] = node.id;
            }
            if (node.isContext()) contextNodes.push(node);
            nodedCopyedMap[node.id] = node;
            return node;
          }),
        );

        // 修改粘贴后的位置
        const [gx, gy] = editor.view.area.convertToGraphSpace([x, y]);
        const cx = copyedBox.min.x;
        const cy = copyedBox.min.y;
        const dx = gx - cx;
        const dy = gy - cy;
        nodedCopyed.forEach(node => {
          node.position[0] += dx;
          node.position[1] += dy;
          editor.addNode(node);
        });

        // 重连链接复制后的节点
        const restoreLink = (node: Node, nodeData: NodeData, nodeKey: 'inputs' | 'outputs') => {
          const otherConKey = nodeKey === 'inputs' ? 'output' : 'input';
          const otherKey = nodeKey === 'inputs' ? 'outputs' : 'inputs';
          Object.keys(nodeData[nodeKey]).forEach(key => {
            nodeData[nodeKey][key].connections.forEach(connnectionData => {
              const nodeId = idMap[connnectionData.node] || connnectionData.node;
              const data = connnectionData.data;
              const otherIOKey = (connnectionData as any)[otherConKey];
              const targetOutput = node[nodeKey].get(key);
              let targetInput: Input | Output | undefined;
              let targetNode = nodedCopyedMap[nodeId] || editor.nodes.find(i => i.id === nodeId);
              if (targetNode) targetInput = targetNode[otherKey].get(otherIOKey);
              else {
                // block
                contextNodes.find(node =>
                  node.blocks.some(block => {
                    if (block.id === nodeId) {
                      targetInput = block[otherKey].get(otherIOKey);
                      return true;
                    }
                  }),
                );
              }
              if (targetOutput && targetInput) {
                try {
                  if (nodeKey === 'outputs') editor.connect(targetOutput as any, targetInput as any, data, true);
                  else editor.connect(targetInput as any, targetOutput as any, data, true);
                } catch (error: any) {
                  if (error.message !== 'Input already has one connection') {
                    console.error(error);
                  }
                }
              }
            });
          });
        };
        copyed.forEach((nodeData, i) => {
          const node = nodedCopyed[i];
          // 因为是局部恢复, 所以需要同时恢复input/output的链接
          restoreLink(node, nodeData, 'outputs');
          restoreLink(node, nodeData, 'inputs');
        });

        // 取消静音
        editor.silent = false;
        view.hide();
      },
      disabled: !editor.selected.copyed,
    },
    {
      name: '剪切',
      onclick: () => {
        editor.selected.copy();
        editor.selected.each(node => editor.removeNode(node));
        view.hide();
      },
      disabled: selectedCloneableNodes.length === 0,
    },
  ];

  const hideDeleteNode = (!node || node.meta.undeleteable) && selectedCloneableNodes.length === 0;
  const hideDeleteConnection = !connection || (connection.data as any).fixed;
  const deleteNode = (node || selectedCloneableNodes.length) && [
    {
      name: '删除' + (hideDeleteConnection ? '' : '节点'),
      onclick: () => {
        try {
          if (node && !editor.selected.contains(node)) editor.removeNode(node);
          editor.selected.each(node => editor.removeNode(node));
        } catch (error) {
          console.log(error);
        } finally {
          view.hide();
        }
      },
      disabled: hideDeleteNode,
    },
  ];

  const deleteConnection = connection && [
    {
      name: '删除' + (hideDeleteNode ? '' : '连线'),
      onclick: () => {
        try {
          editor.removeConnection(connection!);
        } catch (error) {
          console.log(error);
        } finally {
          view.hide();
        }
      },
      disabled: hideDeleteConnection,
    },
  ];

  const selectUnusedNode = !connection && [
    {
      name: '选择',
      sublist: [
        {
          name: '未使用节点',
          onclick: () => {
            let accumulate = false;
            editor.nodes.forEach(node => {
              const linkToContext = [...node.outputs.values()].some(io => getIOLinkToContextType(io));
              if (!linkToContext && !node.isContext()) {
                editor.selectNode(node, accumulate, true);
                accumulate = true;
              }
            });
            view.hide();
          },
          disabled: false,
        },
      ],
    },
  ];

  return (
    <Popup view={view} root={editor.view.container}>
      <MenuList
        x={x}
        y={y}
        items={
          [
            copyShaderLink,
            addNode,
            copyPasteCut,
            deleteConnection,
            deleteNode,
            // !connection && [{ name: '克隆', onclick: () => {}, disabled: true }],
            selectUnusedNode,
          ].filter(i => !!i) as MenuListProps['items']
        }
        root={editor.view.container}
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
