import {
  VertexRC,
  FragmentRC,
  ReteFragmentContext,
  BaseColorBlock,
  ReteBaseColorBlock,
  ReteVaryingNode,
  CustomInterpolatorBlock,
  VaryingRC,
  OutputRC,
  ReteParameterNode,
  TransformationMatrixRC,
} from '../components';
import { RC } from '../components/ReteComponent';
import { ShaderGraphData, SGNodeData, SGNodes, SubGraphProvider } from '../editors';
import { SGTemplates, SG_VERT } from '../templates';
import {
  ValueType,
  ReteNode,
  AssetValue,
  ValueComponentMap,
  ChannelLenNeedsMap,
  isVectorType,
  isMatrixType,
  VectorValueType,
  SamplerValue,
} from '../types';
import { hash, lowerCaseFirstLetter, removeWhiteSpace } from '../utils';
import { GraphCompiler } from './GraphCompiler';
import {
  Context,
  ContextItem,
  ContextKeys,
  initContext,
  initResource,
  Resource,
  ResourceItem,
  SGCompilation,
  SGNodeOutput,
  VectorComponetMap,
  HeadContextItems,
  VarNameMap,
  CodeFn,
  NodeName,
  UniformMap,
  BindingMap,
} from './ShaderGraphTypes';

/**
 * 编译顺序
 * frag: fragShared -> fragBody -> fragHead
 * vert: vertShared -> autoVaryings -> vertBody -> vertHead
 */
export class ShaderGraphCompiler extends GraphCompiler {
  declare graphData: ShaderGraphData;
  context!: Context;
  resource!: Resource;
  varNameMap!: VarNameMap;

  declare nodesCompilation: Map<number, Awaited<SGNodeOutput>>;
  compilation?: SGCompilation;

  previewContext?: {
    id: number;
    baseColorBlock: BaseColorBlock;
    fragmentRC: FragmentRC;
    getNodeData: <T extends SGNodes>(rc: RC) => Promise<SGNodeData<T>>;
  };
  subGraphProvider?: SubGraphProvider;

  constructor() {
    super('compileSG');
  }

  initBuiltinContext() {
    TransformationMatrixRC.initMatrixContext(this, 'ModelView');
    TransformationMatrixRC.initMatrixContext(this, 'Proj');
  }

  setSubGraphProvider(provider: SubGraphProvider) {
    this.subGraphProvider = provider;
  }

  setParameter(node: SGNodeData<ReteParameterNode>) {
    if (node.data.outValueType === ValueType.texture2d) {
      return this.compileValue(node.data.outValue, node.data.outValueType);
    }
    return this.setContext(
      'uniforms',
      node,
      node.data.outValueName,
      varName => `${varName}: ${this.getTypeClass(node.data.outValueType)}`,
    );
  }

  setVarNameMap(node: NodeName, key: string, vertName: string, fragName: string, varName?: string) {
    const contextKey = this.getContextKey(node, key);
    if (!this.varNameMap[contextKey]) {
      if (!varName) varName = this.getContextVarName(node, key);
      this.varNameMap[contextKey] = { vertName, fragName, varName };
    }
    return this.varNameMap[contextKey].varName;
  }

  setResource(type: keyof typeof this.resource, node: NodeName, key: string, item?: ResourceItem) {
    const contextKey = this.getContextKey(node, key);
    this.resource[type][contextKey] = this.resource[type][contextKey] || item;
  }

  setAutoVaryings(node: NodeName, key: string, varyingVar: string, vertVar: string) {
    if (['positionOS', 'normalOS', 'tangentOS'].includes(vertVar)) {
      vertVar = `*${vertVar}`;
    }
    return this.setContext('autoVaryings', node, key, {
      varName: varyingVar,
      code: `${varyingVar.replace('v.', '(*v).')} = ${vertVar};`,
    });
  }

  setContext(type: ContextKeys, node: NodeName, key: string, item: ContextItem): string;
  setContext(type: ContextKeys, node: NodeName, key: string, codeFn: CodeFn): string;
  setContext(
    type: ContextKeys,
    node: NodeName,
    key: string,
    itemOrCode: ContextItem | CodeFn,
  ): string {
    const contextKey = this.getContextKey(node, key);

    if (!this.context[type as ContextKeys][contextKey]) {
      if (typeof itemOrCode === 'function') {
        let varName = this.getContextVarName(node, key);
        const index = Object.keys(this.context[type as ContextKeys]).length + 1;
        const code = itemOrCode(varName, index);
        if (type === 'uniforms') varName = 'u.' + varName;
        if (type === 'varyings') varName = 'v.' + varName;
        this.context[type as ContextKeys][contextKey] = { varName, code, index };
      } else {
        this.context[type as ContextKeys][contextKey] = itemOrCode;
      }
    }
    return this.context[type as ContextKeys][contextKey].varName;
  }

