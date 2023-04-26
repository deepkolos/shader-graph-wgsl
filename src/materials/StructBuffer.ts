// https://github.com/microsoft/TypeScript/issues/53062
// 不能嵌套这个, 只是单层的
type NoEmptyRecord<T> = T & (keyof T extends never ? 'No empty object' : {});

export namespace wgsl {
  enum PrimitiveDataViewGet {
    f32 = 'getFloat32',
    u32 = 'getUint32',
    i32 = 'getInt32',
  }
  enum PrimitiveDataViewSet {
    f32 = 'setFloat32',
    u32 = 'setUint32',
    i32 = 'setInt32',
  }
  export enum PrimitiveToGPUVertexFormat {
    f32 = 'float32',
    u32 = 'uint32',
    i32 = 'sint32',
    vec2_f32 = 'float32x2',
    vec3_f32 = 'float32x3',
    vec4_f32 = 'float32x4',
  }
  // prettier-ignore
  const PrimitiveTypedArrayMap: {
    [k in PrimitiveNumber]: Float64ArrayConstructor | Float32ArrayConstructor | Uint32ArrayConstructor | Uint16ArrayConstructor | Int16ArrayConstructor | Uint8ArrayConstructor | Int8ArrayConstructor | Int32ArrayConstructor;
  } = Object.freeze({
    f32: Float32Array,
    u32: Uint32Array,
    i32: Int32Array,
  });
  const PrimitiveTypedArrayLenMap: { [k: string]: number } = Object.freeze({
    vec2: 2,
    vec3: 3,
    vec4: 4, // mat3x3 layout:  1 1 1 0
    mat3x3: 12, // = 48 / 4     1 1 1 0
    mat4x4: 16, //              1 1 1 0
  });
  const PrimitiveAlignSize: { [K in Primitive]: { size: number; align: number } } = Object.freeze({
    f32: { size: 4, align: 4 },
    u32: { size: 4, align: 4 },
    i32: { size: 4, align: 4 },
    vec2_f32: { size: 8, align: 8 },
    vec3_f32: { size: 12, align: 16 },
    vec4_f32: { size: 16, align: 16 },
    mat4x4_f32: { size: 64, align: 16 },
    mat3x3_f32: { size: 48, align: 16 },
  });
  export type PrimitiveNumber = 'f32' | 'u32' | 'i32';
  export type PrimitiveTypedArray =
    | 'vec2_f32'
    | 'vec3_f32'
    | 'vec4_f32'
    | 'mat4x4_f32'
    | 'mat3x3_f32';
  export type Primitive = PrimitiveNumber | PrimitiveTypedArray;
  export type PrimitiveView = {
    f32: number;
    u32: number;
    i32: number;
    vec2_f32: Float32Array;
    vec3_f32: Float32Array;
    vec4_f32: Float32Array;
    mat4x4_f32: Float32Array;
    mat3x3_f32: Float32Array;
  };
  export type Array = [struct: Struct, length: number, runtimeSized?: boolean];
  export type Struct = {
    [k: string]: Primitive | Array | Struct;
  };
  type PlainPrimitive = Exclude<Primitive, 'mat4x4_f32' | 'mat3x3_f32'>;
  export type PlainStruct = {
    [k: string]: PlainPrimitive;
  };
  export type StructView<T extends Struct> = {
    [K in keyof T]: T[K] extends Struct
      ? StructView<T[K]>
      : T[K] extends Array
      ? StructView<T[K][0]>[]
      : T[K] extends Primitive
      ? PrimitiveView[T[K]]
      : never;
  };
  export type PlainStructInfo<T extends PlainStruct> = {
    [K in keyof T]: { size: number; offset: number };
  };

  function nextAlign(current: number, align: number): number {
    let aligned = current - (current % align);
    if (current % align != 0) aligned += align;
    return aligned;
  }

  export function structSize<T extends Struct>(struct: T, ignoreAlign?: boolean): number {
    let stride = 0;
    for (const value of Object.values(struct)) {
      const { align, size } = structValueSizeAlign(value);
      stride = nextAlign(stride, ignoreAlign ? 1 : align) + size;
    }
    stride = nextAlign(stride, structAlign(struct, ignoreAlign));
    return stride;
  }

  function structValueSizeAlign(value: Primitive | Array | Struct) {
    let align: number, size: number, itemSize: number | undefined;
    if (Array.isArray(value)) {
      align = structAlign(value[0]);
      itemSize = structSize(value[0]);
      size = itemSize * value[1];
    } else if (typeof value === 'object') {
      align = structAlign(value);
      size = structSize(value);
    } else {
      ({ align, size } = PrimitiveAlignSize[value]);
    }
    return { align, size, itemSize: itemSize ?? size };
  }

