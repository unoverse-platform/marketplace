import React from "react";

const NodeContainer = ({
  children,
  selected,
  currentStatus,
  data,
  isArmed
}) => {
  return (
    <div
      className={`
        relative bg-white rounded-xl transition-all duration-300 ease-out
        ${selected ? "shadow-xl ring-2 ring-blue-500 ring-opacity-20" : "shadow-md hover:shadow-lg"}
        ${
          currentStatus === "running"
            ? "ring-2 ring-offset-2 ring-offset-transparent animate-glow border-2 border-white/50"
            : currentStatus === "success"
            ? "ring-2 ring-green-500 ring-opacity-30 border-2 border-green-500/20"
            : currentStatus === "error"
            ? "ring-2 ring-red-500 ring-opacity-30 border-2 border-red-500/20"
            : isArmed
            ? "ring-2 ring-amber-400 ring-opacity-50 animate-pulse shadow-amber-400/30 cursor-pointer hover:ring-amber-500"
            : "border border-gray-200 hover:border-gray-300"
        }
        min-w-[240px] w-full
      `}
      style={{
        boxSizing: "border-box",
        transformOrigin: "center center",
        ...(data.status === "running" || data.status === "executing"
          ? {
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)",
            }
          : data.status === "armed"
          ? {
              boxShadow: "0 0 15px rgba(245, 158, 11, 0.3), 0 0 25px rgba(245, 158, 11, 0.2)",
            }
          : {}),
      }}
    >
      {children}
    </div>
  );
};

export default NodeContainer;