  getContext(type: ContextKeys, node: SGNodeData<SGNodes>, key: string): ContextItem | undefined {
    return this.context[type][this.getContextKey(node, key)];
  }

  getContextKey(node: NodeName, key: string) {
    return `${node.name}_${key}`;
  }

  getCode(nodeId: number): string {
    return this.nodesCompilation.get(nodeId)?.code || '';
  }

  collectNodeInputCode(nodeId: number, output: string[] = [], self = false): string[] {
    const { nodes } = this.graphData;
    const node = nodes[nodeId];
    const code = this.getCode(nodeId);
    if (self) {
      const index = output.indexOf(code);
      if (index !== -1) output.splice(index, 1);
      output.push(code);
    }

    Object.values(node.inputs).forEach(i => {
      i.connections[0] && this.collectNodeInputCode(i.connections[0].node, output, true);
    });
    return output;
  }

  /** 重排 只支持vec1234 */
  getVarSwizzle(inVar: string, inType: ValueType, swizzle: string) {
    const converted = this.typeConvert(inVar, inType, ValueType.vec4);
    return converted + '.' + swizzle;
  }

  /** 读取分量 只支持vec1234 */
  getVarChannel(
    varName: string,
    inType: ValueType,
    channel: 'r' | 'g' | 'b' | 'a' | 'x' | 'y' | 'z' | 'w',
  ) {
    const len = ValueComponentMap[inType];
    const channelLenNeeds = ChannelLenNeedsMap[channel];
    if (channelLenNeeds > len) return '0.0';
    return len === 1 ? varName : `${varName}.${channel}`;
  }

  /** 类型转换 只支持vec1234 mat234 */
  typeConvert(varName: string | undefined, inType: ValueType, outType: ValueType) {
    if (inType === outType || varName === undefined) return varName;
    const isInVec = isVectorType(inType);
    const isInMat = isMatrixType(inType);
    const isOutVec = isVectorType(outType);
    const isOutMat = isMatrixType(outType);
    const vec_to_vec = isInVec && isOutVec;
    const mat_to_mat = isInMat && isOutMat;
    const mat_to_vec = isInMat && isOutVec;
    if (!(vec_to_vec || mat_to_mat || mat_to_vec)) {
      console.error('typeConvert support vector or matrix only');
      return varName;
    }

    if (vec_to_vec) {
      // 输入类型float 输出非vec234
      if (inType === ValueType.float) return `${this.getTypeClass(outType)}(${varName})`;
      // 升 vec2 > vec3 vec3 > vec4
      //   vec2 > vec4
      if (
        (inType === ValueType.vec2 && outType === ValueType.vec3) ||
        (inType === ValueType.vec3 && outType === ValueType.vec4)
      ) {
        return `${this.getTypeClass(outType)}(${varName}, 0)`;
      } else if (inType === ValueType.vec2 && outType === ValueType.vec4) {
        return `${this.getTypeClass(outType)}(${varName}, 0, 0)`;
      }

      // 降 vec2 > float vec3 > float vec4 > float
      //                 vec3 > vec2  vec4 > vec2
      //                              vec4 > vec3
      return `${varName}.${VectorComponetMap[outType as VectorValueType]}`;
    }

    if (mat_to_mat) {
      // 升 mat2 -> mat3 mat3 -> mat4
      //    mat2 -> mat4
      // TODO
      if (inType === ValueType.mat2 && outType === ValueType.mat3) {
      } else if (inType === ValueType.mat2 && outType === ValueType.mat4) {
      } else if (inType === ValueType.mat3 && outType === ValueType.mat3) {
      }
      // 降
      return `${this.getTypeClass(outType)}(${varName})`;
    }

    if (mat_to_vec) return `${this.getTypeClass(outType)}(${varName})`;
  }

