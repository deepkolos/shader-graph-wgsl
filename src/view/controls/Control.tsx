import React, { FC } from 'react';
import { Rete } from '../../types';

export const Control: FC<{
  className?: string;
  control: Rete.Control | null;
  innerRef: Function;
}> = ({ className, control, innerRef }) => {
  return <div className={className} ref={el => el && innerRef(el, control)} />;
};
