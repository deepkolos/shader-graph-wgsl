import './ContextIO.less';
import { ReteNode } from '../../types';
import { Socket } from './Socket';
import React, { FC } from 'react';

interface ContextIOProps {
  bindSocket: Function;
  node: ReteNode;
}
export const ContextIO: FC<ContextIOProps> = ({ bindSocket, node }) => {
  const inputs = [...node.inputs.values()];
  const outputs = [...node.outputs.values()];

  return (
    <>
      <div className="sg-context-input-can">
        {inputs.map(input => (
          <div className="sg-context-input" key={input.key}>
            <Socket
              type="input"
              valueType={node.getValueType(input.key)}
              socket={input.socket}
              io={input}
              innerRef={bindSocket}
            >
              {inputs.length > 1 && <div className="sg-context-input-title">{input.name}</div>}
            </Socket>
          </div>
        ))}
      </div>

      <div className="sg-context-output-can">
        {outputs.map(output => (
          <div className="sg-context-output" key={output.key}>
            <Socket
              type="output"
              valueType={node.getValueType(output.key)}
              socket={output.socket}
              io={output}
              innerRef={bindSocket}
            >
              {outputs.length > 1 && <div className="sg-context-output-title">{output.name}</div>}
            </Socket>
          </div>
        ))}
      </div>
    </>
  );
};