  export function structAlign<T extends Struct>(struct: T, ignoreAlign?: boolean): number {
    if (ignoreAlign) return 1;
    return Math.max(
      ...Object.values(struct).map(value => {
        if (Array.isArray(value)) {
          return structAlign(value[0]);
        } else if (typeof value === 'object') {
          return structAlign(value);
        } else {
          return PrimitiveAlignSize[value].align;
        }
      }),
    );
  }

  export function structView<T extends Struct>(
    buffer: ArrayBuffer,
    struct: T,
    byteOffset = 0,
    ignoreAlign = false,
  ): StructView<T> {
    const view: any = {};
    const dataView = new DataView(buffer);
    let stride = byteOffset;

    for (let [key, value] of Object.entries(struct)) {
      const { align, size, itemSize } = structValueSizeAlign(value);
      const offset = nextAlign(stride, ignoreAlign ? 1 : align);

      if (Array.isArray(value)) {
        const arrayView: any[] = new Array(value[1]);
        for (let i = 0, il = value[1]; i < il; i++) {
          arrayView[i] = structView(buffer, value[0], offset + itemSize * i, ignoreAlign);
        }
        Object.freeze(arrayView);
        view[key] = arrayView;
      } else if (typeof value === 'object') {
        view[key] = structView(buffer, value, offset, ignoreAlign);
      } else {
        if (value.indexOf('_') > -1) {
          const [prefix, primitive] = value.split('_') as [string, PrimitiveNumber];
          const TypedArray = PrimitiveTypedArrayMap[primitive];
          const length = PrimitiveTypedArrayLenMap[prefix];
          view[key] = new TypedArray(buffer, offset, length);
          // const view =  new TypedArray(buffer, offset, length);;
          // Object.defineProperty(view, key, {
          //   get(): any {
          //     return view;
          //   },
          //   set(v: ArrayLike<number>) {
          //     view.set(v);
          //   },
          // });
        } else {
          const numberValue = value as PrimitiveNumber;
          const get = PrimitiveDataViewGet[numberValue];
          const set = PrimitiveDataViewSet[numberValue];
          Object.defineProperty(view, key, {
            get(): number {
              return dataView[get](offset, true);
            },
            set(v: number) {
              dataView[set](offset, v, true);
            },
          });
        }
      }

      stride = offset + size;
    }
    Object.freeze(view);
    return view as StructView<T>;
  }

  export function structInfo<T extends PlainStruct>(
    plainStruct: T,
    ignoreAlign?: boolean,
  ): PlainStructInfo<T> {
    const info: any = {};
    let stride = 0;
    for (let [key, value] of Object.entries(plainStruct)) {
      const { align, size } = structValueSizeAlign(value);
      const offset = nextAlign(stride, ignoreAlign ? 1 : align);
      info[key] = { offset, size };
      stride = offset + size;
    }
    return info;
  }

  // 更推荐使用 {} satisfies wgsl.Struct
  export function struct<T extends wgsl.Struct>(struct: T) {
    return struct;
  }

  export class StructBuffer<T extends wgsl.Struct> {
    buffer: Uint8Array;
    view: StructView<NoEmptyRecord<T>>;
    constructor(public struct: NoEmptyRecord<T>, ignoreAlign?: boolean) {
      const byteLength = wgsl.structSize(struct, ignoreAlign);
      this.buffer = new Uint8Array(byteLength);
      this.view = wgsl.structView(this.buffer.buffer, struct, 0, ignoreAlign);
    }

    clone() {
      return new StructBuffer(this.struct);
    }
  }

  export function stringifyPrimitive(value: Primitive) {
    let typeStr: string = value;
    if (value.indexOf('_') > -1) {
      typeStr = value.replace('_', '<') + '>';
    }
    return typeStr;
  }

  export function stringifyStruct<T extends wgsl.Struct>(
    name: string,
    struct: NoEmptyRecord<T>,
    structCache = new Map<string, { name: string; structStr: string }>(),
  ) {
    let structStr = `struct ${name} {
${Object.entries(struct)
  .map(([key, value]) => {
    let typeStr: string;
    if (Array.isArray(value)) {
      typeStr = `array<${name}_${key}${value[2] ? '' : `, ${value[1]}`}>`;
      if (!structCache.has(JSON.stringify(value[0]))) {
        stringifyStruct(`${name}_${key}`, value[0], structCache);
      }
    } else if (typeof value === 'object') {
      typeStr = `${name}_${key}`;
      if (!structCache.has(JSON.stringify(value))) {
        stringifyStruct(typeStr, value, structCache);
      }
    } else {
      typeStr = stringifyPrimitive(value);
    }
    return `  ${key}: ${typeStr},`;
  })
  .join('\n')}
};`;
    structCache.set(JSON.stringify(struct), { name, structStr });
    const subStruct = [...structCache.values()]
      .filter(i => i.name !== name)
      .map(i => i.structStr)
      .join('\n');
    return subStruct + '\n' + structStr;
  }
}
