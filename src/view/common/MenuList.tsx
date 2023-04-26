import './MenuList.less';
import React, { FC, useState, useRef, useEffect } from 'react';
import { preventDefault, stopPropagation } from '../utils';

interface MenuItem {
  name: string;
  onclick?: (name: string) => void;
  disabled?: boolean;
  sublist?: Array<Omit<MenuItem, 'sublist'>>;
}

export interface MenuListProps {
  items: Array<Array<MenuItem>>;
  x: number;
  y: number;
}

export const MenuList: FC<MenuListProps> = ({ items, x, y }) => {
  const [submenuPosition, setSubmenuPosition] = useState<'left' | 'right'>('right');
  const canRef = useRef<HTMLDivElement>();

  useEffect(() => {
    const el = canRef.current!;
    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const gap = 20;
      const nx = Math.min(innerWidth - width - gap, x);
      const ny = Math.min(innerHeight - height - gap, y);
      el.style.top = ny + 'px';
      el.style.left = nx + 'px';
      if (x > innerWidth - width * 2 - gap) setSubmenuPosition('left');
    });
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="sg-menu-list" ref={el => (canRef.current = el!)} onContextMenu={preventDefault} onClick={stopPropagation}>
      {items.map((group, i) => (
        <div key={i}>
          {group.map(({ name, onclick, sublist, disabled = false }) => (
            <div className="sg-menu-item" key={name} onClick={disabled ? undefined : () => onclick?.(name)} data-aria-disabled={disabled}>
              <div className="sg-menu-item-name">{name}</div>
              {sublist && <div className="sg-menu-item-sublist-icon">{'>'}</div>}
              {sublist && (
                <div className="sg-menu-submenu sg-menu-list" data-position={submenuPosition || 'right'}>
                  {sublist.map(({ name, disabled, onclick }) => (
                    <div
                      className="sg-menu-item"
                      key={name}
                      onClick={disabled ? undefined : () => onclick?.(name)}
                      data-aria-disabled={disabled}>
                      <div className="sg-menu-item-name">{name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {i !== items.length - 1 && <div className="sg-menu-divider" />}
        </div>
      ))}
    </div>
  );
};
