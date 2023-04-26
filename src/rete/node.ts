import { Connection } from './connection';
import { Control } from './control';
import { Input } from './input';
import { Output } from './output';
import { InputsData, NodeData, OutputsData } from './core/data';

export class Node {

    name: string;
    id: number;
    position: [number, number] = [0.0, 0.0];
    inputs = new Map<string, Input>();
    outputs = new Map<string, Output>();
    controls = new Map<string, Control>();
    blocks: Array<Node> = [];
    data: {[key: string]: unknown} = {};
    meta: {[key: string]: unknown} = {};
    contextNode?: Node;

    static latestId = 0;
    dataChanged = false;

    constructor(name: string) {
        this.name = name;
        this.id = Node.incrementId();
    }

    get changed(): boolean {
        return this.dataChanged || this.blocks.some(block => block.changed);
    }

    resetChanged() {
        this.dataChanged = false;
        this.blocks.forEach(block => block.dataChanged = false);
    }

    _add<T extends { key: string } & Record<string, any>>(list: Map<string, T>, item: T, prop: string) {
        if (list.has(item.key))
            throw new Error(`Item with key '${item.key}' already been added to the node`);
        if (item[prop] !== null)
            throw new Error('Item has already been added to some node');

        (item as Record<string, Node>)[prop] = this;
        list.set(item.key, item);
    }

    addControl(control: Control) {
        this._add(this.controls, control, 'parent');
        return this;
    }

    removeControl(control: Control) {
        control.parent = null;

        this.controls.delete(control.key);
    }

    addInput(input: Input) {
        this._add(this.inputs, input, 'node');
        return this;
    }

    removeInput(input: Input) {
        input.removeConnections();
        input.node = null;

        this.inputs.delete(input.key);
    }

    addOutput(output: Output) {
        this._add(this.outputs, output, 'node');
        return this;
    }

    removeOutput(output: Output) {
        output.removeConnections();
        output.node = null;

        this.outputs.delete(output.key);
    }

    addBlock(node: Node) {
        this.blocks.push(node);
        node.contextNode = this;
        this.update();
        return this;
    }

    setMeta (meta: {[key: string]: unknown}) {
        this.meta = meta;
        return this;
    }

    getConnections() {
        const ios = [...this.inputs.values(), ...this.outputs.values()];
        const connections = ios.reduce((arr, io) => {
            return [...arr, ...io.connections];
        }, [] as Connection[]);

        return connections;
    }

    getInputConnections() {
        const ios = [...this.inputs.values()];
        const connections = ios.reduce((arr, io) => {
            return [...arr, ...io.connections];
        }, [] as Connection[]);

        return connections;
    }

    update(cb?: () => void) {}

    get label() {
        return (this.meta.label as string) ?? this.name;
    }

    getValue(prefix: string): any {
        const [prefix_, subKey] = prefix.split('.');
        if (subKey) {
            return (this.data[prefix_ + 'Value'] as any)?.[subKey];
        }
        return this.data[prefix_ + 'Value'];
    }

    setValue(prefix: string, value: any) {
        const [prefix_, subKey] = prefix.split('.');
        if (subKey && this.data[prefix_ + 'Value']) {
            (this.data[prefix_ + 'Value'] as any)[subKey] = value;
        } else {
            this.data[prefix_ + 'Value'] = value;
        }
        this.dataChanged = true;
    }

    getValueType(prefix: string): string {
        return this.data[prefix + 'ValueType'] as string;
    }

    setValueType(prefix: string, type: string) {
        this.data[prefix + 'ValueType'] = type;
    }

    getValueName(prefix: string): string {
        return this.data[prefix + 'ValueName'] as string;
    }

    setValueName(prefix: string, name: string) {
        this.data[prefix + 'ValueName'] = name;
    }

    removeValue(prefix: string) {
        delete this.data[prefix + 'Value'];
        delete this.data[prefix + 'ValueType'];
        delete this.data[prefix + 'ValueName'];
    }

    initValueType(prefix: string, value: any, type?: string, name?: string) {
        if (this.data[prefix + 'ValueType'] === undefined) {
            this.setValue(prefix, value);
            type && this.setValueType(prefix, type);
            name && this.setValueName(prefix, name);
        }
    }

    isContext() {
        return this.blocks.length > 0 || this.meta.isContext;
    }

    static incrementId() {
        if (!this.latestId)
            this.latestId = 1
        else
            this.latestId++
        return this.latestId
    }

    static resetId() {
        this.latestId = 0;
    }

    toJSON(): NodeData {
        const reduceIO = <T extends Record<string, any>>(list: Map<string, Input | Output>) => {
            return Array.from(list).reduce<T>((obj, [key, io]) => {
                (obj as Record<string, any>)[key] = io.toJSON();
                return obj;
            }, {} as any)
        }

        return {
            'id': this.id,
            'data': this.data,
            'inputs': reduceIO<InputsData>(this.inputs),
            'outputs': reduceIO<OutputsData>(this.outputs),
            'blocks': this.blocks.map(i => i.toJSON()),
            'position': this.position,
            'name': this.name,
            'contextId': this.contextNode?.id,
        }
    }

    static fromJSON(json: NodeData) {
        const node = new Node(json.name);
        const [x, y] = json.position;

        node.id = json.id;
        node.data = json.data;
        node.position = [x, y];
        node.name = json.name;
        node.blocks = json.blocks.map(Node.fromJSON);
        Node.latestId = Math.max(node.id, Node.latestId);

        return node;
    }
}
