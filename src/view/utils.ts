export const preventDefault = (e: any) => e.preventDefault();
export const stopPropagation = (e: any) => e.stopPropagation();
export const isChildOf = (child: HTMLElement | null, parent?: HTMLElement, maxSearch = 20) => {
  if (!parent) return false;
  let curr: HTMLElement | null = child;

  while (maxSearch-- > 0 && curr) {
    if (curr === parent) return true;
    curr = curr.parentElement;
  }

  return false;
};
