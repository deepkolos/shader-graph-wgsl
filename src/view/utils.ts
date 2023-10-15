import { ShaderGraphEditor } from "../editors";
import { MaterialTemplates } from "../templates";

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

export function printCollapsed(title: string, content?: string) {
  console.groupCollapsed(`===== ${title} =====`);
  console.log('%c' + content, 'font-size: 14px');
  console.groupEnd();
}

export async function printCompile(editor?: ShaderGraphEditor) {
  if (editor) {
    let vertCode = '';
    let fragCode = '';
    const data = editor.toJSON();
    if (editor.editing === 'ShaderGraph') {
      ({ vertCode, fragCode } = await editor.compiler.compile(data));
    }
    if (editor.editing === 'SubGraph') {
      ({ vertCode, fragCode } = await editor.compiler.compileSubGraphPreview(data));
    }
    printCollapsed('SG VertCode', vertCode);
    printCollapsed('SG FragCode', fragCode);

    const tpl = MaterialTemplates[data.setting.template];
    if (tpl) {
      printCollapsed('Material VertCode', tpl.vert(vertCode));
      printCollapsed('Material FragCode', tpl.frag(fragCode));
    }
  }
}
