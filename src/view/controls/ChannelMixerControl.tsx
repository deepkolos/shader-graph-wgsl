import './ChannelMixerControl.less';
import React, { FC, useState } from 'react';
import { Rete, ReteNode } from '../../types';
import { Slider } from '../common';

interface ChannelMixerProps {
  node: ReteNode;
  keys: [string, string, string];
  onChange: (v: number[], key: string) => void;
  control: ChannelMixerControl;
}

const channels = ['R', 'G', 'B'];

export const ChannelMixer: FC<ChannelMixerProps> = ({ node, keys, onChange }) => {
  const [selected, setSelected] = useState(0);

  const set = (index: number, v: number) => {
    const out = [...(node.getValue(keys[selected]) as number[])];
    out[index] = v;
    onChange(out, keys[selected]);
  };

  return (
    <div className="sg-channelmixer">
      <div className="sg-channelmixer-channels">
        {channels.map((label, k) => (
          <div key={label}  className="sg-channelmixer-btn" data-aria-selected={k === selected} onClick={() => setSelected(k)}>
            {label}
          </div>
        ))}
      </div>
      {channels.map((label, k) => (
        <Slider key={label} label={label} value={node.getValue(keys[selected])[k]} onChange={v => set(k, v)} min={-2} max={2} step={0.1} />
      ))}
    </div>
  );
};
export class ChannelMixerControl extends Rete.Control {
  props: ChannelMixerProps;
  component = ChannelMixer;

  constructor(public rKey: string, public gKey: string, public bKey: string, node: ReteNode) {
    super(rKey);
    this.props = {
      onChange: this.onChange,
      node,
      keys: [rKey, gKey, bKey],
      control: this,
    };
  }

  onChange = (value: number[], key: string) => {
    this.setNodeValue(key, value);
    this.update();
  };
}
