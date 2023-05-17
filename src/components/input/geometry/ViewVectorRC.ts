import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { Sockets } from '../../../sockets';
import { ExtendReteNode, ValueType, Rete, SpaceValue, SpaceSuffixMap } from '../../../types';
import { NodeView, SelectControl } from '../../../view';
import { RC } from '../../ReteComponent';
import { TransformationMatrixRC } from '../matrix';
import { PositionRC } from './PositionRC';

export type ReteViewVectorNode = ExtendReteNode<
  'ViewVector',
  {
    outValue: number[];
    outValueType: ValueType.vec3;
    spaceValue: SpaceValue;
  }
>;

export class ViewVectorRC extends RC {
  static Name = 'ViewVector';
  constructor() {
    super(ViewVectorRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteViewVectorNode) {
    const { data, meta } = node;
    node.initValueType('out', [0, 0, 0], ValueType.vec3);
    node.initValueType('space', 'world', ValueType.string);
    data.exposed ??= true;
    data.expanded ??= true;
    data.previewType ??= '3d';
    meta.category = 'input/geometry';
    meta.previewDisabled = false;
    meta.label = 'View Vector';
  }

  async builder(node: ReteViewVectorNode) {
    this.initNode(node);
    const out = new Rete.Output('out', 'Out', Sockets.vec3);
    node.addOutput(out).addControl(new SelectControl('space', node, 'Space', ['object', 'view', 'world', 'tangent'], false));
  }

  static initViewVectorContext(compiler: ShaderGraphCompiler, space: SpaceValue) {
    const node = { name: ViewVectorRC.Name, data: {} } as any;
    const suffix = SpaceSuffixMap[space];
    const key = 'viewVector' + suffix;
    // 这里只 varying 运算的输入
    const cameraWSVar = compiler.setContext('uniforms', node, 'cameraWS', varName => `${varName}: vec3<f32>`);
    const positionVar = PositionRC.initPositionContext(compiler, space);

    let vertVar: string;
    let fragVar: string;
    if (space === 'object') {
      const I_Model = TransformationMatrixRC.initMatrixContext(compiler, 'I_Model');
      const codeCameraFn = (varName: string) => `let ${varName} = (${I_Model} * vec4<f32>(${cameraWSVar}, 1.0)).xyz;`;
      const vertCameraVar = compiler.setContext('vertShared', node, 'camera' + suffix, codeCameraFn);
      const fragCameraVar = compiler.setContext('fragShared', node, 'camera' + suffix, codeCameraFn);
      vertVar = compiler.setContext('vertShared', node, key, varName => `let ${varName} = ${vertCameraVar} - ${positionVar};`);
      fragVar = compiler.setContext('fragShared', node, key, varName => `let ${varName} = ${fragCameraVar} - ${positionVar};`);
    } else if (space === 'world') {
      const codeFn = (varName: string) => `let ${varName} = ${cameraWSVar} - ${positionVar};`;
      vertVar = compiler.setContext('vertShared', node, key, codeFn);
      fragVar = compiler.setContext('fragShared', node, key, codeFn);
    } else if (space === 'view') {
      const codeFn = (varName: string) => `vec3 ${varName} = -${positionVar};`;
      vertVar = compiler.setContext('vertShared', node, key, codeFn);
      fragVar = compiler.setContext('fragShared', node, key, codeFn);
    } else {
      // TODO
      const codeFn = (varName: string) => `vec3 ${varName} = vec3<f32>(0);`;
      vertVar = compiler.setContext('vertShared', node, key, codeFn);
      fragVar = compiler.setContext('fragShared', node, key, codeFn);
    }

    return compiler.setVarNameMap(node, key, vertVar, fragVar);
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteViewVectorNode>): SGNodeOutput {
    return { outputs: { out: ViewVectorRC.initViewVectorContext(compiler, node.data.spaceValue) }, code: '' };
  }
}
