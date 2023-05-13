import { BufferGeometry } from 'three';
import { ShaderGraphEditor } from '../../editors';
import { Plugin } from '../../rete/core/plugin';
import { ReteNode } from '../../types';
import { PreviewClient } from './PreviewClient';
import { PreviewServer } from './PreviewServer';
export * from './PreviewCustomMeshPlugin';

declare module '../../rete/core/events' {
  interface EventsTypes {
    previewclientcreate: { canvas: HTMLCanvasElement; node?: ReteNode; type?: '2d' | '3d'; enable?: boolean };
    previewclientremove: { canvas: HTMLCanvasElement };
    previewclientupdate: { canvas: HTMLCanvasElement; type?: '2d' | '3d'; enable?: boolean };
    previewsettingupdate: { geometry: string };
    previewcopyshader: { node: ReteNode; callback: (data?: { fragCode: string; vertCode: string }) => void };
    previewcustommesh: (geometry?: BufferGeometry) => void;
  }
}

export const PreviewPlugin: Plugin = {
  name: 'PreviewPlugin',
  install(editor: ShaderGraphEditor) {
    editor.bind('previewclientcreate');
    editor.bind('previewclientremove');
    editor.bind('previewclientupdate');
    editor.bind('previewsettingupdate');
    editor.bind('previewcopyshader');
    editor.bind('previewcustommesh');

    const server = new PreviewServer(editor);

    editor.on('previewclientcreate', ({ canvas, enable, type, node }) => {
      const client = new PreviewClient(canvas, node);
      client.set(enable, type);
      server.add(client);
    });

    editor.on('previewclientupdate', ({ canvas, enable, type }) => {
      server.clients.get(canvas)?.set(enable, type);
    });

    editor.on('previewclientremove', ({ canvas }) => {
      server.remove(canvas);
    });

    editor.on('noderemoved', node => {
      server.removeNode(node);
    });

    editor.on(
      ['paramterchange', 'imported', 'nodecreated', 'noderemoved', 'connectioncreated', 'connectionremoved', 'settingupdated'],
      () => {
        if (editor.silent || editor.clearing) return;
        server.updateAllMaterial();
      },
    );

    editor.on('previewcopyshader', ({ node, callback }) => {
      const client = [...server.nodeClients].find(i => i.node === node);
      if (client) {
        const { fragmentShader: fragCode, vertexShader: vertCode } = client.material;
        callback({ fragCode, vertCode });
      } else callback();
    });

    editor.on('previewsettingupdate', ({ geometry }) => {
      server.updateGeometry3D(geometry);
    });

    editor.on('destroy', () => {
      server.dispose();
    });
  },
};
