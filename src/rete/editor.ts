import { Component } from './component';
import { Connection } from './connection';
import { Context } from './core/context';
import { Data } from './core/data';
import { EditorView } from './view/index';
import { Input } from './input';
import { Node } from './node';
import { Output } from './output';
import { Selected } from './selected';
import { Validator } from './core/validator';
import { listenWindow } from './view/utils';
import { EditorEvents, EventsTypes } from './events';

export class NodeEditor extends Context<EventsTypes> {

    nodes: Node[] = [];
    selected = new Selected();
    view: EditorView;

    constructor(id: string, container: HTMLElement) {
        super(id, new EditorEvents());

        this.view = new EditorView(container, this.components, this);

        this.on('destroy', listenWindow('keydown', e => this.trigger('keydown', e)));
        this.on('destroy', listenWindow('keyup', e => this.trigger('keyup', e)));

        this.on('selectnode', ({ node, accumulate }) => this.selectNode(node, accumulate));
        this.on('nodeselected', () => this.selected.each(n => {
            const nodeView = this.view.nodes.get(n);

            nodeView && nodeView.onStart()
        }));
        this.on('translatenode', ({ dx, dy }) => this.selected.each(n => {
            const nodeView = this.view.nodes.get(n);

            nodeView && nodeView.onDrag(dx, dy)
        }));
    }

    addNode(node: Node) {
        if (!this.trigger('nodecreate', node)) return;

        this.nodes.push(node);
        this.view.addNode(node);

        this.trigger('nodecreated', node);
    }

    removeNode(node: Node) {
        if (!this.trigger('noderemove', node)) return;

        node.getConnections().forEach(c => this.removeConnection(c));

        if (node.contextNode) {
            const blocks = node.contextNode.blocks;
            blocks.splice(blocks.indexOf(node), 1);
        } else {
            this.nodes.splice(this.nodes.indexOf(node), 1);
        }
        this.view.removeNode(node, !this.silent);

        this.trigger('noderemoved', node);
    }

    addBlock(contextNode: Node, node: Node, ...other: any[]) {
        if (contextNode.blocks.every(i => i.name !== node.name)) {
            contextNode.addBlock(node);
        } else {
            console.warn('Block Exists', node.name);
        }
    }

    connect(output: Output, input: Input, data: unknown = {}) {
        if (!this.trigger('connectioncreate', { output, input })) return;

        try {
            const connection = output.connectTo(input);

            connection.data = data;
            this.view.addConnection(connection);

            this.trigger('connectioncreated', connection);
        } catch (e) {
            this.trigger('warn', e as Error)
        }
    }

    removeConnection(connection: Connection) {
        if (!this.trigger('connectionremove', connection)) return;

        this.view.removeConnection(connection);
        connection.remove();

        this.trigger('connectionremoved', connection);
    }

    selectNode(node: Node, accumulate = false) {
        if (!node.contextNode && this.nodes.indexOf(node) === -1)
            throw new Error('Node not exist in list');

        if (!this.trigger('nodeselect', node)) return;

        this.selected.add(node, accumulate);

        this.trigger('nodeselected', node);
    }

    getComponent(name: string) {
        const component = this.components.get(name);

        if (!component)
            throw `Component ${name} not found`;

        return component as Component;
    }

    register(component: Component) {
        super.register(component)
        component.editor = this;
        component.onRegister(this);
    }

    createNode(name: string, data?: any) {
        return this.getComponent(name).createNode(data);
    }

    clear() {
        [...this.nodes].forEach(node => this.removeNode(node));
        this.trigger('clear');
    }

    toJSON() {
        const data: Data = { id: this.id, nodes: {} };

        this.nodes.forEach(node => data.nodes[node.id] = node.toJSON());
        this.trigger('export', data);
        return data;
    }

    beforeImport(json: Data) {
        // const checking = Validator.validate(this.id, json);

        // if (!checking.success) {
        //     this.trigger('warn', checking.msg);
        //     return false;
        // }

        this.silent = true;
        this.clear();
        this.trigger('import', json);
        return true;
    }

    afterImport() {
        this.silent = false;
        return true;
    }

    async fromJSON(json: Data) {
        if (!this.beforeImport(json)) return false;
        const nodes: {[key: string]: Node} = {};

        try {
            const contextNodes: Node[] = [];
            await Promise.all(Object.keys(json.nodes).map(async id => {
                const node = json.nodes[id];
                const component = this.getComponent(node.name);

                nodes[id] = await component.build(Node.fromJSON(node));
                await Promise.all(nodes[id].blocks.map(block => this.getComponent(block.name).build(block)))
                this.addNode(nodes[id]);
                if (node.blocks.length) contextNodes.push(nodes[id]);
            }));

            await new Promise(r => setTimeout(r, 10));

            Object.keys(json.nodes).forEach(id => {
                const jsonNode = json.nodes[id];
                const node = nodes[id];

                Object.keys(jsonNode.outputs).forEach(key => {
                    const outputJson = jsonNode.outputs[key];

                    outputJson.connections.forEach(jsonConnection => {
                        const nodeId = jsonConnection.node;
                        const data = jsonConnection.data;
                        const targetOutput = node.outputs.get(key);
                        let targetInput: Input | undefined;
                        if (nodes[nodeId]) targetInput = nodes[nodeId].inputs.get(jsonConnection.input);
                        else {
                            // block
                            contextNodes.find(node => node.blocks.some(block => {
                                if (block.id === nodeId) {
                                    targetInput = block.inputs.get(jsonConnection.input);
                                    return true;
                                }
                            }))
                        }
                        if (!targetOutput || !targetInput) {
                            return this.trigger('error', `IO not found for node ${node.id}`);
                        }

                        this.connect(targetOutput, targetInput, data);
                    });
                });

            });
        } catch (e) {
            this.trigger('warn', e as Error);
            return !this.afterImport();
        }

        return this.afterImport();
    }
}
