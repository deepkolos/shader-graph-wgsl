import { ShaderGraphData } from '../editors';
import {
  AssetValue,
  MaybePromise,
  ParameterData,
  SamplerValue,
  ValueOf,
  ValueType,
} from '../types';

export type SGNodeOutput = MaybePromise<{
  outputs: { [outputName: string]: string };
  code: string;
} | void>;

export type ContextMap = {
  [contextKey: string]: { varName: string; code: string; index?: number };
};
export type ContextItem = ValueOf<ContextMap>;
export type ResourceMap<T> = {
  [contextKey: string]: T | undefined;
};
export type ResourceItem = ValueOf<ResourceMap<AssetValue | SamplerValue>>;
export type VarNameMap = {
  [contextKey: string]: { vertName: string; fragName: string; varName: string };
};
export type VarNameItem = ValueOf<VarNameMap>;

export type Context = ReturnType<typeof initContext>;
export type ContextKeys = keyof Context;
export const initContext = () => ({
  uniforms: {} as ContextMap,
  attributes: {} as ContextMap,
  varyings: {} as ContextMap,
  defines: {} as ContextMap,
  bindings: {} as ContextMap,
  vertShared: {} as ContextMap,
  fragShared: {} as ContextMap,
  autoVaryings: {} as ContextMap,
});

export type Resource = ReturnType<typeof initResource>;
export type ResourceKeys = keyof Resource;
export const initResource = () => ({
  texture: {} as ResourceMap<AssetValue>,
  sampler: {} as ResourceMap<SamplerValue>,
});

export type CodeFn = (varName: string, index: number) => string;
export type NodeName = { name: string };

export const VectorComponetMap = Object.freeze({
  [ValueType.float]: 'x',
  [ValueType.vec2]: 'xy',
  [ValueType.vec3]: 'xyz',
  [ValueType.vec4]: 'xyzw',
} as const);

export const HeadContextItems = [
  'uniforms',
  'attributes',
  'varyings',
  'defines',
  'bindings',
] as const;

export type UniformMap = { [contextKey: string]: { name: string; type: string } };
export type BindingMap = { [contextKey: string]: { name: string; type: string; index: number } };

export interface SGCompilation {
  setting: ShaderGraphData['setting'];
  parameters: ParameterData[];
  resource: Resource;
  uniformMap: UniformMap;
  bindingMap: BindingMap;
  vertCode: string;
  fragCode: string;
}
