import cartoonWater from './CartoonWater.json';
import imgFlowmap from './flowmap.png';
import imgNoise from './noise.png';

const replaceImg = <T>(json: T): T => {
  let jsonStr = JSON.stringify(json);
  jsonStr = jsonStr.replace(/40bdd9aa-3430-4678-9549-877e9f125c44--764eb/g, imgFlowmap);
  jsonStr = jsonStr.replace(/ded3a365-f6f7-4ff1-85d1-05c554ca7f05--764eb/g, imgNoise);
  return JSON.parse(jsonStr) as T;
};

const demoCartoonWater = replaceImg(cartoonWater);

export default demoCartoonWater;
