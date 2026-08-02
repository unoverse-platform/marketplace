import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Plug2 } from "lucide-react";
import { getServiceConsumerStyle, getServiceProviderStyle } from "./HandleStyles";

const ServiceConsumerHandle = ({ nodeType, color }) => {
  const hasConsumer = nodeType?.serviceConnectors?.some(
    (connector) => connector.isService === false || connector.isService === undefined
  );

  if (!hasConsumer) {
    return null;
  }

  return (
    <div key="service-consumer-handle" className="absolute -top-0 left-0 right-0 flex justify-center">
      <div className="relative group">
        <Handle
          type="target"
          position={Position.Top}
          id="serviceConsumer"
          style={getServiceConsumerStyle(color)}
          className="transition-all duration-200"
        />
        {/* Service tooltip */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
          <div className="flex items-center gap-1">
            <Plug2 className="w-3 h-3" />
            <span>
              {nodeType.serviceConnectors[0]?.serviceType === "mcp"
                ? "Consumes MCP"
                : nodeType.serviceConnectors[0]?.serviceType === "service"
                ? "Consumes Services"
                : nodeType.serviceConnectors[0]?.serviceType || "services"}
            </span>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      </div>
    </div>
  );
};

const ServiceProviderHandle = ({ nodeType, color }) => {
  const hasProvider = nodeType?.serviceConnectors?.some((connector) => connector.isService === true);

  if (!hasProvider) {
    return null;
  }

  return (
    <div key="service-provider-handle" className="absolute -bottom-0 left-0 right-0 flex justify-center">
      <div className="relative group">
        <Handle type="source" position={Position.Bottom} id="service" style={getServiceProviderStyle(color)} />
        {/* Service connector tooltip */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap flex items-center gap-1">
            <Plug2 className="w-3 h-3" />
            <span>
              {nodeType.serviceConnectors.some((c) => c.serviceType === "mcp") ? "MCP Services" : "Schema Services"}
            </span>
          </div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      </div>
    </div>
  );
};

const ServiceHandles = ({ nodeType, color }) => {
  return (
    <>
      <ServiceConsumerHandle nodeType={nodeType} color={color} />
      <ServiceProviderHandle nodeType={nodeType} color={color} />
    </>
  );
};

export default ServiceHandles;
