import { NodeView } from '../../../view';
import { Sockets } from '../../../sockets';
import { ValueType, Rete, ExtendReteNode } from '../../../types';
import { RC } from '../../ReteComponent';
import { ShaderGraphCompiler, SGNodeOutput } from '../../../compilers';
import { SGNodeData } from '../../../editors';
import { TransformationMatrixRC } from '../matrix/TransformationMatrixRC';

export type ReteObjectNode = ExtendReteNode<
  'Object',
  {
    positionValue: number[];
    positionValueType: ValueType.vec3;
    sinTimeValue: number[];
    sinTimeValueType: ValueType.vec3;
  }
>;

export class ObjectRC extends RC {
  constructor() {
    super('Object');
    this.data.component = NodeView;
  }

  initNode(node: ReteObjectNode) {
    const { data, meta } = node;
    node.initValueType('position', [0, 0, 0], ValueType.vec3);
    node.initValueType('scale', [0, 0, 0], ValueType.vec3);
    data.expanded ??= true;

    meta.category = 'input/scene';
    meta.previewDisabled = true;
  }

  async builder(node: ReteObjectNode) {
    this.initNode(node);
    node.addOutput(new Rete.Output('position', 'Position', Sockets.vec3)).addOutput(new Rete.Output('scale', 'Scale', Sockets.vec3));
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteObjectNode>): SGNodeOutput {
    const outputs = {
      position: '',
      scale: '',
    };

    let ModelVar: string = '';
    if (node.outputs.position.connections.length || node.outputs.scale.connections.length) {
      ModelVar = TransformationMatrixRC.initMatrixContext(compiler, 'Model');
      outputs.position = `vec3f(${ModelVar}[0][3], ${ModelVar}[1][3], ${ModelVar}[2][3])`;
    }

    let code = '';
    if (node.outputs.scale.connections.length) {
      const scaleVar = compiler.getOutVarName(node, 'scale', 'objScale');
      code = `let ${scaleVar} = vec3f(length(${ModelVar}[0].xyz), length(${ModelVar}[1].xyz), length(${ModelVar}[2].xyz));`;
      outputs.scale = scaleVar;
    }

    return { code, outputs };
  }
}
