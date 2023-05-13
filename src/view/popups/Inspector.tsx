import './Inspector.less';
import React, { FC, useEffect, useRef, useState } from 'react';
import { Rete, ReteNode } from '../../types';
import { Moveable, Popup, Settings, SettingValueCfgs, Tab } from '../common';
import { PopupView, PopupViewProps } from '.';

type Setting = { [k: string]: any };

interface InspectorProps extends PopupViewProps {
  setting: Setting;
  view: InspectorView;
  graphSettingValueCfgs: SettingValueCfgs;
}

export const Inspector: FC<InspectorProps> = ({ editor, view, setting, graphSettingValueCfgs }) => {
  const [tab, setTab] = useState('Graph Setting');
  const [nodeSetting, setNodeSetting] = useState<{ [k: string]: any }>();
  const [nodeValueCfgs, setNodeValueCfgs] = useState<SettingValueCfgs>({});
  const nodeRef = useRef<ReteNode>();

  const onNodeSettingChange = (name: string, value: any) => {
    const node = nodeRef.current!;
    const nodeCfg = (node.meta.nodeCfgs || {})[name];
    if (name === 'Preview') {
      node.data.previewType = value;
      node.update();
      setNodeSetting({ ...nodeSetting, [name]: value });
      return;
    }
    if (!nodeCfg) return;
    if ('dataKey' in nodeCfg) {
      // NodeValueChange
      if (nodeCfg.onChange?.(node, value, editor) ?? true) {
        node!.data[nodeCfg.dataKey] = value;
        node.update();
        setNodeSetting({ ...nodeSetting, [name]: value });
      }
    } else {
      // NodeListChange
      nodeCfg.onChange?.(node, value, editor);
      node.update();
    }
  };

  useEffect(() => {
    return editor.on('nodeselected', node => {
      setTab('Node Setting');
      const nodeCfgs = (node as ReteNode).meta.nodeCfgs || {};

      const nodeSetting: Setting = {};
      const nodeValueCfgs: SettingValueCfgs = { '': { constant: true } };

      if (!(node as ReteNode).meta.previewDisabled) {
        nodeValueCfgs['Preview'] = { options: ['2d', '3d'] };
        nodeSetting['Preview'] = (node as ReteNode).data.previewType || '2d';
      }

      Object.keys(nodeCfgs).reduce((acc, label) => {
        const itemCfg = nodeCfgs[label];
        if ('dataKey' in itemCfg) {
          // NodeValueCfg
          acc[label] = node.data[itemCfg.dataKey];
          nodeValueCfgs[label] = itemCfg;
        } else {
          // NodeListCfg
          acc[label] = itemCfg.list;
          nodeValueCfgs[label] = { list: itemCfg };
        }
        return acc;
      }, nodeSetting);

      setNodeValueCfgs(nodeValueCfgs);
      setNodeSetting({ '': node.name, ...nodeSetting });
      nodeRef.current = node as any;
    });
  }, []);

  return (
    <Popup view={view} mask={false} keepAlive root={editor.view.container}>
      <Moveable x={Infinity} y={0} gap={20} containerEl={editor.view.container}>
        <div className="sg-inspector sg-blackboard">
          <div className="sg-blackboard-head">
            <div className="sg-inspector-title">Graph Inspector</div>
          </div>
          <div className="sg-inspector-body sg-blackboard-body">
            <Tab
              currentTab={tab}
              tabs={[
                {
                  name: 'Node Setting',
                  content: <Settings editor={editor} setting={nodeSetting} valueCfgs={nodeValueCfgs} onChange={onNodeSettingChange} />,
                },
                {
                  name: 'Graph Setting',
                  content: (
                    <Settings
                      editor={editor}
                      setting={setting}
                      valueCfgs={graphSettingValueCfgs}
                      onChange={(name: string, value: any) => view.setSetting(name, value)}
                    />
                  ),
                },
              ]}
              onTabChange={setTab as any}
            />
          </div>
        </div>
      </Moveable>
    </Popup>
  );
};

export class InspectorView extends PopupView<InspectorProps> {
  setting: Setting;
  constructor(editor: Rete.NodeEditor, graphSettingValueCfgs: SettingValueCfgs) {
    super(editor, Inspector);
    this.setting = {};
    this.props = { editor, view: this, setting: this.setting, graphSettingValueCfgs };
  }

  fromJSON(setting: Setting) {
    this.setting = { ...this.setting, ...setting };
    this.props.setting = setting;
    this.update();
  }

  toJSON(): Setting {
    return { ...this.setting };
  }

  setSetting(name: string, value: any) {
    this.setting[name] = value;
    this.props.setting = { ...this.setting };
    this.setting = this.props.setting;
    this.editor.trigger('settingupdated', { name, value, setting: this.setting });
    this.update();
  }
}
