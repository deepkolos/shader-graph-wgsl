export function listenWindow<K extends keyof WindowEventMap>(event: K, handler: (e: WindowEventMap[K]) => void) {
  window.addEventListener(event, handler);

  return () => {
    window.removeEventListener<K>(event, handler);
  };
}

export function listen<K extends keyof HTMLElementEventMap>(el: HTMLElement, event: K, handler: (e: HTMLElementEventMap[K]) => void) {
  el.addEventListener(event, handler);
  return () => el.removeEventListener<K>(event, handler);
}

export function rebind<K, V extends { el: HTMLElement; destroy?: () => void; onRebind?: (el?: HTMLElement) => void }>(
  viewMap: Map<K, V>,
  key: K,
  el: HTMLElement,
  viewCtor: () => V,
  reuse = false,
) {
  const view = viewMap.get(key);
  let newView = !view;
  if (view && view.el !== el && !reuse) {
    view.destroy?.();
    newView = true;
  }
  if (newView) viewMap.set(key, viewCtor());
  else view?.onRebind?.(el);
}

export function getOffset(el: HTMLElement, offsetParentEl: HTMLElement, searchDepth = 8) {
  let x = el.offsetLeft;
  let y = el.offsetTop;
  let parent = el.offsetParent as HTMLElement | null;

  while (parent && parent !== offsetParentEl && searchDepth > 0) {
    searchDepth--;
    x += parent.offsetLeft;
    y += parent.offsetTop;
    parent = parent.offsetParent as HTMLElement | null;
  }

  return { x, y };
}
