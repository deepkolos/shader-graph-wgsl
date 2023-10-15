export function deepCopy(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function lowerCaseFirstLetter(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function removeWhiteSpace(str: string) {
  return str.replace(/[ \(\)]/g, '');
}

// https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
export function hash(str: string) {
  let hash = 0;
  let chr: number;
  if (str.length === 0) return hash.toString(16).replace('-', 'n');
  for (let i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16).replace('-', 'n');
}

export function SRGBToLinear(c: number): number {
  return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}

export function LinearToSRGB(c: number): number {
  return c < 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 0.41666) - 0.055;
}