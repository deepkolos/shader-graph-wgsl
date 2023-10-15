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
  z?: number;
  root?: HTMLElement;
}

export const MenuList: FC<MenuListProps> = ({ items, x, y, z, root }) => {
  const [submenuPosition, setSubmenuPosition] = useState<'left' | 'right'>('right');
  const canRef = useRef<HTMLDivElement>();

  useEffect(() => {
    const el = canRef.current!;
    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const gap = 20;
      let px = x;
      let py = y;
      if (root) {
        const rootRect = root.getBoundingClientRect();
        px -= rootRect.left;
        py -= rootRect.top;
      }
      const nx = Math.min(innerWidth - width - gap, px);
      const ny = Math.min(innerHeight - height - gap, py);
      el.style.top = ny + 'px';
      el.style.left = nx + 'px';
      el.style.opacity = '1';
      if (x > innerWidth - width * 2 - gap) setSubmenuPosition('left');
    });
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      className="sg-menu-list sg-menu-list-can"
      ref={el => (canRef.current = el!)}
      style={{ zIndex: z }}
      onContextMenu={preventDefault}
      onClick={stopPropagation}
    >
      {items.map((group, i) => (
        <div key={i}>
          {group.map(({ name, onclick, sublist, disabled = false }) => (
            <div className="sg-menu-item" key={name} onClick={disabled ? undefined : () => onclick?.(name)} data-aria-disabled={disabled}>
              <div className="sg-menu-item-name">{name}</div>
              {sublist && <div className="sg-menu-item-sublist-icon">{'>'}</div>}
              {sublist && (
                <div className="sg-menu-submenu sg-menu-list" data-position={submenuPosition || 'right'}>
                  {sublist.map(({ name, disabled, onclick }) => (
                    <div className="sg-menu-item" key={name} onClick={disabled ? undefined : () => onclick?.(name)} data-aria-disabled={disabled}>
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
