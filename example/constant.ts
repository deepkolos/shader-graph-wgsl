export const graphKey = 'graph';
export const defaultGraph = 'demoFlowMap';
export const params = new URLSearchParams(location.search);
export const showTestToolBar = params.get('test') === 'true';
export const showEngineUsage = params.get('engine');

export const getUrlWithParams = (name: string, value: string) => {
  const params = new URLSearchParams(location.search);
  params.set(name, value);
  const url = location.origin + location.pathname + '?' + params.toString();
  return url;
};
