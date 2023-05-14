import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData } from '../../editors';
import { Sockets } from '../../sockets';
import {
  ExtendReteNode,
  ValueType,
  Rete,
  ReteNode,
  ValueTypeCtor,
  isVectorType,
  NodeListCfg,
  AssetValue,
} from '../../types';
import { capitalizeFirstLetter, hash, removeWhiteSpace } from '../../utils';
import { NodeView, DynamicControl, ListIOItem, ListIOItemValue, AssetControl } from '../../view';
import { RC } from '../ReteComponent';

export type ReteCustomFunctionNode = ExtendReteNode<
  'CustomFunction',
  {
    typeValue: 'file' | 'string';
    typeValueType: ValueType.string;
    nameValue: string;
    nameValueType: ValueType.string;
    bodyValue: string;
    bodyValueType: ValueType.string;
    fileValue: AssetValue;
    fileValueType: ValueType.string;
    [k: `fnIn${string}Value`]: any;
    [k: `fnIn${string}Type`]: ValueType;
    [k: `fnOut${string}Value`]: any;
    [k: `fnOut${string}Type`]: ValueType;
  }
>;

const onAdd = (list: ListIOItemValue[]): ListIOItemValue => ({
  name: `New${list.length}`,
  type: ValueType.float,
});
const onDel = () => {};
const onInputChange = (
  node: ReteNode,
  list: ListIOItemValue[],
  editor: Rete.NodeEditor,
): boolean => {
  const nodeView = editor.view.nodes.get(node);
  node.inputs.forEach(input => {
    const name = input.key.replace('fnIn', '');
    const existed = list.find(i => i.name === name);
    if (!existed || existed.type !== node.getValueType(input.key)) {
      input.connections.forEach(con => editor.removeConnection(con));
      node.inputs.delete(input.key);
      nodeView?.sockets.delete(input);
      node.removeValue(input.key);
    }
  });

  list.forEach(({ name, type }) => {
    const key = 'fnIn' + name;
    if (!node.inputs.has(key)) {
      // @ts-ignore
      const input = new Rete.Input(key, capitalizeFirstLetter(name), Sockets[type]);
      if (isVectorType(type)) input.addControl(new DynamicControl(key, node));
      if (type === ValueType.texture2d) input.addControl(new AssetControl(key, node, editor));
      // @ts-ignore
      node.initValueType(key, ValueTypeCtor[type]?.(), type);
      node.addInput(input);
    }
  });
  return true;
};
const onOutputChange = (
  node: ReteNode,
  list: ListIOItemValue[],
  editor: Rete.NodeEditor,
): boolean => {
  const nodeView = editor.view.nodes.get(node);
  node.outputs.forEach(output => {
    const name = output.key.replace('fnOut', '');
    const existed = list.find(i => i.name === name);
    if (!existed || existed.type !== node.getValueType(output.key)) {
      output.connections.forEach(con => editor.removeConnection(con));
      node.outputs.delete(output.key);
      node.removeValue(output.key);
      nodeView?.sockets.delete(output);
    }
  });

  list.forEach(({ name, type }) => {
    const key = 'fnOut' + name;
    if (!node.outputs.has(key)) {
      // @ts-ignore
      const output = new Rete.Output(key, capitalizeFirstLetter(name), Sockets[type]);
      // @ts-ignore
      node.initValueType(key, ValueTypeCtor[type]?.(), type);
      node.addOutput(output);
    }
  });
  return true;
};

const onNameChange = (node: ReteNode, value: string): boolean => {
  node.meta.label = value + '(Custom Function)';
  return true;
};
// const TypeOptions = ['file', 'string'];
const TypeOptions = ['string'];
const TypeExcludes = {
  file: ['Body'],
  string: ['File'],
};
const FileAsset = { type: ValueType.string };

export const NodeIOSettingFns = { onAdd, onDel, onInputChange, onOutputChange, onNameChange };

export class CustomFunctionRC extends RC {
  constructor() {
    super('CustomFunction');
    this.data.component = NodeView;
  }

