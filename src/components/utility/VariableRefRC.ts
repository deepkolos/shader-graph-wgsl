import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import { ExtendReteNode, ValueType, Rete, ReteNode } from '../../types';
import { NodeView, DynamicControl } from '../../view';
import { RC } from '../ReteComponent';
import { VariableDefRC } from './VariableDefRC';

export type ReteVariableRefNode = ExtendReteNode<
  'VariableRef',
  {
    inValue: number | number[];
    inValueType: ValueType;
    outValue: number | number[];
    outValueType: ValueType;
    outValueName: string;
    defNodeIdValue: string;
    defNodeIdValueType: ValueType.string;
  }
>;

export class VariableRefRC extends RC {
  static Name = 'VariableRef';
  constructor() {
    super(VariableRefRC.Name);
    this.data.component = NodeView;
  }

  onRegister(editor: Rete.NodeEditor): void {
    editor.bind('variablerefchange');
    editor.on('variablerefchange', ({ node: defNode, nextName }) => {
      const defNodeId = String(defNode.id);
      editor.nodes
        .filter(node => node.name === VariableRefRC.Name && node.data.defNodeIdValue === defNodeId)
        .forEach(node => {
          (node as ReteVariableRefNode).data.outValueName = nextName;
          node.update();
        });
    });

    editor.on('noderemoved', defNode => {
      if (defNode.name === VariableDefRC.Name) {
        const defNodeId = String(defNode.id);
        editor.nodes.filter(node => node.name === VariableRefRC.Name && node.data.defNodeIdValue === defNodeId).forEach(node => editor.removeNode(node));
      }
    });

    const setHightLight = (refNode: Rete.Node, highlight: boolean) => {
      if (refNode.name === VariableRefRC.Name) {
        const defNodeId = Number(refNode.data.defNodeIdValue);
        const defNode = editor.nodes.find(i => i.name === VariableDefRC.Name && i.id === defNodeId) as ReteNode | null;
        if (defNode) {
          defNode.meta.highlight = highlight;
          defNode.update();
        }
      }
    };
    editor.on('nodemouseenter', node => setHightLight(node, true));
    editor.on('nodemouseleave', node => setHightLight(node, false));
  }

  initNode(node: ReteVariableRefNode) {
    const { data, meta } = node;
    node.initValueType('in', 0, ValueType.float);
    node.initValueType('out', 0, ValueType.float);
    node.initValueType('defNodeId', '', ValueType.string);
    data.expanded ??= true;
    data.preview ??= false;

    meta.previewDisabled = false;
    meta.category = '';
    meta.internalIO = ['in'];
  }

  async builder(node: ReteVariableRefNode) {
    this.initNode(node);
    const a = new Rete.Input('in', 'In', Sockets.dynamicVector);
    const out = new Rete.Output('out', 'Out', Sockets.dynamicVector);

    a.addControl(new DynamicControl('in', node));
    node.addOutput(out).addInput(a);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteVariableRefNode>): SGNodeOutput {
    return { outputs: { out: compiler.getInputVarConverted(node, 'in') }, code: `` };
  }
}
