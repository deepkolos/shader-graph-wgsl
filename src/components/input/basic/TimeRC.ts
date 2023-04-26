import { NodeView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteTimeNode = ExtendReteNode<
  'Time',
  {
    timeValue: number;
    timeValueType: ValueType.float;
    sinTimeValue: number;
    sinTimeValueType: ValueType.float;
    cosTimeValue: number;
    cosTimeValueType: ValueType.float;
    deltaTimeValue: number;
    deltaTimeValueType: ValueType.float;
    smoothDeltaValue: number;
    smoothDeltaValueType: ValueType.float;
  }
>;

export class TimeRC extends RC {
  constructor() {
    super('Time');
    this.data.component = NodeView;
  }

  initNode(node: ReteTimeNode) {
    const { data, meta } = node;
    node.initValueType('time', 0, ValueType.float);
    node.initValueType('sinTime', 0, ValueType.float);
    node.initValueType('cosTime', 0, ValueType.float);
    node.initValueType('deltaTime', 0, ValueType.float);
    node.initValueType('smoothDelta', 0, ValueType.float);
    data.expanded ??= true;

    meta.category = 'input/basic';
    meta.previewDisabled = true;
  }

  async builder(node: ReteTimeNode) {
    this.initNode(node);
    node
      .addOutput(new Rete.Output('time', 'Time', Sockets.float))
      .addOutput(new Rete.Output('sinTime', 'Sine Time', Sockets.float))
      .addOutput(new Rete.Output('cosTime', 'Cosine Time', Sockets.float))
      .addOutput(new Rete.Output('deltaTime', 'Delta Time', Sockets.float))
      .addOutput(new Rete.Output('smoothDelta', 'Smooth Delta', Sockets.float));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteTimeNode>): SGNodeOutput {
    const outputs = {
      time: '',
      sinTime: '',
      cosTime: '',
      deltaTime: '',
      smoothDelta: '',
    };

    const codeFn = (varName: string) => `${varName}: f32`;

    (Object.keys(outputs) as Array<keyof typeof outputs>).forEach((key: keyof typeof outputs) => {
      if (node.outputs[key].connections.length) {
        outputs[key] = compiler.setContext('uniforms', node, key, codeFn);
      }
    });

    return { code: '', outputs };
  }
}
