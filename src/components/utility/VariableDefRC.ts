import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, NodeValueCfg, NodeListCfg, ReteNode } from '../../types';
import { NodeView, DynamicControl } from '../../view';
import { RC } from '../ReteComponent';
import { ReteVariableRefNode, VariableRefRC } from './VariableRefRC';

export type ReteVariableDefNode = ExtendReteNode<
  'VariableDef',
  {
    inValue: number | number[];
    inValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
    nameValue: string;
    nameValueType: ValueType.string;
  }
>;

declare module '../../rete/core/events' {
  interface EventsTypes {
    variablerefchange: {
      node: ReteVariableDefNode;
      nextName: string;
    };
  }
}

const onNameChange = (node: ReteVariableDefNode, value: string, editor: Rete.NodeEditor): boolean => {
  node.meta.label = value + '(VarDef)';
  editor.trigger('variablerefchange', { node, nextName: value });
  return true;
};

const NodeCfgs: { [label: string]: NodeValueCfg | NodeListCfg } = {
  Name: { dataKey: 'nameValue', labelWidth: '80px', onChange: onNameChange },
};

export class VariableDefRC extends RC {
  static Name = 'VariableDef';

  constructor() {
    super(VariableDefRC.Name);
    this.data.component = NodeView;
  }

  onRegister(editor: Rete.NodeEditor): void {
    const setHightLight = (defNode: Rete.Node, highlight: boolean) => {
      if (defNode.name === VariableDefRC.Name) {
        const defNodeId = String(defNode.id);
        const refNodes = editor.nodes.filter(i => i.name === VariableRefRC.Name && (i as ReteVariableRefNode).data.defNodeIdValue === defNodeId) as ReteNode[];
        refNodes.forEach(i => {
          i.meta.highlight = highlight;
          i.update();
        });
      }
    };
    editor.on('nodemouseenter', node => setHightLight(node, true));
    editor.on('nodemouseleave', node => setHightLight(node, false));
  }

  initNode(node: ReteVariableDefNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    node.initValueType('name', '', ValueType.string);
    data.expanded ??= true;
    data.preview ??= false;

    meta.previewDisabled = false;
    meta.category = 'utility';
    meta.internalIO = ['out'];
    meta.nodeCfgs = NodeCfgs;
    meta.uncloneable = true;
    if (data.nameValue) {
      meta.label = data.nameValue + '(VarDef)';
    }
  }

  async builder(node: ReteVariableDefNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteVariableDefNode>): SGNodeOutput {
    return { outputs: { out: compiler.getInputVarConverted(node, 'in') }, code: `` };
  }
}
