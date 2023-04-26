import { Control } from '../control';
import { Emitter } from '../core/emitter';
import { EventsTypes } from '../events';

export class ControlView extends Emitter<EventsTypes> {
  constructor(public el: HTMLElement, public control: Control, emitter: Emitter<EventsTypes>) {
    super(emitter);
    this.onRebind();
  }

  onRebind() {
    const { el, control } = this;
    this.trigger('rendercontrol', { el, control });
  }
}
