import './Tree.less';
import React, { FC, useState, useEffect } from 'react';
import { DefaultProps } from './types';

export interface TreeNode {
  name: string;
  label?: string;
  keywords?: string[];
  expaned?: boolean;
  data?: Array<TreeNode>;
}

export interface TreeProps extends DefaultProps {
  keyword?: string;
  onItemClick?: (item: TreeNode) => void;
  data: Array<TreeNode>;
}

export interface TreeItemProps {
  item: TreeNode;
  keyword?: string;
  onItemClick?: (item: TreeNode) => void;
}

function getHighlightedText(text: string, highlight: string) {
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return parts.map((part, i) => (
    <span key={i} data-highlighted={part.toLowerCase() === highlight.toLowerCase()}>
      {part}
    </span>
  ));
}

export const TreeItem: FC<TreeItemProps> = ({ keyword, item, onItemClick }) => {
  const { expaned, name, data, label = name } = item;
  const [expanded, setExpaned] = useState(expaned);
  const showSubTree = !!(data && data.length);

  useEffect(() => setExpaned(item.expaned), [item.expaned]);

  const labelParsed = keyword ? getHighlightedText(label, keyword) : label;

  return (
    <div className="sg-tree-item">
      <div className="sg-tree-item-head">
        <div
          className="sg-tree-item-btn-expand"
          data-aria-expanded={expanded}
          data-visible={showSubTree}
          onClick={() => showSubTree && setExpaned(!expanded)}>
          {'▶︎'}
        </div>
      </div>

      <div className="sg-tree-item-body">
        <div className="sg-tree-item-name" onClick={() => onItemClick?.(item)}>
          {labelParsed}
        </div>
        {showSubTree && expanded && <Tree data={data} keyword={keyword} onItemClick={onItemClick} />}
      </div>
    </div>
  );
};

export const Tree: FC<TreeProps> = ({ keyword, data, className = '', onItemClick }) => {
  return (
    <div className={`sg-tree ${className}`}>
      {data.map(item => (
        <TreeItem key={item.name} item={item} keyword={keyword} onItemClick={onItemClick} />
      ))}
    </div>
  );
};

export function filterTree(keyword: RegExp, scope: Array<TreeNode>, walker: (item: TreeNode) => TreeNode): Array<TreeNode> {
  return scope
    .filter(i => {
      const selfMatch = keyword.test(i.name) || i.keywords?.some(i => keyword.test(i));
      const childMatched = i.data ? filterTree(keyword, i.data, walker) : [];
      if (i.data && !selfMatch) i.data = childMatched;
      return selfMatch || childMatched.length;
    })
    .map(walker);
}

export function sortTree(sorter: Parameters<Array<TreeNode>['sort']>[0], scope: Array<TreeNode>) {
  scope.sort(sorter).forEach(i => {
    if (i.data) sortTree(sorter, i.data);
  });
}
