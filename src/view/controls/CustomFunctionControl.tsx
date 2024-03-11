import './CustomFunctionControl.less';
import React, { FC, useEffect, useRef, useState } from 'react';
import { ReteCustomFunctionNode } from '../../components';
import { Rete } from '../../types';
import ReactDOM from 'react-dom';
import { stopPropagation } from '../utils';
import { basicSetup, EditorView } from 'codemirror';
import { wgsl } from '@iizukak/codemirror-lang-wgsl';
import { Annotation, EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { getOffset } from '../../rete/view/utils';
import { linter, Diagnostic } from '@codemirror/lint';
import { indentWithTab } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { keymap } from '@codemirror/view';

const External = Annotation.define<boolean>();

interface CustomFunctionViewProps {
  node: ReteCustomFunctionNode;
  editor: Rete.NodeEditor;
  onChange: (prefix: string, v: string) => void;
}

const ExampleCode = `// Custom Function 示例

// 注意事项: 
// 本代码将直接写入到wgsl内, 需注意复制后导致函数重复定义
// 但会复用完全相同的代码片段

fn myOtherFn2() -> f32 {
  return 0.2;
}

// FnName 填写的函数名 主函数入口 可以定义所需要辅助函数
// 数据获取, 如UV Position 均可由有SG对应节点提供
// FN_ARGS 等效于 A: f32, B: f32, Out: ptr<function, f32>
fn myAdd2(FN_ARGS) {
  *Out = A + B + myOtherFn2();
}`;

const ExampleNode = {
  typeValue: 'code',
  typeValueType: 'string',
  nameValue: 'myAdd2',
  nameValueType: 'string',
  bodyValue: '',
  bodyValueType: 'string',
  fileValueType: 'string',
  expanded: true,
  preview: true,
  defineValue: '',
  defineValueType: 'string',
  codeValue: ExampleCode,
  codeValueType: 'string',
  editingCodeValue: true,
  editingCodeValueType: 'bool',
  fnInAValue: '0.5',
  fnInAValueType: 'float',
  fnInBValue: '0.5',
  fnInBValueType: 'float',
  fnOutOutValue: 0,
  fnOutOutValueType: 'float',
};

export const CustomFunctionView: FC<CustomFunctionViewProps> = ({ node, onChange, editor }) => {
  const [show, setShow] = useState(node.getValue('editingCode'));
  const rootRef = useRef<HTMLDivElement>();
  const canRef = useRef<HTMLDivElement>();
  const cmCanRef = useRef<HTMLDivElement>();
  const cmViewRef = useRef<EditorView>();
  const cmDiagnosticRef = useRef<Diagnostic[]>([]);

  const onExampleClick = async () => {
    const com = editor.components.get('CustomFunction') as Rete.Component | undefined;
    if (com && rootRef.current) {
      const node = await com.createNode(ExampleNode);
      const { left, top } = rootRef.current.getBoundingClientRect();
      const [gx, gy] = editor.view.area.convertToGraphSpace([left, top]);
      node.position[0] = gx + 300;
      node.position[1] = gy - 320;
      editor.addNode(node);
    }
  };

  // 初始化codemirror
  useEffect(() => {
    if (!cmCanRef.current) return;
    cmViewRef.current =
      cmViewRef.current ||
      new EditorView({
        parent: cmCanRef.current,
        doc: node.data.codeValue,
        extensions: [
          basicSetup,
          wgsl(),
          oneDark,
          EditorState.tabSize.of(2),
          keymap.of([indentWithTab]),
          indentUnit.of(' '),
          EditorView.theme({ '&': { maxHeight: '600px', maxWidth: '700px' } }),
          EditorView.updateListener.of(vu => {
            if (vu.docChanged && !vu.transactions.some(tr => tr.annotation(External))) {
              onChange('code', vu.state.doc.toString());
              cmDiagnosticRef.current.length = 0;
            }
          }),
          linter(() => cmDiagnosticRef.current, { delay: 30 }),
        ],
      });
  }, [cmCanRef.current]);

  // 销毁cm示例
  useEffect(() => () => cmViewRef.current?.destroy(), []);

  // 位置同步
  useEffect(() => {
    if (node.data.typeValue === 'code') {
      const syncPos = (e?: any) => {
        if (e && e.node && e.node !== node) return;
        if (rootRef.current && canRef.current) {
          const root = rootRef.current;
          const can = canRef.current;
          const { left, top } = root.getBoundingClientRect();
          const { x: offsetLeft, y: offsetTop } = getOffset(editor.view.container, document.body, 100);
          can.style.transform = `translate(${left - offsetLeft}px, ${top - offsetTop}px) scale(${editor.view.area.transform.k})`;
        }
      };
      syncPos();
      return editor.on(['zoomed', 'translated', 'translatenode'], syncPos);
    }
  }, [node.data.typeValue]);

  // 监听编译报错
  // useEffect(
  //   () =>
  //     editor.on('previewclientcompileerror', ({ node: tartgetNode, errorInCode, errorOther }) => {
  //       if (node !== tartgetNode) return;
  //       cmDiagnosticRef.current = errorInCode.map(({ from, to, error: message }) => ({
  //         to,
  //         from,
  //         message,
  //         severity: 'error',
  //       }));
  //       errorOther.forEach(({ error, context }) => {
  //         cmDiagnosticRef.current.push({ to: 0, from: 0, message: error + '\n\n' + context, severity: 'error' });
  //       });
  //     }),
  //   [],
  // );

  return (
    <div className="sg-custom-fn" ref={el => (rootRef.current = el!)}>
      {/* 为了层叠关系 transform 会创建一个stacking context */}
      {ReactDOM.createPortal(
        <div
          style={{ display: node.data.typeValue === 'code' ? 'block' : 'none' }}
          className="sg-custom-fn-can"
          onContextMenuCapture={stopPropagation}
          ref={el => (canRef.current = el!)}
        >
          <div
            className="sg-custom-fn-btn sg-custom-fn-btn-toogle"
            onClick={() => {
              setShow(!show);
              node.data.editingCodeValue = !show;
            }}
          >
            ✍️
          </div>

          <div style={{ display: show ? 'block' : 'none' }}>
            <div className="sg-custom-fn-head">
              <div className="sg-custom-fn-name">FnName</div>
              <input
                className="sg-custom-fn-input-name"
                value={node.data.nameValue}
                onChange={e => {
                  node.meta.label = e.target.value + '(Custom Function)';
                  onChange('name', e.target.value);
                  node.update?.();
                }}
              />
              <button className="sg-custom-fn-btn" onClick={onExampleClick}>
                示例
              </button>
            </div>
            <div className="sg-custom-fn-body sg-custom-fn-editor" ref={el => (cmCanRef.current = el!)} />
          </div>
        </div>,
        editor.view.container,
      )}
    </div>
  );
};

export class CustomFunctionControl extends Rete.Control {
  props: CustomFunctionViewProps;
  component = CustomFunctionView;

  constructor(node: ReteCustomFunctionNode, editor: Rete.NodeEditor) {
    super('unused');
    this.props = { node, onChange: this.onChange, editor };
  }

  onChange = (prefix: string, val: any) => {
    this.setNodeValue(prefix, val);
    this.update();
  };
}
