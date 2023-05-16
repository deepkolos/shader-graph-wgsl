import { Plugin } from '../rete/core/plugin';
import { Sockets } from '../sockets';
import {
  Rete,
  ValueComponentMap,
  ValueComponentReverseMap,
  ValueType,
  ValueTypeCtor,
  VectorTypes,
} from '../types';

const getConnectedDynamicInputs = (inputNode: Rete.Node) => {
  return [...inputNode.inputs.values()].filter(io => io.socket === Sockets.dynamicVector);
};

const getDynamicIOConnections = (node: Rete.Node) => {
  return getConnectedDynamicInputs(node).reduce((arr, io) => {
    return [...arr, ...io.connections];
  }, [] as Rete.Connection[]);
};

const getInputCurrentComLen = (inputNode: Rete.Node): [number, number] => {
  return getConnectedDynamicInputs(inputNode).reduce<[number, number]>(
    (acc, curr): [number, number] => {
      const len = ValueComponentMap[curr.node!.getValueType(curr.key)] || 0;
      acc[0] = Math.max(acc[0], len);
      acc[1] = Math.min(acc[1], len);
      return acc as [number, number];
    },
    [0, 4] as [number, number],
  );
};

const getInputConnectedComLen = (inputNode: Rete.Node, dynamicOnly = false): [number, number] => {
  return getConnectedDynamicInputs(inputNode).reduce<[number, number]>(
    (acc, curr) => {
      const connectedOutput = curr.connections[0]?.output;
      if (connectedOutput || !dynamicOnly) {
        const len = connectedOutput?.node
          ? ValueComponentMap[connectedOutput.node!.getValueType(connectedOutput.key)] || 0
          : 0;
        acc[0] = Math.max(acc[0], len);
        acc[1] = Math.min(acc[1], len);
      }
      return acc as [number, number];
    },
    [0, 4] as [number, number],
  );
};

export const DynamicVectorPlugin: Plugin = {
  name: 'DynamicVectorPlugin',
  install(editor: Rete.NodeEditor) {
    // 当链接断开时, 更新port类型
    editor.on('connectionremoved', connection => {
      if (editor.silent) return;
      const node = connection.input.node!;
      const [maxInputValueComLen, minInputValueComLen] = getInputConnectedComLen(node, true);
      const ios = [...node.inputs.values(), ...node.outputs.values()].filter(
        io => io.socket === Sockets.dynamicVector,
      );
      const dynamicInputConnections = getDynamicIOConnections(node);
      if (!dynamicInputConnections.length || maxInputValueComLen === 1) {
        ios.forEach(io => {
          if (node!.getValueType(io.key) !== ValueType.float) {
            node!.setValueType(io.key, ValueType.float);
            node!.setValue(io.key, ValueTypeCtor[ValueType.float]?.());
          }
        });
      } else if (minInputValueComLen > 0) {
        const outputValueType = ValueComponentReverseMap[minInputValueComLen];
        ios.forEach(io => {
          if (node!.getValueType(io.key) !== outputValueType) {
            node!.setValueType(io.key, outputValueType);
            // @ts-ignore
            node!.setValue(io.key, ValueTypeCtor[outputValueType]?.());
          }
        });
      }

      ios.forEach(io => {
        io.connections.forEach(i => i.view?.update(true));
      });
      node.update();
    });

    // 当链接创建, 更新port类型
    editor.on('connectioncreate', ({ input, output }): boolean => {
      if (editor.silent || input.socket !== Sockets.dynamicVector) return true;

      const inputNode = input.node!;
      const inputValueType = input.node!.getValueType(input.key);
      const outputValueType = output.node!.getValueType(output.key);
      if (inputValueType === outputValueType) {
        return true;
      }

      const inputs = [...inputNode.inputs.values()].filter(
        io => io.socket === Sockets.dynamicVector,
      );
      const [maxInputValueComLen, minInputValueComLen] = getInputCurrentComLen(inputNode);
      const outputValueComLen = ValueComponentMap[outputValueType] || 0;

      if (
        !getDynamicIOConnections(inputNode).length ||
        (maxInputValueComLen === 1 && outputValueComLen > 1) ||
        (outputValueComLen < minInputValueComLen && outputValueComLen > 1)
      ) {
        const ios = [...inputs, ...inputNode.outputs.values()].filter(
          io => io.socket === Sockets.dynamicVector,
        );
        ios.forEach(io => {
          // @ts-ignore
          inputNode.setValue(io.key, ValueTypeCtor[outputValueType]?.());
          inputNode.setValueType(io.key, outputValueType);
        });
        ios.forEach(io => {
          io.connections.forEach(i => i.view?.update(true));
        });
        return true;
      }

      if (VectorTypes.includes(outputValueType as any)) {
        return true;
      }

      return false;
    });
  },
};
