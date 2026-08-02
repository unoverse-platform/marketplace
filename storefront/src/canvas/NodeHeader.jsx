import React from "react";

const NodeHeader = ({ logoUrl, name, type, data, color, currentStatus, nodeType }) => {
  const isRunning = currentStatus === "running" || currentStatus === "executing";

  return (
    <div
      className={`relative px-4 py-[13px] rounded-t-xl overflow-hidden transition-all duration-300 ${
        isRunning ? "node-running" : ""
      }`}
      style={{
        background: `linear-gradient(135deg, ${color} 100%, ${color}dd 100%)`,
        // Liquid-wave gradient derived from the node's own color (cf. HarnessNode)
        "--node-wave-gradient": `linear-gradient(744deg, color-mix(in srgb, ${color}, white 42%), ${color} 55%, color-mix(in srgb, ${color}, black 22%))`,
      }}
    >
      {/* Liquid waves — revealed only while running, tinted by the node color */}
      {isRunning && (
        <>
          <div className="node-wave" />
          <div className="node-wave" />
          <div className="node-wave" />
        </>
      )}

      {/* Logo and text content */}
      <div className="relative flex items-center gap-3">
        {/* Logo if provided */}
        {logoUrl && (
          <div className="flex-shrink-0 relative">
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="w-10 h-10 object-contain bg-white/20 rounded-md p-1"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        )}

        {/* MCP logo for nodes without existing logo */}
        {!logoUrl && nodeType?.serviceConnectors?.some((c) => c.serviceType === "mcp") && (
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-white/20 rounded-md p-2 flex items-center justify-center">
              <img
                src="https://res.cloudinary.com/sonik/image/upload/v1758366469/gravity/icons/mcp.png"
                alt="MCP"
                className="w-6 h-6 object-contain"
              />
            </div>
          </div>
        )}

        {/* Node name with type below */}
        <div className="flex-1 overflow-hidden">
          <h3 className="text-white font-semibold text-base truncate">{data.label || name}</h3>
          <p className="text-white text-opacity-70 text-xs truncate">{type}</p>
        </div>
      </div>
    </div>
  );
};

export default NodeHeader;
