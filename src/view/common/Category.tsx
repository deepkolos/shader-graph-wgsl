import React, { FC } from 'react';
import { ReteNode } from '../../types';

const CategoryColorMap: { [k: string]: string } = {
  input: 'red',
};

export const Category: FC<{ node: ReteNode }> = ({ node }) => {
  // TODO useStore/Context
  return (
    <div
      className="sg-node-category"
      style={{ background: CategoryColorMap[node.data.category] }}
    />
  );
};
