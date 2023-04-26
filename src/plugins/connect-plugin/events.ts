import { Connection, Input, Output } from '../../rete';

declare module '../../rete/core/events' {
  interface EventsTypes {
    connectionpath: {
      points: number[];
      connection: Connection;
      d: string;
    };
    connectiondrop: Input | Output;
    connectionpick: Input | Output;
    connectionselected: Connection;
    resetconnection: void;
  }
}
