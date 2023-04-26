/* !!! 运行时 不可引入SG编辑器相关代码, 除了import type !!! */
import type { AssetValue } from '../types';

export let ResourceAdapter = (asset: AssetValue) => {
  return asset?.id;
};

export function setResourceAdapter(adapter: typeof ResourceAdapter) {
  ResourceAdapter = adapter;
}
