import { NodeView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { TransformationMatrixRC } from '../matrix/TransformationMatrixRC';

export type ReteCameraNode = ExtendReteNode<
  'Camera',
  {
    positionValue: number[];
    positionValueType: ValueType.vec3;
    directinoValue: number[];
    directinoValueType: ValueType.vec3;
    orthographicValue: number;
    orthographicValueType: ValueType.float;
    nearPlaneValue: number;
    nearPlaneValueType: ValueType.float;
    farPlaneValue: number;
    farPlaneValueType: ValueType.float;
    zBufferSignValue: number;
    zBufferSignValueType: ValueType.float;
    widthValue: number;
    widthValueType: ValueType.float;
    heightValue: number;
    heightValueType: ValueType.float;
  }
>;

export class CameraRC extends RC {
  constructor() {
    super('Camera');
    this.data.component = NodeView;
  }

  initNode(node: ReteCameraNode) {
    const { data, meta } = node;
    node.initValueType('position', [0, 0, 0], ValueType.vec3);
    node.initValueType('direction', [0, 0, 0], ValueType.vec3);
    node.initValueType('orthographic', 0, ValueType.float);
    node.initValueType('nearPlane', 0, ValueType.float);
    node.initValueType('farPlane', 0, ValueType.float);
    node.initValueType('zBufferSign', 0, ValueType.float);
    node.initValueType('width', 0, ValueType.float);
    node.initValueType('height', 0, ValueType.float);
    data.expanded ??= true;

    meta.category = 'input/scene';
    meta.previewDisabled = true;
  }

  async builder(node: ReteCameraNode) {
    this.initNode(node);
    node
      .addOutput(new Rete.Output('position', 'Position', Sockets.vec3))
      .addOutput(new Rete.Output('direction', 'Direction', Sockets.vec3))
      .addOutput(new Rete.Output('orthographic', 'Orthographic', Sockets.float))
      .addOutput(new Rete.Output('nearPlane', 'Near Plane', Sockets.float))
      .addOutput(new Rete.Output('farPlane', 'Far Plane', Sockets.float))
      .addOutput(new Rete.Output('zBufferSign', 'Z Buffer Sign', Sockets.float))
      .addOutput(new Rete.Output('width', 'Width', Sockets.float))
      .addOutput(new Rete.Output('height', 'Height', Sockets.float));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteCameraNode>): SGNodeOutput {
    const outputs = {
      position: '',
      direction: '',
      orthographic: '',
      nearPlane: '',
      farPlane: '',
      zBufferSign: '',
      width: '',
      height: '',
    };

    const codeFn = (varName: string) => `${varName}: f32`;

    (['orthographic', 'farPlane', 'nearPlane', 'orthographic', 'width', 'height', 'zBufferSign'] as Array<keyof typeof outputs>).forEach(
      (key: keyof typeof outputs) => {
        if (node.outputs[key].connections.length) {
          outputs[key] = compiler.setContext('uniforms', node, key, codeFn);
        }
      },
    );

    if (node.outputs.position.connections.length || node.outputs.direction.connections.length) {
      const I_View = TransformationMatrixRC.initMatrixContext(compiler, 'I_View');
      // TODO 确认是否正确
      // 与unity的写法不一样, unity的实现有点绕
      // -1 * mul((float3x3)UNITY_MATRIX_M, transpose(mul(UNITY_MATRIX_I_M, UNITY_MATRIX_I_V)) [2].xyz)
      outputs.direction = `-(${I_View}[2].xyz)`;
      outputs.position = `vec3f(${I_View}[0][3], ${I_View}[1][3], ${I_View}[2][3])`;
    }

    return { code: '', outputs };
  }
}