  initNode(node: ReteCustomFunctionNode) {
    const { data, meta } = node;
    node.initValueType('type', 'string', ValueType.string);
    node.initValueType('name', '', ValueType.string);
    node.initValueType('body', '', ValueType.string);
    node.initValueType('file', undefined, ValueType.string);
    data.expanded ??= true;

    meta.previewDisabled = false;
    meta.category = 'utility';
    meta.label = 'Custom Function';
    meta.nodeCfgs = {
      Inputs: { list: [], onAdd, onDel, Item: ListIOItem, onChange: onInputChange },
      Outputs: { list: [], onAdd, onDel, Item: ListIOItem, onChange: onOutputChange },
      Type: {
        dataKey: 'typeValue',
        labelWidth: '80px',
        options: TypeOptions,
        excludes: TypeExcludes,
      },
      Name: { dataKey: 'nameValue', labelWidth: '80px', onChange: onNameChange },
      Body: { dataKey: 'bodyValue', labelWidth: '80px', textarea: true },
      File: { dataKey: 'fileValue', labelWidth: '80px', asset: FileAsset },
    };
  }

  async builder(node: ReteCustomFunctionNode) {
    this.initNode(node);

    const inputList: ListIOItemValue[] = [];
    const outputList: ListIOItemValue[] = [];
    Object.keys(node.data).forEach(key => {
      const name = key.replace('Value', '').replace('fnIn', '').replace('fnOut', '');
      if (key.startsWith('fnIn') && key.endsWith('Value'))
        inputList.push({ name, type: node.data[`fnIn${name}ValueType`] });
      if (key.startsWith('fnOut') && key.endsWith('Value'))
        outputList.push({ name, type: node.data[`fnOut${name}ValueType`] });
    });

    onInputChange(node, inputList, this.editor!);
    onOutputChange(node, outputList, this.editor!);
    const nodeCfgs = node.meta.nodeCfgs!;
    (nodeCfgs.Inputs as NodeListCfg).list = inputList;
    (nodeCfgs.Outputs as NodeListCfg).list = outputList;
    node.meta.label = node.data.nameValue + '(Custom Function)';
  }

  compileSG(compiler: ShaderGraphCompiler, node: SGNodeData<ReteCustomFunctionNode>): SGNodeOutput {
    const inputs: string[] = [];
    const outputs: string[] = [];
    Object.keys(node.data).forEach(key => {
      const prefix = key.replace('Value', '');
      if (key.startsWith('fnIn') && key.endsWith('Value')) inputs.push(prefix);
      if (key.startsWith('fnOut') && key.endsWith('Value')) outputs.push(prefix);
    });

    const inVars = inputs.map(key => compiler.getInputVarConverted(node, key));
    const outVars = outputs.map(key => compiler.getOutVarName(node, key, 'fnOut'));

    const codeFn = (varName: string) => {
      const args = [...inputs, ...outputs].map(i => {
        const typeClass = compiler.getTypeClass(node.data[i + 'ValueType']);
        const isIn = i.startsWith('fnIn');
        const varName = i.replace(isIn ? 'fnIn' : 'fnOut', '');
        return `${varName}: ${isIn ? typeClass : `ptr<function, ${typeClass}>`}`;
      });
      return /* wgsl */ `
fn ${varName}(${args.join(', ')}) {
  ${outputs.reduce((body, out) => {
    const outVarInBody = out.replace('fnOut', '');
    return body.replace(outVarInBody, `*${outVarInBody}`);
  }, node.data.bodyValue)}
}`;
    };
    const fnVar = compiler.setContext(
      'defines',
      node,
      `${removeWhiteSpace(node.data.nameValue)}_${hash(node.data.bodyValue)}`,
      codeFn,
    );

    const outVarDefineCode = outputs
      .map((v, k) => `var ${outVars[k]}: ${compiler.getTypeClass(node.data[v + 'ValueType'])};`)
      .join(' ');

    return {
      outputs: outputs.reduce((acc, curr, i) => {
        // @ts-ignore
        acc[curr] = outVars[i];
        return acc;
      }, {}),
      code: `${outVarDefineCode} ${fnVar}(${[...inVars, ...outVars.map(i => `&${i}`)].join(
        ', ',
      )});`,
    };
  }
}
