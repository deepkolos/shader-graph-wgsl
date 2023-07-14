import './IO.less';
import React, { FC } from 'react';
import { ReteNode, ValueTypeAbbreviationMap } from '../../types';
import { Socket } from './Socket';
import { Control } from '../controls';
import { Rete } from '../../types';

export const IO: FC<{
  inputs: Rete.Input[];
  outputs: Rete.Output[];
  bindSocket: Function;
  bindControl: Function;
  node: ReteNode;
  gapTop?: boolean;
  gapBottom?: boolean;
  outputCanClass?: string;
  outputClass?: string;
}> = ({ inputs, outputs, bindSocket, bindControl, node, gapTop = true, gapBottom = true, outputCanClass, outputClass }) => {
  const expanded = node.data.expanded;
  const inputsShow = expanded ? inputs : inputs.filter(i => i.hasConnection());
  const outputsShow = expanded ? outputs : outputs.filter(i => i.hasConnection());
  const showInputCan = inputsShow.length > 0;
  const showOutputCan = outputsShow.length > 0;
  const showGap = showInputCan || showOutputCan;
  return (
    <div className="sg-node-io-can" data-gap-top={gapTop && showGap} data-gap-bottom={gapBottom && showGap}>
      {showInputCan && (
        <div className="sg-node-input-can">
          {inputsShow.map(input => (
            <div className="sg-node-input" key={input.key}>
              <Socket type="input" valueType={node.getValueType(input.key)} socket={input.socket} io={input} innerRef={bindSocket} />
              <div className="sg-node-input-title">
                {node.getValueName(input.key) || input.name}
                {`(${ValueTypeAbbreviationMap[node.getValueType(input.key)] || ''})`}
              </div>
              {input.showControl() && <Control className="sg-node-input-control" control={input.control} innerRef={bindControl} />}
            </div>
          ))}
        </div>
      )}
      {showInputCan && showOutputCan && <div className="sg-node-io-gap" />}
      {showOutputCan && (
        <div className={`sg-node-output-can ${outputCanClass}`}>
          {outputsShow.map(output => (
            <div className={`sg-node-output ${outputClass}`} key={output.key}>
              <div className="sg-node-output-title">
                {node.getValueName(output.key) || output.name}
                {`(${ValueTypeAbbreviationMap[node.getValueType(output.key)] || ''})`}
              </div>

              <Socket valueType={node.getValueType(output.key)} type="output" socket={output.socket} io={output} innerRef={bindSocket} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