  getInputType(node: SGNodeData<SGNodes>, inputKey: string): ValueType {
    const inCon = node.inputs[inputKey]?.connections[0];
    if (inCon)
      return this.graphData.nodes[inCon.node].data[inCon.output + 'ValueType'] as ValueType;
    return node.data[inputKey + 'ValueType'];
  }

  getInputVarConverted(node: SGNodeData<SGNodes>, inputKey: string): string;
  getInputVarConverted(
    node: SGNodeData<SGNodes>,
    inputKey: string,
    fallback: false,
  ): string | undefined;
  getInputVarConverted(node: SGNodeData<SGNodes>, inputKey: string, fallback = true) {
    const inType = this.getInputType(node, inputKey);
    if (fallback) {
      return this.typeConvert(
        this.getInputVar(node, inputKey),
        inType,
        node.data[inputKey + 'ValueType'],
      );
    } else {
      const inVar = this.getInputVar(node, inputKey, false);
      if (inVar) return this.typeConvert(inVar, inType, node.data[inputKey + 'ValueType']);
    }
  }

  getInputVarConvertedArray(node: SGNodeData<SGNodes>, keys: string[]) {
    return keys.map(key => this.getInputVarConverted(node, key));
  }

  getInputVar(node: SGNodeData<SGNodes>, inputKey: string): string;
  getInputVar(node: SGNodeData<SGNodes>, inputKey: string, fallback: false): string | undefined;
  getInputVar(node: SGNodeData<SGNodes>, inputKey: string, fallback = true): string | undefined {
    const inCon = node.inputs[inputKey]?.connections[0];
    if (inCon) {
      const inNodeOutput = this.nodesCompilation.get(inCon.node);
      if (inNodeOutput) return inNodeOutput.outputs[inCon.output];
    }
    if (fallback) return this.compileNodeValue(node, inputKey);
  }

  getTypeClass(type: ValueType) {
    // prettier-ignore
    switch (type) {
      case ValueType.texture2d: return 'texture_2d<f32>';
      case ValueType.float: return 'f32';
      case ValueType.vec2: return 'vec2<f32>';
      case ValueType.vec3: return 'vec3<f32>';
      case ValueType.vec4: return 'vec4<f32>';
      case ValueType.mat2: return 'mat2x2<f32>';
      case ValueType.mat3: return 'mat3x3<f32>';
      case ValueType.mat4: return 'mat4x4<f32>';
      default: return type;
    }
  }

  getOutVarName(node: Pick<SGNodeData<SGNodes>, 'data' | 'name'>, key: string, name?: string) {
    const prefix = node.data[key + 'ValueName'] || name || node.name;
    return `${lowerCaseFirstLetter(removeWhiteSpace(prefix))}_${this.nextVarId}`;
  }

  getContextVarName(node: NodeName, key: string) {
    return 'sg_' + this.getContextKey(node, key);
  }

  compileValue(value: any, type: ValueType) {
    if (Number.isNaN(value) || (Array.isArray(value) && value.some(i => Number.isNaN(i)))) {
      console.warn(`value contains NaN`, value, type);
    }
    switch (type) {
      case ValueType.float:
        return stringifyFloat(value);
      case ValueType.vec2:
        return `vec2<f32>(${value[0] || 0}, ${value[1] || 0})`;
      case ValueType.vec3:
        return `vec3<f32>(${value[0] || 0}, ${value[1] || 0}, ${value[2] || 0})`;
      case ValueType.vec4:
        return `vec4<f32>(${value[0] || 0}, ${value[1] || 0}, ${value[2] || 0}, ${value[3] || 0})`;
      case ValueType.mat2:
      case ValueType.mat3:
      case ValueType.mat4:
        return `${type}x${parseInt(type, 10)}<f32>(${value.map(Number).join(', ')})`;
      case ValueType.texture2d: {
        const asset = value as AssetValue;
        if (!asset) return '';
        const key = hash(asset.id);
        const node = { data: {}, name: 'Texture2D' } as any;
        const outVar = this.setContext(
          'bindings',
          node,
          key,
          (varName, i) => `@group(0) @binding(${i}) var ${varName}: texture_2d<f32>;`,
        );
        this.setResource('texture', node, key, value);
        return outVar;
      }
      case ValueType.sampler: {
        const sampler = (value || { filter: 'point', warp: 'clamp' }) as SamplerValue;
        const key = sampler.filter + '_' + sampler.warp;
        const node = { data: {}, name: 'Sampler' } as any;
        const outVar = this.setContext(
          'bindings',
          node,
          key,
          (varName, i) => `@group(0) @binding(${i}) var ${varName}: sampler;`,
        );
        this.setResource('sampler', node, key, sampler);
        return outVar;
      }
      default:
        throw new Error('ValueType Unsupport ' + type);
    }
  }

