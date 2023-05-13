import './BlackBoard.less';
import {
  ParameterData,
  Rete,
  ValueType,
  ValueTypeCtor,
  ValueTypeEdit,
  ValueTypeNameMap,
  ValueTypeNameReverseMap,
  VectorTypes,
} from '../../types';
import React, { FC, MouseEventHandler, useContext, useEffect, useRef, useState } from 'react';
import { ContextMenu, InputAsset, InputColor, Moveable, moveableContext, Popup, InputVector } from '../common';
import { PopupView } from '.';
import { listenWindow } from '../../rete/view/utils';

interface ParameterItemProps {
  item: ParameterData;
  view: BlackBoardView;
  editor: Rete.NodeEditor;
}

const ParameterItem: FC<ParameterItemProps> = ({ editor, view, item }) => {
  const { type, name, defalutValue, exposed, editing = false } = item;
  const [show, setShow] = useState(false);
  const [expand, setExpand] = useState(false);
  const [edit, setEdit] = useState(editing);
  const [nameEdit, setName] = useState(name);
  const inputRef = useRef<HTMLInputElement>();
  const dragRef = useRef({ draging: false, item });
  const moveabelState = useContext(moveableContext);
  dragRef.current.item = item;

  const close = (cb: () => void) => () => {
    cb();
    setShow(false);
  };

  const doneEdit = () => {
    setEdit(false);
    if (!view.setParameter(name, { name: nameEdit })) setName(name);
  };

  const onPointerDown: MouseEventHandler<HTMLDivElement> = e => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current.draging = true;
  };

  useEffect(() => {
    if (edit) inputRef.current?.focus();
  }, [edit]);

  useEffect(() => {
    return listenWindow('pointerup', async e => {
      const { type, name, defalutValue, exposed } = dragRef.current.item;
      if (dragRef.current.draging) {
        dragRef.current.draging = false;
        const mouse = [e.clientX, e.clientY];
        if (moveabelState.moveState) {
          const { w, h, x, y } = moveabelState.moveState;
          if (mouse[0] > x && mouse[0] < x + w && mouse[1] > y && mouse[1] < y + h) return;
        }
        const com = editor.getComponent(view.parameterComponetnName);
        const node = await com.createNode({ outValue: defalutValue, outValueType: type, outValueName: name, exposed });
        const [gx, gy] = editor.view.area.convertToGraphSpace([e.clientX, e.clientY]);
        node.position[0] = gx;
        node.position[1] = gy;
        editor.addNode(node);
      }
    });
  }, []);

  return (
    <ContextMenu
      visiable={show}
      disabled={edit}
      onVisiableChange={setShow}
      items={[
        [
          { name: '重命名', onclick: close(() => setEdit(true)) },
          { name: '删除', onclick: close(() => view.delParameter(name)) },
        ],
        [{ name: '克隆', onclick: close(() => view.cloneParamter(name)) }],
      ]}>
      <div className="sg-parameter-item-can">
        <div className="sg-parameter-item-head">
          <div className="sg-parameter-item-btn-expand" data-aria-expanded={expand} onClick={() => setExpand(!expand)}>
            ▶︎
          </div>
          {edit ? (
            <input
              className="sg-parameter-item-input"
              type="text"
              // @ts-ignore
              onBlur={doneEdit}
              // @ts-ignore
              onKeyUp={e => e.key === 'Enter' && doneEdit()}
              ref={e => (inputRef.current = e!)}
              value={nameEdit}
              // @ts-ignore
              onChange={e => setName(e.target.value)}
            />
          ) : (
            <>
              <div className="sg-parameter-item" onPointerDownCapture={onPointerDown} onDoubleClick={() => setEdit(true)}>
                <div className="sg-parameter-item-exposed" style={{ display: exposed ? 'block' : 'none' }} />
                <div className="sg-parameter-item-name">{name}</div>
              </div>
              <div className="sg-parameter-item-type">{ValueTypeNameMap[type]}</div>
            </>
          )}
        </div>

        {expand && (
          <div className="sg-parameter-item-body">
            <div className="sg-parameter-item-setting">
              <div className="sg-parameter-item-setting-label">Exposed</div>
              {/* @ts-ignore */}
              <input type="checkbox" checked={exposed} onChange={() => view.setParameter(name, { exposed: !exposed })} />
            </div>
            <div className="sg-parameter-item-setting">
              <div className="sg-parameter-item-setting-label">Value</div>
              {VectorTypes.includes(item.type) &&
                (item.typeEdit === 'color' ? (
                  <InputColor value={defalutValue} onChange={v => view.setParameter(name, { defalutValue: v })} />
                ) : (
                  <InputVector value={defalutValue} valueType={type} onChange={v => view.setParameter(name, { defalutValue: v })} />
                ))}
              {item.type === ValueType.texture2d && (
                <InputAsset
                  editor={editor}
                  value={defalutValue}
                  valueType={type}
                  onChange={v => view.setParameter(name, { defalutValue: v })}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </ContextMenu>
  );
};

interface BlackBoardProps {
  editor: Rete.NodeEditor;
  view: BlackBoardView;
  data: Array<ParameterData>;
  visiable?: boolean;
  subtitle?: string;
}

const menuList = [
  ValueTypeNameMap.float,
  ValueTypeNameMap.vec2,
  ValueTypeNameMap.vec3,
  ValueTypeNameMap.vec4,
  'Color',
  ValueTypeNameMap.texture2d,
  ValueTypeNameMap.mat2,
  ValueTypeNameMap.mat3,
  ValueTypeNameMap.mat4,
];

export const BlackBoard: FC<BlackBoardProps> = ({ visiable, view, editor, subtitle, data }) => {
  const [showMenu, setMenuShow] = useState(false);

  const onItemClick = (name: string) => {
    setMenuShow(false);
    let type = ValueTypeNameReverseMap[name];
    let typeEdit: ValueTypeEdit;
    let customName: string | undefined;
    if (name === 'Color') {
      type = ValueType.vec3;
      typeEdit = 'color';
      customName = 'Color';
    }
    view.addParamter(type, true, typeEdit, customName);
  };

  return (
    <Popup view={view} visiable={visiable} mask={false} keepAlive root={editor.view.container}>
      <Moveable containerEl={editor.view.container} gap={20}>
        <div className="sg-blackboard">
          <div className="sg-blackboard-head">
            <div className="sg-blackboard-title">{editor.id}</div>
            <div className="sg-blackboard-h2">
              <div className="sg-blackboard-subtitle">{subtitle}</div>
              <ContextMenu
                clickable
                visiable={showMenu}
                items={[menuList.map(name => ({ name, onclick: onItemClick }))]}
                onVisiableChange={setMenuShow}>
                <div className="sg-blackboard-btn-add">+</div>
              </ContextMenu>
            </div>
          </div>

          <div className="sg-blackboard-body">
            {data.map((i, k) => (
              <ParameterItem editor={editor} view={view} item={i} key={k} />
            ))}
          </div>
        </div>
      </Moveable>
    </Popup>
  );
};

export class BlackBoardView extends PopupView<BlackBoardProps> {
  constructor(
    public editor: Rete.NodeEditor,
    public data: BlackBoardProps['data'],
    public parameterComponetnName: string,
    subtitle?: string,
  ) {
    super(editor, BlackBoard, 'sg-blackboard-can');
    this.props = { editor, view: this, subtitle, data };
  }

  fromJSON(data: Array<ParameterData>) {
    this.data = data;
    this.props.data = data;
    this.update();
  }

  toJSON(): Array<ParameterData> {
    return this.data.map(i => ({ name: i.name, type: i.type, defalutValue: i.defalutValue, exposed: i.exposed, typeEdit: i.typeEdit }));
  }

  addParamter(type: ValueType, editing = false, typeEdit?: ValueTypeEdit, customName?: string) {
    const nextIndex = this.data.filter(i => i.type == type).length;
    let name = customName || ValueTypeNameMap[type];
    if (nextIndex) name += `(${nextIndex})`;

    this.data.push({ name, type, exposed: true, defalutValue: ValueTypeCtor[type]?.(), editing, typeEdit });
    this.update();
  }

  setParameter(name: string, data: Partial<ParameterData>): boolean {
    const item = this.data.find(i => i.name === name);
    if (data.name !== undefined && !data.name) {
      this.editor.trigger('warn', `Paramter name invalid ${data.name}`);
      return false;
    }
    if (data.name) {
      if (data.name === name) return true;
      const nameUsedItem = this.data.find(i => i.name === data.name);
      if (nameUsedItem) {
        this.editor.trigger('warn', `Paramter name used ${data.name}`);
        return false;
      }
    }
    if (item) {
      Object.keys(data).forEach(key => {
        // @ts-ignore
        item[key] = data[key];
      });
      this.editor.trigger('paramterchange', {
        name,
        outValue: item.defalutValue,
        outValueName: item.name,
        outValueType: item.type,
        exposed: item.exposed,
      });
      this.update();
      return true;
    }
    return false;
  }

  delParameter(name: string) {
    const index = this.data.findIndex(i => i.name === name);
    if (index > -1) {
      this.data.splice(index, 1);
      this.editor.trigger('paramterdelete', { name });
      this.update();
    }
  }

  cloneParamter(name: string) {
    const item = this.data.find(i => i.name === name);

    if (item) {
      this.data.push({ ...item, name: `${item.name} copy`, defalutValue: ValueTypeCtor[item.type]?.(), editing: true });
      this.update();
    }
  }
}
