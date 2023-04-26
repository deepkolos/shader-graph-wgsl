import './Popup.less';
import React, { FC, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { DefaultProps } from './types';
import { listenWindow } from '../../rete/view/utils';
import { isChildOf } from '../utils';

interface PopupContext {
  onMaskClick?: (popupDispose: () => void) => void;
}
export const popupContext = React.createContext<PopupContext>({});

export interface PopupProps extends DefaultProps {
  visiable?: boolean;
  mask?: boolean;
  view?: { _setPopupShow: (show: boolean) => void };
  onShowChange?: (show: boolean) => void;
  keepAlive?: boolean;
}

export const Popup: FC<PopupProps> = ({ visiable = false, children, view, onShowChange, mask = true, keepAlive = false }) => {
  const [show, setShow] = useState(visiable);
  const canRef = useRef<HTMLElement>();
  const popupState = useRef<PopupContext>({});
  const setShowRef = useRef(setShow);
  if (view) view._setPopupShow = setShow;
  setShowRef.current = setShow;

  useEffect(() => {
    if (show !== visiable) setShow(visiable);
  }, [visiable]);

  const close = (e: any) => {
    e.preventDefault();
    if (popupState.current.onMaskClick) popupState.current.onMaskClick(() => setShow(false));
    else setShow(false);
  };

  useEffect(() => {
    onShowChange?.(show);
  }, [show]);

  useEffect(() => {
    return listenWindow('keyup', e => {
      if (e.key === 'Escape' && isChildOf(e.target as any, canRef.current)) setShowRef.current(false);
    });
  }, []);

  return (
    <>
      {!keepAlive &&
        show &&
        ReactDOM.createPortal(
          <div className="sg-popup-can" ref={el => (canRef.current = el!)}>
            {mask && <div className="sg-popup-mask" onContextMenu={close} onClick={close} />}
            {children}
            <popupContext.Provider value={popupState.current}></popupContext.Provider>
          </div>,
          document.body,
        )}
      {keepAlive &&
        ReactDOM.createPortal(
          <div className="sg-popup-can" style={{ display: show ? 'block' : 'none' }} ref={el => (canRef.current = el!)}>
            {mask && <div className="sg-popup-mask" onContextMenu={close} onClick={close} />}
            {children}
            <popupContext.Provider value={popupState.current}></popupContext.Provider>
          </div>,
          document.body,
        )}
    </>
  );
};