  compileNodeValue(node: SGNodeData<SGNodes>, key: string) {
    return this.compileValue(node.data[key + 'Value'], node.data[key + 'ValueType']);
  }

  compileHeadCode(body: string, scope: 'vert' | 'frag') {
    const exclude = scope === 'frag' ? ['attributes'] : [];
    let headCode = '';
    const defineCode: string = Object.values<ContextItem>(this.context.defines)
      .filter(i => body.includes(i.varName))
      .map(i => this.doVarMap(i.code, scope))
      .join('\n');
    const testCode = body + defineCode;

    HeadContextItems.filter(i => !exclude.includes(i)).forEach(key => {
      let code = '';
      // to js object order
      const items = Object.keys(this.context[key])
        .sort()
        .map(i => this.context[key][i]);
      if (key === 'uniforms') {
        code = [
          'struct Uniform {',
          ...items
            // .filter(i => testCode.includes(i.varName.replace('u.', '')))
            .map(i => `  ${i.code},`),
          '};',
        ].join('\n');
      } else if (key === 'varyings') {
        code = [
          'struct Varying {',
          '  @builtin(position) position: vec4<f32>,',
          ...items
            .filter(i => testCode.includes(i.varName.replace('v.', '')))
            .map((i, k) => `  @location(${k}) ${i.code},`),
          '};',
        ].join('\n');
      } else {
        code = items
          .filter(i => testCode.includes(i.varName))
          .map(i => this.doVarMap(i.code, scope))
          .join('\n');
      }
      if (code)
        headCode += `
// ${key}
${code}`;
    });

    return headCode ? headCode + '\n\n' : '';
  }

  getLinkedVaryingNodes(
    nodeId: number,
    output: Array<SGNodeData<ReteVaryingNode>> = [],
  ): Array<SGNodeData<ReteVaryingNode>> {
    const nodeData = this.graphData.nodes[nodeId];
    if (!nodeData) return [];
    if (nodeData.name === VaryingRC.Name) output.push(nodeData as SGNodeData<ReteVaryingNode>);

    Object.values(nodeData.inputs).forEach(i =>
      i.connections.forEach(con => this.getLinkedVaryingNodes(con.node, output)),
    );
    return output;
  }

  linkBlocks(blocks: Array<SGNodeData<SGNodes>>, ignoreFirstLine = false) {
    // 收集block's input node's code, 然后输出block's code
    let codes: string[] = [];
    blocks.forEach(block => codes.push(this.getCode(block.id)));
    blocks.forEach(block => this.collectNodeInputCode(block.id, codes));
    const body = codes
      .reverse()
      .filter(i => !!i)
      .map((i, k) => (ignoreFirstLine && k === 0 ? i : `  ${i}`))
      .join('\n');
    return body;
  }

  getAutoVaryingsCode(fragCode: string) {
    const code = Object.values(this.context.autoVaryings)
      .filter(i => fragCode.includes(i.varName))
      .map(i => `  ${i.code}`)
      .join('\n');
    return code ? '\n  // auto varyings\n' + code : '';
  }

  prependVertSharedCode(vertBody: string) {
    return this.prependSharedCode(vertBody, 'vertShared');
  }

  prependFragSharedCode(fragBody: string) {
    return this.prependSharedCode(fragBody, 'fragShared');
  }

  doVarMap(body: string, scope: 'vert' | 'frag') {
    return Object.values(this.varNameMap).reduce((body, map) => {
      return body.replace(
        new RegExp(`(${map.varName})`, 'g'),
        scope === 'frag' ? map.fragName : map.vertName,
      );
    }, body);
  }

  prependSharedCode(body: string, scope: 'fragShared' | 'vertShared') {
    const stage = scope === 'fragShared' ? 'frag' : 'vert';
    let hasSharedCode = false;
    const code = Object.values(this.context[scope]).reduceRight((body, i) => {
      const codeMaped = this.doVarMap(i.code, stage);
      if (body.includes(i.varName)) {
        hasSharedCode = true;
        return `  ${codeMaped}\n${body}`;
      }
      return body;
    }, this.doVarMap(body, stage));
    return hasSharedCode ? `  // ${scope} codes\n` + code : code;
  }

