import devCompile from './dev/devCompile.json';
import devVarying from './dev/devVarying.json';
import devTexture2D from './dev/devTexture2D.json';
import devTrigonometry from './dev/devTrigonometry.json';
import devAdvanced from './dev/devAdvanced.json';
import devBasic from './dev/devBasic.json';
import devDDXY from './dev/devDDXY.json';
import devInterpolation from './dev/devInterpolation.json';
import devRange from './dev/devRange.json';
import devDynamicVector from './dev/devDynamicVector.json';
import devRound from './dev/devRound.json';
import devVector from './dev/devVector.json';
import devWave from './dev/devWave.json';
import devGeometry from './dev/devGeometry.json';
import devChannel from './dev/devChannel.json';
import devProcedural from './dev/devProcedural.json';
import devDynamicVecMat from './dev/devDynamicVecMat.json';
import devUtility from './dev/devUtility.json';
import devLit from './dev/devLit.json';
import devSubGraph from './dev/devSubGraph.json';
import devSubGraphNested from './dev/devSubGraphNested.json';
import devSubGraphUsage from './dev/devSubGraphUsage.json';
import devArtistic from './dev/devArtistic.json';
import devUV from './dev/devUV.json';
import devInput from './dev/devInput.json';
import devSRGB_ from './dev/devSRGB.json';
import demoGradient from './demo/demoGradient.json';
import demoDissolve from './demo/demoDissolve.json';
import demoFresnelOutline from './demo/demoFresnelOutline.json';
import demoConstantBiasScaleSubGraph from './demo/demoConstantBiasScaleSubGraph.json';
import demoFlowMapSubGraph from './demo/demoFlowMapSubGraph.json';
import demoFlowMap from './demo/demoFlowMap.json';
import demoImageFlip from './demo/demoImageFlip.json';
import demoCartoonWater from './demo/demoCartoonWater';
import demoSkybox from './demo/demoSkybox.json';
import demoSummberDissolve from './demo/demoSummberDissolve.json';
import demoCustomMap from './demo/demoCustomMap.json';

import * as gLTF from './dev/gLTF';

const replaceGLTFTex = <T>(json: T): T => {
  const data = JSON.parse(JSON.stringify(json)) as any;
  const gLTFKeys = Object.keys(gLTF);
  Object.values(data.nodes).forEach((node: any) => {
    if (node.name === 'SampleTexture2D' && node.data.textureValue) {
      const { label } = node.data.textureValue;
      // @ts-ignore
      node.data.textureValue.id = gLTF[gLTFKeys.find(i => label.includes(i))];
    }
  });
  return data as T;
};
const devSRGB = replaceGLTFTex(devSRGB_);

export const Presets = {
  devCompile,
  devVarying,
  devTexture2D,
  devTrigonometry,
  devAdvanced,
  devBasic,
  devDDXY,
  devInterpolation,
  devRange,
  devDynamicVector,
  devRound,
  devVector,
  devWave,
  devGeometry,
  devChannel,
  devProcedural,
  devDynamicVecMat,
  devUtility,
  devLit,
  devSubGraph,
  devSubGraphNested,
  devSubGraphUsage,
  devArtistic,
  devUV,
  devInput,
  devSRGB,
  demoGradient,
  demoDissolve,
  demoFresnelOutline,
  demoConstantBiasScaleSubGraph,
  demoFlowMapSubGraph,
  demoFlowMap,
  demoImageFlip,
  demoCartoonWater,
  demoSkybox,
  demoSummberDissolve,
  demoCustomMap,
};