import { NodeView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteScreenNode = ExtendReteNode<
  'Screen',
  {
    widthValue: number;
    widthValueType: ValueType.float;
    heightValue: number;
    heightValueType: ValueType.float;
  }
>;

export class ScreenRC extends RC {
  static Name = 'Screen';
  constructor() {
    super(ScreenRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteScreenNode) {
    const { data, meta } = node;
    node.initValueType('width', 0, ValueType.float);
    node.initValueType('height', 0, ValueType.float);
    data.expanded ??= true;

    meta.category = 'input/scene';
    meta.previewDisabled = true;
  }

  async builder(node: ReteScreenNode) {
    this.initNode(node);
    node.addOutput(new Rete.Output('width', 'Width', Sockets.float)).addOutput(new Rete.Output('height', 'Height', Sockets.float));
  }

  static initScreenContext(compiler: ShaderGraphCompiler, key: 'width' | 'height') {
    const node = { name: ScreenRC.Name, data: {} } as any;
    const codeFn = (varName: string) => `${varName}: f32`;
    return compiler.setContext('uniforms', node, key, codeFn);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteScreenNode>): SGNodeOutput {
    const outputs = {
      width: '',
      height: '',
    };

    (Object.keys(outputs) as Array<keyof typeof outputs>).forEach((key: keyof typeof outputs) => {
      if (node.outputs[key].connections.length) {
        outputs[key] = ScreenRC.initScreenContext(compiler, key);
      }
    });

    return { code: '', outputs };
  }
}