  getUniformMap() {
    return Object.keys(this.context.uniforms).reduce((acc, contextKey) => {
      let { varName, code } = this.context.uniforms[contextKey];
      varName = varName.replace('u.', '');
      acc[contextKey] = {
        name: varName,
        type: code.replace(varName + ': ', ''),
      };
      return acc;
    }, {} as UniformMap);
  }

  getBindingMap() {
    return Object.keys(this.context.bindings).reduce((acc, key) => {
      const { varName, code, index } = this.context.bindings[key];
      const type = code.match(/\: ([_a-z0-9<>]+)/i)!;
      acc[key] = {
        name: varName,
        type: type[1],
        index: index!,
      };
      return acc;
    }, {} as BindingMap);
  }

  /** 编辑器使用, 需要compile执行后方可使用 */
  async compilePreview(node: ReteNode): Promise<SGCompilation> {
    if (!this.compilation) throw new Error('compile then compilePreview');
    if (!this.previewContext)
      this.previewContext = {
        id: -1,
        fragmentRC: new FragmentRC(),
        baseColorBlock: new BaseColorBlock(),
        getNodeData: async <T extends SGNodes>(rc: RC) => {
          const node = await rc.createNode();
          node.id = this.previewContext!.id--;
          return node.toJSON() as SGNodeData<T>;
        },
      };
    const { graphData } = this;
    const ctx = this.previewContext!;
    const nodes = Object.values(graphData.nodes);
    const vert = nodes.find(i => i.name === VertexRC.Name);
    // if (!vert) throw new Error('missing Vertex Context');
    const varyingNodes = this.getLinkedVaryingNodes(node.id);
    const varyingBlocks = (vert?.blocks || []).filter(
      i =>
        i.name === CustomInterpolatorBlock.Name &&
        varyingNodes.some(node => node.data.outValueName === i.data.varyingValueName),
    );
    let vertBody = this.linkBlocks(varyingBlocks);
    let fragCode = '';
    let vertCode = '';

    if (node.name === VaryingRC.Name) {
      if (!varyingBlocks[0])
        throw new Error('compile varying preview failed: missing CustomInterpolatorBlock');
      const { varName } = this.getContext(
        'varyings',
        varyingBlocks[0],
        varyingBlocks[0].data.varyingValueName,
      )!;
      const bodyCode = SGTemplates.unlit.frag(
        this.prependFragSharedCode(`*baseColor = ${varName}.xyz;`),
      );
      const headCode = this.compileHeadCode(bodyCode, 'frag');
      fragCode = headCode + '\n' + bodyCode;
      vertBody += this.getAutoVaryingsCode(fragCode);
      vertBody = this.prependVertSharedCode(vertBody);
      vertCode =
        SG_VERT + this.compileHeadCode(vertBody, 'vert') + SGTemplates.unlit.vert(vertBody);
    } else {
      const baseColorData = await ctx.getNodeData<ReteBaseColorBlock>(ctx.baseColorBlock);
      const output = [...node.outputs.keys()][0];
      baseColorData.inputs.baseColor.connections.push({ node: node.id, output, data: {} });
      graphData.nodes[baseColorData.id] = baseColorData;

      const fragNodeData = await ctx.getNodeData<ReteFragmentContext>(ctx.fragmentRC);
      fragNodeData.blocks.push(baseColorData);

      const colorOut = (await BaseColorBlock.prototype.compileSG.call(null, this, baseColorData))!;
      const fragOut = (await FragmentRC.prototype.compileSG.call(null, this, fragNodeData))!;
      delete graphData.nodes[baseColorData.id];

      const fragBody = this.prependFragSharedCode(fragOut.code + '\n  ' + colorOut.code);
      fragCode = this.compileHeadCode(fragBody, 'frag') + SGTemplates.unlit.frag(fragBody);
      vertBody += this.getAutoVaryingsCode(fragCode);
      vertBody = this.prependVertSharedCode(vertBody);
      vertCode =
        SG_VERT + this.compileHeadCode(vertBody, 'vert') + SGTemplates.unlit.vert(vertBody);
    }

    return { ...this.compilation, fragCode, vertCode };
  }

