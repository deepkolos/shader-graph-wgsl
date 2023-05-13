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
      view: { props: any; el: HTMLElement; update: (cb?: () => void) => void | Promise<void> };
      callback?: () => void;
    };
  }
}

const Wrapper: FC<{ cb: () => void; children: React.ReactNode }> = ({ cb, children }) => {
  useEffect(cb);
  return <>{children}</>;
};

function install(editor: NodeEditor, { createRoot }: { createRoot?: typeof ICreateRoot }) {
  editor.bind('rendercustom');

  const roots = new Map<HTMLElement, Root>();
  const render = createRoot
    ? (element: React.ReactChild, container: HTMLElement) => {
        if (!roots.has(container)) roots.set(container, createRoot(container));
        roots.get(container)!.render(element);
      }
    : ReactDOM.render;

  editor.on(
    'rendernode',
    ({ el, node, component, bindSocket, bindControl, bindBlock, callback, view }) => {
      if (component.render && component.render !== 'react') return;
      const Component = component.component;

      node.update = (cb?: () => void) =>
        render(
          <Wrapper cb={() => cb?.()}>
            <Component
              view={view}
              node={node}
              editor={editor}
              bindSocket={bindSocket}
              bindControl={bindControl}
              bindBlock={bindBlock}
            />
          </Wrapper>,
          el,
        );
      node.update(callback);
    },
  );

  editor.on('disposenode', ({ el }) => {
    // React FiberNode 双缓冲 需要额外2次渲染才能删除
    // https://juejin.cn/post/7118259566868955167#heading-34
    render(<></>, el);
    setTimeout(() => {
      render(<></>, el);
      setTimeout(() => {
        render(<></>, el);
        // 避免 sync unmount warning 但是如果只调用下面部分会导致props依然持有
        setTimeout(() => {
          el.remove?.();
          if (createRoot) {
            roots.get(el)?.unmount();
            roots.delete(el);
          } else {
            ReactDOM.unmountComponentAtNode(el);
          }
        });
      }, 28);
    }, 28);
  });

  editor.on('rendercontrol', ({ el, control, callback }) => {
    if (control.render && control.render !== 'react') return;
    const Component = control.component;

    control.update = (cb?: () => void) =>
      render(
        <Wrapper cb={() => cb?.()}>
          <Component {...control.props} />
        </Wrapper>,
        el,
      );
    control.update(callback);
  });

  editor.on('rendercustom', ({ render: renderer, component, view, callback }) => {
    if (renderer !== 'react') return;

    const Component = component;
    view.update = (cb?: () => void) =>
      render(
        <Wrapper cb={() => cb?.()}>
          <Component {...view.props} />
        </Wrapper>,
        view.el,
      );
    view.update(callback);
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
