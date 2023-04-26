import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete } from '../../../types';
import { NodeView, SelectControl } from '../../../view';
import { RC } from '../../ReteComponent';

export type ReteUVNode = ExtendReteNode<
  'UV',
  {
    outValue: number[];
    outValueType: ValueType.vec2;
    channelValue: 'UV0' | 'UV1' | 'UV2' | 'UV3'; // TODO 目前其实都是映射到UV
  }
>;

export class UVRC extends RC {
  static Name = 'UV';
  constructor() {
    super(UVRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteUVNode) {
    const { data, meta } = node;
    node.initValueType('out', [0, 0], ValueType.vec2);
    node.initValueType('channel', 'UV0');
    data.exposed ??= true;
    data.expanded ??= true;
    meta.category = 'input/geometry';
    meta.previewDisabled = false;
  }

  async builder(node: ReteUVNode) {
    this.initNode(node);
    const out = new Rete.Output('out', 'Out', Sockets.vec2);
    node.addOutput(out).addControl(new SelectControl('channel', node, 'Channel', ['UV0', 'UV1', 'UV2', 'UV3'], false));
  }

  static initUVContext(compiler: ShaderGraphCompiler) {
    const uvNode = { name: UVRC.Name, data: {} } as any;
    const attrVar = compiler.setContext('attributes', uvNode, 'uv', {
      varName: 'uv',
      code: ``, // 使用内置 TBD
    });
    const varyingVar = compiler.setContext('varyings', uvNode, 'vUv', varName => `${varName}: vec2<f32>`);
    const defVar = compiler.setVarNameMap(uvNode, 'uv', attrVar, varyingVar);
    compiler.setAutoVaryings(uvNode, 'uv', varyingVar, attrVar);
    return defVar;
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteUVNode>): SGNodeOutput {
    return { outputs: { out: UVRC.initUVContext(compiler) }, code: '' };
  }
}
