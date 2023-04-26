import { ReteMultiplyNode } from '../components';
import { Plugin } from '../rete/core/plugin';
import { Sockets } from '../sockets';
import {
  isMatrixType,
  isVectorType,
  MatrixValueType,
  MatrixVectorMap,
  Rete,
  ValueComponentMap,
  ValueComponentReverseMap,
  ValueType,
  ValueTypeCtor,
} from '../types';

const getInputSrcValueType = (node: ReteMultiplyNode, key: string) => {
  const con = node.inputs.get(key)!.connections[0];
  if (con) return con.output.node!.getValueType(con.output.key) as ValueType;
};

const setToValueType = (node: ReteMultiplyNode, key: string, type: ValueType) => {
  if (node.getValueType(key) !== type) {
    node.setValueType(key, type);
    // @ts-ignore
    node.setValue(key, ValueTypeCtor[type]?.());
  }
};

// 专门对乘法的支持
export const DynamicVecMatPlugin: Plugin = {
  name: 'DynamicVecMatPlugin',
  install(editor: Rete.NodeEditor) {
    const onConnectionChange = (node: ReteMultiplyNode, oneKey: string, oneType?: ValueType) => {
      const oneVec = isVectorType(oneType);
      const oneMat = isMatrixType(oneType);
      const otherType = getInputSrcValueType(node, oneKey === 'a' ? 'b' : 'a');
      const otherVec = isVectorType(otherType);
      const otherMat = isMatrixType(otherType);

      let vec_mul_vec = false;
      let mat_mul_vec = false;
      let mat_mul_mat = false;
      if (!oneType && !otherType) {
        vec_mul_vec = true;
      } else if (oneType && !otherType) {
        vec_mul_vec = oneVec;
        mat_mul_vec = oneMat;
      } else if (!oneType && otherType) {
        vec_mul_vec = otherVec;
        mat_mul_vec = otherMat;
      } else if (oneType && otherType) {
        vec_mul_vec = oneVec && otherVec;
        mat_mul_vec = (oneMat && otherVec) || (oneVec && otherMat);
        mat_mul_mat = oneMat && otherMat;
      }

      const ios = [...node.inputs.values(), ...node.outputs.values()];
      if (vec_mul_vec) {
        const types = [oneType, otherType].filter(Boolean) as ValueType[];
        let minComLen = types.reduce((acc, curr) => Math.min(acc, ValueComponentMap[curr]), 5);
        if (minComLen === 5) minComLen = 1;
        if (minComLen === 1)
          minComLen =
            ValueComponentMap[
              (oneType === ValueType.float ? otherType : oneType) || ValueType.float
            ];
        const outputValueType = ValueComponentReverseMap[minComLen];
        ios.forEach(io => setToValueType(node, io.key, outputValueType));
      }

      if (mat_mul_vec) {
        const matType = (oneMat ? oneType : otherType!) as MatrixValueType;
        const vecType = MatrixVectorMap[matType];
        if ((oneKey === 'a' && oneMat) || (oneKey == 'b' && otherMat)) {
          setToValueType(node, 'a', matType);
          setToValueType(node, 'b', vecType);
        } else {
          setToValueType(node, 'b', matType);
          setToValueType(node, 'a', vecType);
        }
        setToValueType(node, 'out', vecType);
      }

      if (mat_mul_mat) {
        const minComLen = [oneType, otherType!]
          .map(i => parseInt(i!.replace('mat', ''), 10))
          .reduce((acc, curr) => Math.min(acc, curr), 3);
        const outputValueType = `mat${minComLen}` as MatrixValueType;
        ios.forEach(io => setToValueType(node, io.key, outputValueType));
      }

      ios.forEach(io => {
        io.connections.forEach(i => i.view?.update(true));
      });
    };

    // 当链接断开时, 更新port类型
    editor.on('connectionremoved', ({ input }) => {
      if (input.socket !== Sockets.dynamicVecMat) return;
      onConnectionChange(input.node as ReteMultiplyNode, input.key, undefined);
    });

    // 当链接创建时, 更新port类型
    editor.on('connectioncreate', ({ input, output }) => {
      if (input.socket !== Sockets.dynamicVecMat) return true;

      const node = input.node as ReteMultiplyNode;
      const oneType = output.node!.getValueType(output.key) as ValueType;
      const oneVec = isVectorType(oneType);
      const oneMat = isMatrixType(oneType);
      if (!oneVec && !oneMat) return false;

      onConnectionChange(node, input.key, oneType);
      return true;
    });
  },
};
