import React, { createContext, useContext, useMemo } from 'react';

const NodeTypesContext = createContext();

export const NodeTypesProvider = ({ children, nodeTypes }) => {
  return (
    <NodeTypesContext.Provider value={nodeTypes}>
      {children}
    </NodeTypesContext.Provider>
  );
};

export const useNodeTypes = () => {
  const context = useContext(NodeTypesContext);
  if (!context) {
    throw new Error('useNodeTypes must be used within a NodeTypesProvider');
  }
  return context;
};

export const useNodeType = (nodeTypeId) => {
  const nodeTypes = useNodeTypes();
  return useMemo(() => nodeTypes.find(nt => nt.id === nodeTypeId), [nodeTypes, nodeTypeId]);
};
