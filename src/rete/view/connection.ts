import { Connection } from '../connection';
import { Emitter } from '../core/emitter';
import { EventsTypes } from '../events';
import { IO } from '../io';

interface INodeView {
    getSocketPosition(io: IO): [number, number];
    hasSocket(io: IO): boolean;
}

export class ConnectionView extends Emitter<EventsTypes> {

    connection: Connection;
    inputNode: INodeView;
    outputNode: INodeView;
    el: HTMLElement;

    constructor(connection: Connection, inputNode: INodeView, outputNode: INodeView, emitter: Emitter<EventsTypes>) {
        super(emitter);
        this.connection = connection;
        this.inputNode = inputNode;
        this.outputNode = outputNode;
        connection.view = this;

        this.el = document.createElement('div');
        this.el.style.position = 'absolute';
        this.el.style.zIndex = '-1';

        this.trigger('renderconnection', {
            el: this.el,
            connection: this.connection,
            points: this.getPoints()
        });
    }

    getPoints() {
        const { input, output } = this.connection

        if (this.inputNode.hasSocket(input) && this.outputNode.hasSocket(output)) {
            const [x1, y1] = this.outputNode.getSocketPosition(output);
            const [x2, y2] = this.inputNode.getSocketPosition(input);

            return [x1, y1, x2, y2];
        }

        return [0, 0, 0, 0]
    }

    update(updateColor?: boolean) {
        this.trigger('updateconnection', {
            el: this.el,
            connection: this.connection,
            points: this.getPoints(),
            updateColor,
        });
    }

    dispose() {
        this.trigger('disposeconnection', {
            el: this.el,
            connection: this.connection,
        });
    }
}
