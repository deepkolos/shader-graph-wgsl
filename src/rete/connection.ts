import { Input } from './input';
import { Output } from './output';
import { ConnectionView } from './view/connection';

export class Connection {

    output: Output;
    input: Input;
    data: unknown = {};
    view?: ConnectionView;

    constructor(output: Output, input: Input) {
        this.output = output;
        this.input = input;
        this.data = {};

        this.input.addConnection(this);
    }

    remove() {
        this.input.removeConnection(this);
        this.output.removeConnection(this);
    }
}