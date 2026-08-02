import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Plug2 } from "lucide-react";
import { useNodeType } from "./NodeTypesContext";
import { getInputHandleStyle, getOutputHandleStyle } from "./HandleStyles";
import ServiceHandles from "./ServiceHandles";

const ServiceNode = memo(({ id, data, selected, type }) => {
  // Get node type definition from context
  const nodeType = useNodeType(type);

  // Use node type data - no fallbacks to prevent using stale data
  const inputs = nodeType?.inputs || [];
  const outputs = nodeType?.outputs || [];
  const color = nodeType?.color || "#6366f1";
  const logoUrl = nodeType?.logoUrl;
  const name = nodeType?.name || "Service";

  const hasInputs = inputs.length > 0;
  const hasOutputs = outputs.length > 0;
  const serviceType = nodeType?.serviceConnectors?.[0]?.serviceType;

  return (
    <div
      className={`
        relative rounded-2xl transition-all duration-300 ease-out overflow-visible
        ${selected ? "ring-2 ring-blue-500/40 ring-offset-2 ring-offset-transparent" : ""}
      `}
      style={{
        minWidth: "250px",
        transform: selected ? "scale(1.02)" : "scale(1)",
        transformOrigin: "center center",
      }}
    >
      {/* Input handles on left */}
      {hasInputs &&
        inputs.map((input, index) => (
          <div key={input.name} className="group">
            <Handle
              type="target"
              position={Position.Left}
              id={input.name}
              style={getInputHandleStyle(color, 50 + (index - (inputs.length - 1) / 2) * 25)}
              className="transition-all duration-200 custom-handle-left"
            />
            {/* Input tooltip */}
            <div
              className="absolute left-2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md
              opacity-0 group-hover:opacity-100 transition-all duration-200
              pointer-events-none whitespace-nowrap z-50
              shadow-lg"
              style={{
                top: `${50 + (index - (inputs.length - 1) / 2) * 25}%`,
                transform: "translateY(-50%)",
              }}
            >
              <div className="font-semibold">{input.name || input.label || input.id}</div>
              {input.description && <div className="text-gray-400 text-[10px] mt-0.5">{input.description}</div>}
              <div
                className="absolute -left-1 top-1/2 -translate-y-1/2 
                w-2 h-2 bg-gray-900 rotate-45"
              />
            </div>
          </div>
        ))}

      {/* Compact header */}
      <div
        className="px-3 py-2.5 rounded-2xl flex items-center gap-3 relative z-10"
        style={{
          backgroundColor: color,
          // Soft top-light / bottom-shade for depth on any base color
          backgroundImage:
            "linear-gradient(160deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,0.12) 100%)",
          boxShadow: selected
            ? `0 10px 28px -8px ${color}aa, inset 0 1px 0 rgba(255,255,255,0.22)`
            : `0 6px 18px -8px ${color}99, inset 0 1px 0 rgba(255,255,255,0.18)`,
        }}
      >
        {/* Logo tile — translucent backing, matching the standard node header */}
        <div className="shrink-0 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="w-6 h-6 object-contain" />
          ) : (
            <Plug2 className="w-4 h-4 text-white" />
          )}
        </div>

        <h3 className="font-semibold text-white text-[15px] leading-tight flex-1 min-w-0 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
          {data.label || name}
        </h3>

        {/* Service-type pill */}
        <div className="shrink-0 flex items-center gap-1 bg-white/20 rounded-full pl-1.5 pr-2 py-1 backdrop-blur-sm">
          <Plug2 className="w-3 h-3 text-white" />
          {serviceType && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/90">
              {serviceType}
            </span>
          )}
        </div>
      </div>

      {/* Output handles on right */}
      {hasOutputs &&
        outputs.map((output, index) => (
          <div key={output.name} className="group">
            <Handle
              type="source"
              position={Position.Right}
              id={output.name}
              style={getOutputHandleStyle(color, 50 + (index - (outputs.length - 1) / 2) * 25)}
              className="transition-all duration-200 custom-handle-right"
            />
            {/* Output tooltip */}
            <div
              className="absolute right-2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md
              opacity-0 group-hover:opacity-100 transition-all duration-200
              pointer-events-none whitespace-nowrap z-50
              shadow-lg"
              style={{
                top: `${50 + (index - (outputs.length - 1) / 2) * 25}%`,
                transform: "translateY(-50%)",
              }}
            >
              <div className="font-semibold">{output.name || output.label || output.id}</div>
              {output.description && <div className="text-gray-400 text-[10px] mt-0.5">{output.description}</div>}
              <div
                className="absolute -right-1 top-1/2 -translate-y-1/2 
                w-2 h-2 bg-gray-900 rotate-45"
              />
            </div>
          </div>
        ))}

      {/* Service handles — reuse the exact same component the standard node uses */}
      <ServiceHandles nodeType={nodeType} color={color} />
    </div>
  );
});

ServiceNode.displayName = "ServiceNode";

export default ServiceNode;
