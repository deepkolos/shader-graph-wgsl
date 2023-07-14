import * as Rete from './rete';
import { Data } from './rete/core/data';
import { Sockets } from './sockets';

export { Rete };
export type GraphData = Data;

export enum ValueType {
  float = 'float',
  vec2 = 'vec2',
  vec3 = 'vec3',
  vec4 = 'vec4',
  mat4 = 'mat4',
  mat3 = 'mat3',
  mat2 = 'mat2',
  texture2d = 'texture2d',
  sampler = 'sampler',
  gradient = 'gradient',
  vertex = 'vertex',
  string = 'string',
  bool = 'bool',
}
export const VectorTypes = [ValueType.float, ValueType.vec2, ValueType.vec3, ValueType.vec4];
export type VectorValueType = ValueType.float | ValueType.vec2 | ValueType.vec3 | ValueType.vec4;
export const MatrixTypes = [ValueType.mat2, ValueType.mat3, ValueType.mat4];
export type MatrixValueType = ValueType.mat2 | ValueType.mat3 | ValueType.mat4;

export const ValueTypeNameMap: { [k in ValueType]: string } = Object.freeze({
  float: 'Float',
  vec2: 'Vector 2',
  vec3: 'Vector 3',
  vec4: 'Vector 4',
  mat4: 'Matrix 4',
  mat3: 'Matrix 3',
  mat2: 'Matrix 2',
  texture2d: 'Texture 2D',
  sampler: 'Sampler',
  gradient: 'Gradient',
  vertex: 'Vertex',
  string: 'String',
  bool: 'Bool',
} as const);

export const ValueTypeNameReverseMap: { [k: string]: ValueType } = Object.freeze(
  Object.keys(ValueTypeNameMap).reduce((acc, key) => {
    // @ts-ignore
    acc[ValueTypeNameMap[key]] = key;
    return acc;
  }, {}),
) as any;

export const ValueTypeSocketMap = Sockets;

export const ValueTypeColorMap: { [k in ValueType]: string } = Object.freeze({
  float: '#9ae2e5',
  vec2: '#adec9b',
  vec3: '#f8fda6',
  vec4: '#f3cdf1',
  mat4: '#99c0dc',
  mat3: '#99c0dc',
  mat2: '#99c0dc',
  texture2d: '#f0918e',
  sampler: '#c8c8c8',
  gradient: '#c8c8c8',
  vertex: '#c8c8c8',
  string: '#c8c8c8',
  bool: '#675f98',
} as const);

export const ValueComponentMap: { [k: string]: number } = Object.freeze({
  float: 1,
  vec2: 2,
  vec3: 3,
  vec4: 4,
});

export const ValueComponentReverseMap: { [k: number]: ValueType } = Object.freeze({
  1: ValueType.float,
  2: ValueType.vec2,
  3: ValueType.vec3,
  4: ValueType.vec4,
} as const);

export const MatrixVectorMap = Object.freeze({
  mat4: ValueType.vec4,
  mat3: ValueType.vec3,
  mat2: ValueType.vec2,
});

export const ChannelLenNeedsMap = Object.freeze({
  r: 1,
  g: 2,
  b: 3,
  a: 4,
  x: 1,
  y: 2,
  z: 3,
  w: 4,
} as const);

export const ValueTypeCtor = Object.freeze({
  float: () => 0,
  vec2: () => [0, 0],
  vec3: () => [0, 0, 0],
  vec4: () => [0, 0, 0, 0],
  mat4: () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  mat3: () => [0, 0, 0, 0, 0, 0, 0, 0, 0],
  mat2: () => [0, 0, 0, 0],
} as const);

export type NodeValueCfg = {
  dataKey: string;
  options?: string[];
  labelWidth?: string;
  itemWidth?: string;
  itemHeight?: string;
  textarea?: boolean;
  asset?: { type: ValueType };
  excludes?: { [value: string]: string[] };
  onChange?(node: ReteNode, value: any, editor: Rete.NodeEditor): boolean;
};

export type NodeListCfg = {
  list: any[];
  Item: any;
  onAdd(list: any[]): any;
  onDel(item: any): void;
  onChange?(node: ReteNode, value: any, editor: Rete.NodeEditor): boolean;
};

export interface ReteNode extends Rete.Node {
  data: {
    expanded: boolean;
    preview: boolean;
    previewType?: '2d' | '3d';
    [k: string]: any;
  };
  meta: {
    undeleteable?: boolean;
    previewDisabled: boolean;
    category: string;
    keywords?: string[];
    label?: string; // 取节点名时 node.meta.label || node.name
    nodeCfgs?: {
      [label: string]: NodeValueCfg | NodeListCfg;
    };
    [k: string]: any;
  };
}

export type ReteContextNode = ExtendReteNode<
  string,
  {},
  {
    blockComponents: string[];
    isContext: true;
  }
>;

export interface ExtendReteNode<Name extends string, Data = {}, Meta = {}> extends ReteNode {
  name: Name;
  data: ReteNode['data'] & Data;
  meta: ReteNode['meta'] & Meta;
}

export interface ExtendReteContext<Name extends string, Data = {}, Meta = {}>
  extends ReteContextNode {
  name: Name;
  data: ReteContextNode['data'] & Data;
  meta: ReteContextNode['meta'] & Meta;
}

export type ValueTypeEdit = undefined | 'color';
export interface ParameterData {
  type: ValueType;
  name: string;
  defalutValue: any;
  exposed: boolean;
  editing?: boolean;
  typeEdit?: ValueTypeEdit;
}

export type AssetValue = { id: string; label: string } | undefined;
// TODO support tangent
export const SpaceOptions = ['object', 'view', 'world'] as const;
export type SpaceValue = ArrayElement<typeof SpaceOptions>;
// TODO support UV123
export const UVOptions = ['UV0'] as const;
export type UVValue = ArrayElement<typeof UVOptions>;
export type SamplerValue = {
  filter: 'linear' | 'point' | 'trilinear';
  warp: 'repeat' | 'clamp' | 'mirror';
};

export const SpaceSuffixMap = Object.freeze({
  object: 'OS',
  tangent: 'TS',
  view: 'VS',
  world: 'WS',
  clip: 'CS',
} as const);

export const UV_OPTIONS = ['UV0', 'UV1', 'UV2', 'UV3'];

export type ValueOf<T> = T[keyof T];
export type MaybePromise<T> = T | Promise<T>;
export type IsPromise<T> = T extends Promise<infer V> ? Promise<V> : never;
export type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export const isVectorType = (valueType?: ValueType) =>
  !!valueType && VectorTypes.includes(valueType);
export const isMatrixType = (valueType?: ValueType) =>
  !!valueType && MatrixTypes.includes(valueType);

export const ValueTypeAbbreviationMap: { [k: string]: string } = {
  float: '1',
  vec2: '2',
  vec3: '3',
  vec4: '4',
  texture2d: 'T2',
  sampler: 'SS',
  gradient: 'G',
  mat4: '4x4',
  mat3: '3x3',
  mat2: '2x2',
};
