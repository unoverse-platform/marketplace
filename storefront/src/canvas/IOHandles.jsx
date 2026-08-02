import React from "react";
import { Handle, Position } from "@xyflow/react";
import { getInputHandleStyle, getOutputHandleStyle, HANDLE_STYLES } from "./HandleStyles";

const IOHandles = ({ inputs, outputs, color }) => {
  return (
    <>
      {/* Input Handles with better positioning */}
      {inputs.map((input, index) => {
        const totalInputs = inputs.length;
        const spacing = totalInputs > 1 ? 60 / (totalInputs - 1) : 0;
        const offset = totalInputs === 1 ? 50 : 20 + index * spacing;

        return (
          <div key={`input-${input.id || input.name || index}`} className="group">
            <Handle
              type="target"
              position={Position.Left}
              id={input.name || input.id || `input-${index}`}
              style={getInputHandleStyle(color, offset)}
              className="hover:!shadow-lg cursor-pointer custom-handle-left"
              onMouseEnter={HANDLE_STYLES.hover.onMouseEnter}
              onMouseLeave={HANDLE_STYLES.hover.onMouseLeave}
            />
            {/* Enhanced tooltip */}
            <div
              className="absolute left-2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg"
              style={{
                top: `${offset}%`,
                transform: "translateY(-50%)",
              }}
            >
              <div className="font-semibold">{input.name || input.label || input.id}</div>
              {input.description && <div className="text-gray-400 text-[10px] mt-0.5">{input.description}</div>}
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </div>
        );
      })}

      {/* Output Handles with better positioning */}
      {outputs.map((output, index) => {
        const totalOutputs = outputs.length;
        const spacing = totalOutputs > 1 ? 60 / (totalOutputs - 1) : 0;
        const offset = totalOutputs === 1 ? 50 : 20 + index * spacing;

        return (
          <div key={`output-${output.id || output.name || index}`} className="group">
            <Handle
              type="source"
              position={Position.Right}
              id={output.name || output.id || `output-${index}`}
              style={getOutputHandleStyle(color, offset)}
              className="hover:!shadow-lg cursor-pointer custom-handle-right"
              onMouseEnter={HANDLE_STYLES.hover.onMouseEnter}
              onMouseLeave={HANDLE_STYLES.hover.onMouseLeave}
            />
            {/* Enhanced tooltip */}
            <div
              className="absolute right-2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg"
              style={{
                top: `${offset}%`,
                transform: "translateY(-50%)",
              }}
            >
              <div className="font-semibold">{output.name || output.label || output.id}</div>
              {output.description && <div className="text-gray-400 text-[10px] mt-0.5">{output.description}</div>}
              <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </div>
        );
      })}
    </>
  );
};

export default IOHandles;
