import ReactDOM from 'react-dom';
import type { createRoot as ICreateRoot, Root } from 'react-dom/client';
import { Rete } from '../types';
import { NodeEditor } from '../rete';
import { Plugin } from '../rete/core/plugin';
import React, { FC, useEffect } from 'react';

declare module '../rete/core/events' {
  interface EventsTypes {
    rendercustom: {
      render: string;
      component: any;
      view: { props: any; el: HTMLElement; update: () => void | Promise<void> };
      callback?: () => void;
    };
  }
}

const Wrapper: FC<{ cb: () => void; children: React.ReactNode }> = ({ cb, children }) => {
  useEffect(cb);
  return <>{children}</>;
};

function install(editor: NodeEditor, { createRoot }: { createRoot: typeof ICreateRoot }) {
  editor.bind('rendercustom');

  const roots = new Map<HTMLElement, Root>();
  const render = createRoot
    ? (element: React.ReactChild, container: HTMLElement) => {
        if (!roots.has(container)) roots.set(container, createRoot(container));
        roots.get(container)!.render(element);
      }
    : ReactDOM.render;

  editor.on('rendernode', ({ el, node, component, bindSocket, bindControl, bindBlock, callback, view }) => {
    if (component.render && component.render !== 'react') return;
    const Component = component.component;

    let eventCBTriggered = false;

    node.update = (cb?: () => void) =>
      render(
        <Wrapper
          cb={() => {
            if (!eventCBTriggered) {
              callback?.();
              eventCBTriggered = true;
            }
            cb?.();
          }}>
          <Component view={view} node={node} editor={editor} bindSocket={bindSocket} bindControl={bindControl} bindBlock={bindBlock} />
        </Wrapper>,
        el,
      );
    node.update();
  });

  editor.on('rendercontrol', ({ el, control }) => {
    if (control.render && control.render !== 'react') return;
    const Component = control.component;

    control.update = (cb?: () => void) =>
      render(
        <Wrapper cb={() => cb?.()}>
          <Component {...control.props} />
        </Wrapper>,
        el,
      );
    control.update();
  });

  editor.on('rendercustom', ({ render: renderer, component, view, callback }) => {
    if (renderer !== 'react') return;

    let eventCBTriggered = false;

    const Component = component;
    view.update = (cb?: () => void) =>
      render(
        <Wrapper
          cb={() => {
            if (!eventCBTriggered) {
              callback?.();
              eventCBTriggered = true;
            }
            cb?.();
          }}>
          <Component {...view.props} />
        </Wrapper>,
        view.el,
      );
    view.update();
  });

  editor.on(['connectioncreated', 'connectionremoved'], connection => {
    connection.output.node!.update();
    connection.input.node!.update();
  });

  let previousSelected: Rete.Node[] = [];

  editor.on('nodeselected', node => {
    const selected = [...editor.selected.list];

    previousSelected
      .filter(n => !selected.includes(n))
      .filter(n => (n as any)._reactComponent)
      .forEach(n => n.update());
    if ((node as any)._reactComponent) node.update();
    previousSelected = selected;
  });
}

export const ReactRenderPlugin: Plugin = {
  name: 'ReactRenderPlugin',
  install,
};
