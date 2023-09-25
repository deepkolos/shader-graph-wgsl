import React, { FC, useState } from 'react';
import { MenuList, MenuListProps } from './MenuList';
import { Popup } from './Popup';
import { DefaultProps } from './types';

interface ContextMenuProps extends DefaultProps {
  visiable: boolean;
  items: MenuListProps['items'];
  onVisiableChange: (v: boolean) => void;
  clickable?: boolean;
  disabled?: boolean;
  root?: HTMLElement;
}

export const ContextMenu: FC<ContextMenuProps> = ({
  disabled,
  visiable,
  onVisiableChange,
  children,
  className,
  items,
  clickable,
  root,
}) => {
  const [position, setPosition] = useState([0, 0]);
  const onContextMenu = (e: any) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setPosition([e.clientX, e.clientY]);
    onVisiableChange(true);
  };

  const onPointerDown = (e: any) => {
    if (e.pointerType === 'mouse' && e.button !== 0) e.stopPropagation();
  };

  return (
    <div
      className={className}
      onPointerDownCapture={onPointerDown}
      onContextMenuCapture={onContextMenu}
      onClick={clickable ? onContextMenu : undefined}
    >
      {children}
      <Popup visiable={visiable} onShowChange={onVisiableChange} root={root}>
        <MenuList x={position[0]} y={position[1]} items={items} root={root}></MenuList>
      </Popup>
    </div>
  );
};
