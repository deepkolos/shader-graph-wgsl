import './PopupNodeAdd.less';
import React, { FC, useContext, useEffect, useRef, useState } from 'react';
import { Rete, ValueTypeAbbreviationMap } from '../../types';
import { useDebounce } from 'use-debounce';
import { moveableContext, Moveable } from '../common/Moveable';
import { Popup } from '../common/Popup';
import { DefaultProps } from '../common/types';
import { TreeNode, sortTree, filterTree, Tree } from '../common/Tree';
import { PopupView, PopupViewProps } from './PopupView';
import { RCBlock, RC } from '../../components/ReteComponent';
import { capitalizeFirstLetter, deepCopy } from '../../utils';
import { CustomInterpolatorBlock, ReteCustomInterpolatorBlock, SubGraphRC, VaryingRC, VertexRC } from '../../components';
import { ShaderGraphEditor } from '../../editors';

const PopupTitle: FC<DefaultProps> = ({ children, className = '' }) => {
  const moveableState = useContext(moveableContext);

  return (
    <div className={`sg-popup-title ${className}`} ref={el => (moveableState.startEl = el!)}>
      {children}
    </div>
  );
};

export interface PopupNodeAddProps extends PopupViewProps {
  x?: number;
  y?: number;
  scope?: 'node' | 'context' | 'node-io-pick';
  contextNode?: Rete.Node;
  io?: Rete.IO;
}
export const PopupNodeAdd: FC<PopupNodeAddProps> = ({ editor, view, x = 0, y = 0, scope = 'node', contextNode, io }) => {
  const initTreeData = useRef<Array<TreeNode>>();
  const [data, setData] = useState<Array<TreeNode>>([]);
  const [keyword, setKeyword] = useState('');
  const inputRef = useRef<HTMLInputElement>();
  const setDataRef = useRef(setData);
  const [keywordDebounced] = useDebounce(keyword, 150);
  const nodeRemovedRef = useRef(0);
  // const [kbCursor, setkbCursor] = useState(0);
  setDataRef.current = setData;

  const onItemClick = async (item: TreeNode) => {
    const nameParts = item.name.split('_');
    const isVarying = nameParts[0] === CustomInterpolatorBlock.Name && item.name !== CustomInterpolatorBlock.Name;
    const isSubGraph = nameParts[0] === SubGraphRC.Name;
    const isNodeIO = io && scope === 'node-io-pick';
    let nodeName = item.name;
    let ioKey = '';
    if (isVarying) nodeName = VaryingRC.Name;
    if (isSubGraph) nodeName = SubGraphRC.Name;
    if (isNodeIO) [nodeName, ioKey] = item.name.split(':');
    const com = editor.components.get(nodeName) as RCBlock | Rete.Component | undefined;
    if (!com) return;
    try {
      const data: any = {};
      if (isVarying) data.outValueName = item.label;
      if (isSubGraph) {
        data.assetValue = { id: nameParts[1], label: item.label };
        data.assetValueType = 'subgraph';
      }

      const node = await com.createNode(data);
      if (scope === 'node') {
        const [gx, gy] = editor.view.area.convertToGraphSpace([x, y]);
        node.position[0] = gx;
        node.position[1] = gy;
        editor.addNode(node);
      } else if (contextNode && scope === 'context') {
        editor.addBlock(contextNode, node, com as RCBlock);
      } else if (isNodeIO) {
        const [gx, gy] = editor.view.area.convertToGraphSpace([x, y]);
        node.position[0] = gx;
        node.position[1] = gy;
        editor.addNode(node);
        if (io.type === 'input') {
          editor.connect(node.outputs.get(ioKey)!, io as Rete.Input);
        } else {
          editor.connect(io as Rete.Output, node.inputs.get(ioKey)!);
        }
      }
    } catch (error) {
      // supressed
    } finally {
      view.hide();
    }
  };

  useEffect(() => {
    return editor.on(['noderemoved'], () => nodeRemovedRef.current++);
  }, []);

  // 初始化initTreeData
  useEffect(() => {
    const fn = async () => {
      const rootData: Array<TreeNode> = [];

      const getDir = (name: string, scope: Array<TreeNode>) => {
        if (!name) return scope;
        let item = scope.find(i => i.name === name);
        if (!item) {
          item = { name };
          scope.push(item);
        }
        item.data ??= [];
        return item.data;
      };

      const coms = ([...editor.components.values()] as RC[]).filter(i => i.initNode);
      if (scope === 'node') {
        coms.forEach(({ nodeLayout, name }) => {
          if (nodeLayout.meta.category) {
            const dirs = nodeLayout.meta.category.split('/');
            const list = dirs.reduce((scope, dir) => getDir(capitalizeFirstLetter(dir), scope), rootData);
            list.push({ name, label: nodeLayout.meta.label, keywords: nodeLayout.meta.keywords });
          }
          // else console.warn('Missing node.meta.category', name);
        });

        // Custom Interpolator
        const vertex = editor.nodes.find(i => i.name === VertexRC.Name);
        if (vertex) {
          const varyings = vertex.blocks.filter(i => i.name === CustomInterpolatorBlock.Name);
          if (varyings.length) {
            const list = ['Custom Interpolator'].reduce((scope, dir) => getDir(capitalizeFirstLetter(dir), scope), rootData);
            (varyings as ReteCustomInterpolatorBlock[]).forEach(block => {
              const label = block.data.varyingValueName;
              const name = CustomInterpolatorBlock.Name + '_' + label;
              list.push({ name, label, keywords: [label] });
            });
          }
        }

        // Sub Graph
        const assets = await (editor as ShaderGraphEditor).subGraphProvider?.getList();
        if (assets) {
          const list = ['Sub Graph'].reduce((scope, dir) => getDir(capitalizeFirstLetter(dir), scope), rootData);
          assets.forEach(asset => {
            if (!asset) return;
            const name = SubGraphRC.Name + '_' + asset.id;
            list.push({ name, label: asset.label, keywords: [asset.label] });
          });
        }
      } else if (contextNode && scope === 'context') {
        const com = editor.components.get(contextNode.name) as RC | undefined;
        if (com && com.nodeLayout.meta.blockComponents) {
          const blockComNames = com.nodeLayout.meta.blockComponents as Array<string>;
          blockComNames.forEach(name => {
            const { nodeLayout } = editor.components.get(name) as RC;
            rootData.push({ name, label: nodeLayout.meta.label, keywords: nodeLayout.meta.keywords });
          });
        } else console.warn("Can's find context component or node's blockComponents", contextNode.name);
      } else if (io && scope === 'node-io-pick') {
        coms.forEach(({ nodeLayout, name }) => {
          const { category, label, keywords } = nodeLayout.meta;
          if (category) {
            const dirs = category.split('/');
            const list = dirs.reduce((scope, dir) => getDir(capitalizeFirstLetter(dir), scope), rootData);
            const ioList = io.type === 'input' ? nodeLayout.outputs : nodeLayout.inputs;
            ioList.forEach(i => {
              const typeAddr = ValueTypeAbbreviationMap[nodeLayout.data[i.key + 'ValueType']];
              list.push({
                name: `${name}:${i.key}`,
                label: `${label || name}:${i.name}${typeAddr ? `(${typeAddr})` : ''}`,
                keywords: keywords,
              });
            });
          }
        });
      }

      sortTree((a, b) => a.name.charCodeAt(0) - b.name.charCodeAt(0), rootData);

      setDataRef.current(rootData);
      initTreeData.current = rootData;
    };
    fn();
  }, [scope, contextNode, nodeRemovedRef.current, io?.type]);

  // 更新treeData
  useEffect(() => {
    if (!initTreeData.current) return;
    if (keywordDebounced) {
      const cloned: Array<TreeNode> = deepCopy(initTreeData.current);
      const filtered = filterTree(new RegExp(keywordDebounced, 'i'), cloned, item => {
        item.expaned = true;
        return item;
      });
      setData(filtered);
    } else setData(initTreeData.current);
  }, [keywordDebounced]);

  return (
    <Popup view={view} onShowChange={show => (show ? inputRef.current?.focus() : setKeyword(''))} root={editor.view.container}>
      <Moveable gap={10} x={x} y={y} containerEl={editor.view.container}>
        <div className="sg-popup-node-add">
          <PopupTitle>{'Create Node'}</PopupTitle>
          <div className="sg-popup-node-add-search">
            <input
              className="sg-popup-node-add-search-input"
              value={keyword}
              // @ts-ignore
              spellCheck="false"
              ref={el => (inputRef.current = el!)}
              // @ts-ignore
              onChange={e => setKeyword(e.target.value)}
            />
          </div>
          <Tree className="sg-popup-node-add-tree" data={data} keyword={keywordDebounced} onItemClick={onItemClick} />
        </div>
      </Moveable>
    </Popup>
  );
};

export class PopupNodeAddView extends PopupView<PopupNodeAddProps> {
  constructor(public editor: Rete.NodeEditor) {
    super(editor, PopupNodeAdd);
    this.props = { view: this, editor };
  }
}
