import { ParameterView } from '../../view';
import { Sockets } from '../../sockets';
import { ValueType, Rete, ValueTypeSocketMap, ExtendReteNode } from '../../types';
import { RC } from '../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';

declare module '../../rete/core/events' {
  interface EventsTypes {
    parameterchange: {
      name: string;
      outValue: any;
      outValueType: ValueType;
      outValueName: string;
      exposed: boolean;
    };
    parameterdelete: { name: string };
  }
}

export type ReteParameterNode = ExtendReteNode<
  'Parameter',
  {
    outValue: any;
    outValueType: ValueType;
    outValueName: string;
  }
>;

export class ParameterRC extends RC {
  static Name = 'Parameter';
  constructor() {
    super(ParameterRC.Name);
    this.data.component = ParameterView;
  }

  onRegister(editor: Rete.NodeEditor): void {
    editor.bind('parameterchange');
    editor.bind('parameterdelete');
    editor.on('parameterchange', ({ name, outValue, outValueName, outValueType, exposed }) => {
      const nodes = editor.nodes.filter(node => node.name === ParameterRC.Name && node.data.outValueName === name);
      nodes.forEach(node => {
        node.data.outValue = outValue;
        node.data.outValueName = outValueName;
        node.data.outValueType = outValueType;
        node.data.exposed = exposed;
        node.dataChanged = true;
        node.update();
      });
    });

    editor.on('parameterdelete', ({ name }) => {
      const nodes = editor.nodes.filter(node => node.name === ParameterRC.Name && node.data.outValueName === name);
      nodes.forEach(node => {
        // unity sg 是根据类型创建占位节点替换 删除已有, vfx graph则是不删除节点, 但是会标记invalid
        // 目前简单移除节点
        editor.removeNode(node);
      });
    });
  }

  initNode(node: ReteParameterNode) {
    const { data, meta } = node;
    node.initValueType('out', 0, ValueType.float);
    data.exposed ??= true;
    data.expanded ??= true;
    meta.category = '';
    meta.previewDisabled = true;
  }

  async builder(node: ReteParameterNode) {
    this.initNode(node);

    const out = new Rete.Output('out', 'Out', ValueTypeSocketMap[node.getValueType('out') as ValueType] || Sockets.dynamicVector);
    node.addOutput(out);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteParameterNode>): SGNodeOutput {
    let outVar = '';
    if (node.outputs.out.connections.length) {
      outVar = compiler.setParameter(node);
    }
    return { outputs: { out: outVar }, code: '' };
  }
}
