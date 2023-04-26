import { AssetValue, MaybePromise } from '../types';
import { ShaderGraphData } from './ShaderGraphTypes';

export interface SubGraphProvider {
  getList(): MaybePromise<Array<AssetValue>> ;
  getGraphData(asset: AssetValue): MaybePromise<ShaderGraphData>;
}
