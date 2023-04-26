import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete, SpaceValue, SpaceSuffixMap } from '../../../types';
import { NodeView, SelectControl } from '../../../view';
import { RC } from '../../ReteComponent';
import { ViewVectorRC } from './ViewVectorRC';

export type ReteViewDirectionNode = ExtendReteNode<
  'ViewDirection',
  {
    outValue: number[];
    outValueType: ValueType.vec3;
    spaceValue: SpaceValue;
  }
>;

export class ViewDirectionRC extends RC {
  static Name = 'ViewDirection';
  constructor() {
    super(ViewDirectionRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteViewDirectionNode) {
    const { data, meta } = node;
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('space', 'world');
    data.exposed ??= true;
    data.expanded ??= true;
    data.previewType ??= '3d';
    meta.category = 'input/geometry';
    meta.previewDisabled = false;
    meta.label = 'View Direction';
  }

  async builder(node: ReteViewDirectionNode) {
    this.initNode(node);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);
    node.addOutput(out).addControl(new SelectControl('space', node, 'Space', ['object', 'view', 'world', 'tangent'], false));
  }

  static initViewDirectionContext(compiler: ShaderGraphCompiler, space: SpaceValue) {
    const node = { name: ViewDirectionRC.Name, data: {} } as any;
    const suffix = SpaceSuffixMap[space];
    const key = 'viewDir' + suffix;
    const viewVectorVar = ViewVectorRC.initViewVectorContext(compiler, space);
    const codeFn = (varName: string) => `let ${varName} = normalize(${viewVectorVar});`;
    const vertVar = compiler.setContext('vertShared', node, key, codeFn);
    const fragVar = compiler.setContext('fragShared', node, key, codeFn);
    return compiler.setVarNameMap(node, key, vertVar, fragVar);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteViewDirectionNode>): SGNodeOutput {
    return { outputs: { out: ViewDirectionRC.initViewDirectionContext(compiler, node.data.spaceValue) }, code: '' };
  }
}
