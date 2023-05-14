import { FloatControl, NodeView } from '../../view';
import { Sockets } from '../../sockets';
import { ValueType, Rete, ExtendReteNode } from '../../types';
import { RC } from '../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';

export type ReteCombineNode = ExtendReteNode<
  'Combine',
  {
    rValue: number;
    rValueType: ValueType.float;
    gValue: number;
    gValueType: ValueType.float;
    bValue: number;
    bValueType: ValueType.float;
    aValue: number;
    aValueType: ValueType.float;
    rgbaValue: number[];
    rgbaValueType: ValueType.vec4;
    rgbValue: number[];
    rgbValueType: ValueType.vec3;
    rgValue: number[];
    rgValueType: ValueType.vec2;
  }
>;

export class CombineRC extends RC {
  constructor() {
    super('Combine');
    this.data.component = NodeView;
  }

  initNode(node: ReteCombineNode) {
    const { data, meta } = node;
    node.initValueType('r', 0, ValueType.float);
    node.initValueType('g', 0, ValueType.float);
    node.initValueType('b', 0, ValueType.float);
    node.initValueType('a', 0, ValueType.float);
    node.initValueType('rgba', [0, 0, 0, 0], ValueType.vec4);
    node.initValueType('rgb', [0, 0, 0], ValueType.vec3);
    node.initValueType('rg', [0, 0], ValueType.vec2);
    data.expanded ??= true;

    meta.category = 'channel';
    meta.previewDisabled = true;
  }

  async builder(node: ReteCombineNode) {
    this.initNode(node);
    node
      .addInput(new Rete.Input('r', 'R', Sockets.float).addControl(new FloatControl('r', node)))
      .addInput(new Rete.Input('g', 'G', Sockets.float).addControl(new FloatControl('g', node)))
      .addInput(new Rete.Input('b', 'B', Sockets.float).addControl(new FloatControl('b', node)))
      .addInput(new Rete.Input('a', 'A', Sockets.float).addControl(new FloatControl('a', node)))
      .addOutput(new Rete.Output('rgba', 'RGBA', Sockets.vec4))
      .addOutput(new Rete.Output('rgb', 'RGB', Sockets.vec3))
      .addOutput(new Rete.Output('rg', 'RG', Sockets.vec2));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteCombineNode>): SGNodeOutput {
    const inputs: { [k: string]: string } = {
      r: compiler.getInputVarConverted(node, 'r'),
      g: compiler.getInputVarConverted(node, 'g'),
      b: compiler.getInputVarConverted(node, 'b'),
      a: compiler.getInputVarConverted(node, 'a'),
    };
    const outputs: { [k: string]: string } = { rgba: '', rgb: '', rg: '' };
    const codes: string[] = [];

    Object.keys(outputs).forEach(key => {
      if (node.outputs[key].connections.length === 0) return;
      const outVar = compiler.getOutVarName(node, key, key);
      const outType = compiler.getTypeClass(node.data[key + 'ValueType']);
      codes.push(
        `let ${outVar} = ${outType}(${key
          .split('')
          .map(i => inputs[i])
          .join(', ')});`,
      );
      outputs[key] = outVar;
    });

    return { code: codes.join('\n'), outputs };
  }
}
