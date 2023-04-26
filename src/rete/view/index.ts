import { Area } from './area';
import { Component } from '../engine/component';
import { Connection } from '../connection';
import { ConnectionView } from './connection';
import { Emitter } from '../core/emitter';
import { EventsTypes } from '../events';
import { Node } from '../node';
import { NodeView } from './node';
import { listenWindow } from './utils';
import { BlockView } from './block';

export class EditorView extends Emitter<EventsTypes> {

    container: HTMLElement;
    components: Map<string, Component>;
    nodes = new Map<Node, NodeView>();
    connections = new Map<Connection, ConnectionView>();
    area: Area;

    // eslint-disable-next-line max-statements
    constructor(container: HTMLElement, components: Map<string, Component>, emitter: Emitter<EventsTypes>) {
        super(emitter);

        this.container = container;
        this.components = components;

        this.container.style.overflow = 'hidden';

        this.container.addEventListener('click', this.click.bind(this));
        this.container.addEventListener('contextmenu', e => this.trigger('contextmenu', { e, view: this }));
        emitter.on('destroy', listenWindow('resize', this.resize.bind(this)));
        emitter.on('destroy', () => this.nodes.forEach(view => view.destroy()));

        this.on('nodetranslated', this.updateConnections.bind(this));
        this.on('rendersocket', ({ input, output }) => {
            const connections = Array.from(this.connections.entries())
            const relatedConnections = connections.filter(([connection]) => {
                return connection.input === input || connection.output === output
            })

            relatedConnections.forEach(([_, view]) => requestAnimationFrame(() => view.update()))
        })

        this.area = new Area(container, this);
        this.container.appendChild(this.area.el);
    }

    addNode(node: Node) {
        const component = this.components.get(node.name);

        if (!component) throw new Error(`Component ${node.name} not found`);

        const nodeView = new NodeView(node, component, this, this.components);

        this.nodes.set(node, nodeView);
        this.area.appendChild(nodeView.el);
    }

    removeNode(node: Node) {
        if (node.contextNode) {
            const nodeView = this.nodes.get(node.contextNode);
            if (nodeView) {
                const blockView = nodeView.blocks.get(node);
                nodeView.blocks.delete(node);
                blockView?.destroy();
                node.contextNode.update();
            }
        } else {
            const nodeView = this.nodes.get(node);

            this.nodes.delete(node);
            if (nodeView) {
                this.area.removeChild(nodeView.el);
                nodeView.destroy();
            }
        }
    }

    addConnection(connection: Connection) {
        if (!connection.input.node || !connection.output.node)
            throw new Error('Connection input or output not added to node');

        let viewInput: NodeView | BlockView | undefined, viewOutput: NodeView | BlockView | undefined;
        if (connection.input.node.contextNode) {
            const contextView = this.nodes.get(connection.input.node.contextNode);
            viewInput = contextView?.blocks.get(connection.input.node);
        } else viewInput = this.nodes.get(connection.input.node);

        if (connection.output.node.contextNode) {
            const contextView = this.nodes.get(connection.output.node.contextNode);
            viewOutput = contextView?.blocks.get(connection.output.node);
        } else viewOutput = this.nodes.get(connection.output.node);

        if (!viewInput || !viewOutput)
            throw new Error('View node not found for input or output');

        const connView = new ConnectionView(connection, viewInput, viewOutput, this);

        this.connections.set(connection, connView);
        this.area.appendChild(connView.el);
    }

    removeConnection(connection: Connection) {
        const connView = this.connections.get(connection);

        this.connections.delete(connection);
        if (connView)
            this.area.removeChild(connView.el);
    }

    updateConnections({ node }: { node: Node }) {
        node.getConnections().forEach(conn => {
            const connView = this.connections.get(conn);

            if (!connView) throw new Error('Connection view not found');

            connView.update();
        });

        node.blocks.forEach(node => this.updateConnections({ node }));
    }

    resize() {
        const { container } = this;

        if (!container.parentElement)
            throw new Error('Container doesn\'t have parent element');

        const width = container.parentElement.clientWidth;
        const height = container.parentElement.clientHeight;

        container.style.width = width + 'px';
        container.style.height = height + 'px';
    }

    click(e: Event) {
        const container = this.container;

        if (container !== e.target) return;
        if (!this.trigger('click', { e, container })) return;
    }
}
