import { ColorControl, NodeView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';

export type ReteColorNode = ExtendReteNode<
  'Color',
  {
    outValue: number[];
    outValueType: ValueType.vec3;
  }
>;

export class ColorRC extends RC {
  constructor() {
    super('Color');
    this.data.component = NodeView;
  }

  initNode(node: ReteColorNode) {
    const { data, meta } = node;
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;

    meta.previewDisabled = true;
    meta.category = 'input/basic';
  }

  async builder(node: ReteColorNode) {
    this.initNode(node);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);

    node.addOutput(out).addControl(new ColorControl('out', node, false, ''));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteColorNode>): SGNodeOutput {
    const outVar = compiler.getOutVarName(node, 'out', 'color');
    return {
      outputs: { out: outVar },
      code: `let ${outVar} = ${compiler.compileNodeValue(node, 'out')};\n`,
    };
  }
}
