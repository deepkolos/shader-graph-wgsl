import { ShaderGraphCompiler, SGNodeOutput } from '../../compilers';
import { SGNodeData, ShaderGraphEditor } from '../../editors';
import { Sockets } from '../../sockets';
import {
  ExtendReteNode,
  AssetValue,
  ValueTypeCtor,
  Rete,
  isVectorType,
  ValueType,
} from '../../types';
import { capitalizeFirstLetter, removeWhiteSpace } from '../../utils';
import { AssetControl, DynamicControl, NodeView } from '../../view';
import { OutputRC } from '../output';
import { RC } from '../ReteComponent';

export type ReteSubGraphNode = ExtendReteNode<
  'SubGraph',
  {
    assetValue: AssetValue;
    assetValueType: 'subgraph';
  }
>;

export class SubGraphRC extends RC {
  static Name = 'SubGraph';
  constructor() {
    super(SubGraphRC.Name);
    this.data.component = NodeView;
  }

  initNode(node: ReteSubGraphNode) {
    const { data, meta } = node;
    node.initValueType('asset', undefined, 'subgraph');
    data.expanded ??= true;
    data.preview ??= true;

    meta.previewDisabled = false;
    meta.category = '';
    meta.label = data.assetValue?.label ? `${data.assetValue?.label} (Sub Graph)` : 'Sub Graph';
  }

  async builder(node: ReteSubGraphNode) {
    this.initNode(node);
    if (!this.editor) return;
    if (node.data.assetValue === undefined) throw new Error('empty assetValue');

    const editor = this.editor!;
    const graphData = await (editor as ShaderGraphEditor).subGraphProvider?.getGraphData(
      node.data.assetValue,
    );
    if (!graphData) throw new Error(`get subgraph data failed asset: ${node.data.assetValue?.id}`);

    graphData.parameters.forEach(({ name, type }) => {
      const key = `fnIn${removeWhiteSpace(name)}`;
      // @ts-ignore
      node.initValueType(key, ValueTypeCtor[type]?.(), type);
      const input = new Rete.Input(key, name, Sockets[type]);
      if (isVectorType(type)) input.addControl(new DynamicControl(key, node));
      if (type === ValueType.texture2d) input.addControl(new AssetControl(key, node, editor));
      node.addInput(input);
    });

    const output = Object.values(graphData.nodes).find(i => i.name === OutputRC.Name)!;
    Object.keys(output.inputs).forEach(key => {
      const type = output.data[key + 'ValueType'] as ValueType;
      const name = capitalizeFirstLetter(key.replace('fnIn', ''));
      key = key.replace('fnIn', 'fnOut');
      // @ts-ignore
      node.initValueType(key, ValueTypeCtor[type]?.(), type);
      node.addOutput(new Rete.Output(key, name, Sockets[type]));
    });
  }

  async compileSG(
    compiler: ShaderGraphCompiler,
    node: SGNodeData<ReteSubGraphNode>,
  ): Promise<SGNodeOutput> {
    // 因为compiler设计是可以脱离editor运行所以不能使用editor相关数据
    if (!compiler.subGraphProvider || !node.data.assetValue) return { outputs: {}, code: '' };

    const inputs: string[] = Object.keys(node.inputs);
    const outputs: string[] = Object.keys(node.outputs);
    const fnInputs: string[] = [];
    const inputVars: string[] = [];
    inputs.forEach(key => {
      inputVars.push(compiler.getInputVarConverted(node, key));
      fnInputs.push(`${key}: ${compiler.getTypeClass(node.data[key + 'ValueType'])}`);
    });
    const outVars = outputs.map(key => compiler.getOutVarName(node, key, 'subGraphOut'));
    const outVarDefineCode = outputs
      .map((v, k) => `var ${outVars[k]}: ${compiler.getTypeClass(node.data[v + 'ValueType'])};`)
      .join(' ');

    let fnVar = compiler.getContext('defines', node, node.data.assetValue.id)?.varName;
    if (!fnVar) {
      const graphData = await compiler.subGraphProvider.getGraphData(node.data.assetValue);
      const subGraphCompiler = await compiler.compileSubGraph(graphData);

      const subGraphNodes = Object.values(subGraphCompiler.graphData.nodes);
      const subOutput = subGraphNodes.find(i => i.name === OutputRC.Name);
      if (!subOutput) return console.error('missing output node in subgraph');

      // 去除output preview的code
      subGraphCompiler.nodesCompilation.get(subOutput.id)!.code = '';
      const subGraphCode = subGraphCompiler.linkBlocks([subOutput], true);

      const SubGraphRCOutVars_To_OutputRCInVars: { [k: string]: string } = {};
      const fnOutputs: string[] = [];
      const fnOutputCodes: string[] = [];
      Object.keys(subOutput.inputs).forEach(key => {
        const subKey = key.replace('In', 'Out');
        SubGraphRCOutVars_To_OutputRCInVars[subKey] = subGraphCompiler.getInputVarConverted(
          subOutput,
          key,
        );
        fnOutputs.push(
          `${subKey}: ptr<function, ${subGraphCompiler.getTypeClass(
            subOutput.data[key + 'ValueType'],
          )}>`,
        );
        fnOutputCodes.push(`*${subKey} = ${SubGraphRCOutVars_To_OutputRCInVars[subKey]};`);
      });

      const codeFn = (varName: string) => /* wgsl */ `
fn ${varName} (${[...fnInputs, ...fnOutputs, 'v: Varying'].join(', ')}) {
  ${subGraphCode}
${fnOutputCodes.map(i => `  ${i}`).join('\n')}
}`;
      fnVar = compiler.setContext('defines', node, node.data.assetValue.id, codeFn);
    }

    return {
      outputs: outputs.reduce((acc, curr, i) => {
        acc[curr] = outVars[i];
        return acc;
      }, {} as { [k: string]: string }),
      code: `${outVarDefineCode} ${fnVar}(${[...inputVars, ...outVars.map(i => `&${i}`), 'v'].join(
        ', ',
      )});`,
    };
  }
}