  async compile(graphData: ShaderGraphData): Promise<SGCompilation> {
    this.context = initContext();
    this.resource = initResource();
    this.varNameMap = {};
    this.initBuiltinContext();
    await super.compile(graphData);

    // 完成最后的组装
    const nodes = Object.values(this.graphData.nodes);
    const vert = nodes.find(i => i.name === VertexRC.Name);
    const frag = nodes.find(i => i.name === FragmentRC.Name);

    if (!vert || !frag) throw new Error('GraphData missing Vertex or Fragment Node');
    const tempalte = (this.graphData as ShaderGraphData).setting.template;
    const tpl = SGTemplates[tempalte];
    if (!tpl) throw new Error('template unsupported ' + tempalte);

    const fragBody = tpl.frag(this.prependFragSharedCode(this.getCode(frag.id)));
    const fragHeadCode = this.compileHeadCode(fragBody, 'frag');
    let vertBody = this.getCode(vert.id) + this.getAutoVaryingsCode(fragHeadCode + fragBody);
    vertBody = tpl.vert(this.prependVertSharedCode(vertBody));
    const vertHeadCode = this.compileHeadCode(vertBody, 'vert');

    const compilation: SGCompilation = {
      setting: (this.graphData as ShaderGraphData).setting,
      parameters: (this.graphData as ShaderGraphData).parameters,
      resource: this.resource,
      vertCode: SG_VERT + vertHeadCode + vertBody,
      fragCode: fragHeadCode + fragBody,
      uniformMap: this.getUniformMap(),
      bindingMap: this.getBindingMap(),
    };
    this.compilation = compilation;
    return compilation;
  }

  async compileSubGraphPreview(subGraphData: ShaderGraphData): Promise<SGCompilation> {
    this.context = initContext();
    this.resource = initResource();
    this.varNameMap = {};
    this.initBuiltinContext();
    await super.compile(subGraphData);

    const nodes = Object.values(this.graphData.nodes);
    const output = nodes.find(i => i.name === OutputRC.Name);

    if (!output) throw new Error('GraphData missing Output Node');

    const fragBody = this.prependFragSharedCode(this.linkBlocks([output]));
    const fragHead = this.compileHeadCode(fragBody, 'frag');
    const fragCode = fragHead + SGTemplates.unlit.frag(fragBody);
    const vertBody = this.prependVertSharedCode(this.getAutoVaryingsCode(fragCode));
    const vertHead = SG_VERT + this.compileHeadCode(vertBody, 'vert');
    const vertCode = vertHead + SGTemplates.unlit.vert(vertBody);

    const compilation: SGCompilation = {
      setting: this.graphData.setting,
      parameters: this.graphData.parameters,
      resource: this.resource,
      vertCode,
      fragCode,
      uniformMap: this.getUniformMap(),
      bindingMap: this.getBindingMap(),
    };
    this.compilation = compilation;
    return compilation;
  }

  // 可能有点绕
  async compileSubGraph(subGraphData: ShaderGraphData): Promise<SubGraphCompiler> {
    const subGraphCompiler = new SubGraphCompiler(this);
    await subGraphCompiler.superCompile(subGraphData);
    return subGraphCompiler;
  }

  async superCompile(graphData: ShaderGraphData) {
    return super.compile(graphData);
  }

  dispose() {
    (this as any).graphData = undefined;
    const { todo, done, ready, changed, nodesCompilation, components } = this;
    [todo, done, ready, ...changed, nodesCompilation, components].forEach(i => i.clear());
  }
}

const stringifyFloat = (num: number): string => {
  const str = String(num);
  if (str.includes('.')) return str;
  return str + '.0';
};

export class SubGraphCompiler extends ShaderGraphCompiler {
  constructor(public sgCompiler: ShaderGraphCompiler) {
    super();
    this.components = this.sgCompiler.components;
    this.context = this.sgCompiler.context;
    this.resource = this.sgCompiler.resource;
    this.varNameMap = this.sgCompiler.varNameMap;
    this.subGraphProvider = this.sgCompiler.subGraphProvider;
  }

  setParameter(node: SGNodeData<ReteParameterNode>): string {
    return 'fnIn' + removeWhiteSpace(node.data.outValueName); // 见 SubGraphRC
  }

  compileSubGraph(subGraphData: ShaderGraphData): Promise<SubGraphCompiler> {
    return this.sgCompiler.compileSubGraph(subGraphData);
  }
}
