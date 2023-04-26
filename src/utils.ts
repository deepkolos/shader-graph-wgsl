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
