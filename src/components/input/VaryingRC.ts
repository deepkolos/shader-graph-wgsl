import { NodeView } from '../../view';
import { Sockets } from '../../sockets';
import { ValueType, Rete, ExtendReteNode } from '../../types';
import { RC } from '../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { CustomInterpolatorBlock } from '../blocks';

declare module '../../rete/core/events' {
  interface EventsTypes {
    varyingchange: {
      name: string;
      outValueName: string;
    };
  }
}

export type ReteVaryingNode = ExtendReteNode<
  'Varying',
  {
    outValue: number[];
    outValueType: ValueType.vec4;
    outValueName: string;
  }
>;

export class VaryingRC extends RC {
  static Name = 'Varying';
  constructor() {
    super(VaryingRC.Name);
    this.data.component = NodeView;
  }

  onRegister(editor: Rete.NodeEditor): void {
    editor.bind('varyingchange');
    editor.on('varyingchange', ({ name, outValueName }) => {
      editor.nodes
        .filter(node => node.name === VaryingRC.Name && node.data.outValueName === name)
        .forEach(node => {
          (node as ReteVaryingNode).data.outValueName = outValueName;
          (node as ReteVaryingNode).meta.label = outValueName;
          node.update();
        });
    });

    editor.on('noderemoved', node => {
      if (node.name === CustomInterpolatorBlock.Name) {
        const name = node.getValueName('varying');
        const nodes = editor.nodes.filter(
          node => node.name === VaryingRC.Name && node.data.outValueName === name,
        );
        nodes.forEach(node => editor.removeNode(node));
      }
    });
  }

  initNode(node: ReteVaryingNode) {
    const { data, meta } = node;
    node.initValueType('out', [0, 0, 0, 0], ValueType.vec4);
    data.exposed ??= true;
    data.expanded ??= true;
    meta.category = '';
    meta.previewDisabled = false;
  }

  async builder(node: ReteVaryingNode) {
    this.initNode(node);
    const out = new Rete.Output('out', 'Out', Sockets.vec4);
    node.addOutput(out);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteVaryingNode>): SGNodeOutput {
    let outVar = '';
    if (node.outputs.out.connections.length) {
      outVar = compiler.setContext(
        'varyings',
        { name: CustomInterpolatorBlock.Name },
        node.data.outValueName,
        varName => `${varName}: vec4<f32>`,
      );
    }
    return { outputs: { out: outVar }, code: '' };
  }
}
