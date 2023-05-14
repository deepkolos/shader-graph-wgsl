import { ValueType, ExtendReteContext, NodeListCfg } from '../../types';
import { RC } from '../ReteComponent';
import { ListIOItem, ListIOItemValue, NodeView } from '../../view';
import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { NodeIOSettingFns } from '../utility';

export type ReteOutputNode = ExtendReteContext<
  'Output',
  {
    [k: `fnIn${string}Value`]: any;
    [k: `fnIn${string}Type`]: ValueType;
  }
>;

export class OutputRC extends RC {
  static Name = 'Output';
  constructor() {
    super(OutputRC.Name);
    this.data.component = NodeView;
  }

  async initNode(node: ReteOutputNode) {
    const { data, meta } = node;
    data.expanded ??= true;
    meta.category = '';
    meta.previewDisabled = true;
    meta.undeleteable = true;
    meta.nodeCfgs = {
      Inputs: {
        list: [],
        Item: ListIOItem,
        onAdd: NodeIOSettingFns.onAdd,
        onDel: NodeIOSettingFns.onDel,
        onChange: NodeIOSettingFns.onInputChange,
      },
    };
  }

  async builder(node: ReteOutputNode) {
    await this.initNode(node);
    const inputList: ListIOItemValue[] = [];
    Object.keys(node.data).forEach(key => {
      const name = key.replace('Value', '').replace('fnIn', '').replace('fnOut', '');
      if (key.startsWith('fnIn') && key.endsWith('Value'))
        inputList.push({ name, type: node.data[`fnIn${name}ValueType`] });
    });

    NodeIOSettingFns.onInputChange(node, inputList, this.editor!);
    const nodeCfgs = node.meta.nodeCfgs!;
    (nodeCfgs.Inputs as NodeListCfg).list = inputList;
  }

  // 这里是compiler subgraph main preview逻辑逻辑
  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteOutputNode>): SGNodeOutput {
    const inputs: string[] = [];
    Object.keys(node.data).forEach(key => {
      const prefix = key.replace('Value', '');
      if (key.startsWith('fnIn') && key.endsWith('Value')) inputs.push(prefix);
    });

    const inVars = inputs.map(key => compiler.getInputVarConverted(node, key));
    return {
      outputs: {},
      code: `*baseColor = ${
        inVars[0]
          ? compiler.typeConvert(inVars[0], node.data[inputs[0] + 'ValueType'], ValueType.vec3)
          : 'vec3<f32>(0)'
      };`,
    };
  }
}
