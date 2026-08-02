import React, { useEffect } from "react";
import { Play, Zap, FastForward, Loader2 } from "lucide-react";

const NodeStatus = ({
  currentStatus,
  statusInfo,
  nodeType,
  type,
  isNodeRunning,
  isCompleted,
  isArmed,
  isRunning,
  data,
  executionId,
  stepWorkflow,
  runWorkflow,
  runToNode,
  id,
  urlWorkflowId,
  setIsRunning,
}) => {
  const hasMCPBadge = nodeType?.serviceConnectors?.some((c) => c.serviceType === "mcp");

  // Clear the optimistic isRunning flag once the server reports a settled
  // status. Keyed off the real server status (data.status), not the optimistic
  // currentStatus, so it still clears when the node settles into "armed".
  useEffect(() => {
    const serverStatus = data?.status;
    if (serverStatus === "success" || serverStatus === "error" || serverStatus === "armed") {
      setIsRunning(false);
    }
  }, [data?.status, setIsRunning]);

  return (
    <div className="flex items-center justify-between relative">
      {/* Status with icon */}
      <div className="flex items-center gap-2.5">
        {/* Elegant status indicator */}
        <div className="relative w-6 h-6 flex items-center justify-center">
          {/* Single subtle pulse for running */}
          {statusInfo?.pulse && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-5 h-5 rounded-full ${statusInfo.color} opacity-20 animate-pulse`} />
            </div>
          )}

          {/* Main status dot - smaller and more refined */}
          <div
            className={`
            relative w-3.5 h-3.5 rounded-full flex items-center justify-center
            ${statusInfo.color}
            shadow-sm
            transition-all duration-500 ease-out
            ${currentStatus === "success" ? "scale-110" : ""}
          `}
          >
            {statusInfo.animation === "animate-spin" ? (
              <Loader2 className="w-2.5 h-2.5 text-white animate-spin" strokeWidth={3} />
            ) : (
              <span className="text-white text-[9px] font-medium leading-none">{statusInfo.icon}</span>
            )}

            {/* Very subtle inner light */}
            <div className="absolute inset-0 rounded-full bg-white opacity-10" />
          </div>

          {/* Subtle success checkmark animation */}
          {currentStatus === "success" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border border-green-300 opacity-0 animate-[ping_1s_ease-out_1]" />
            </div>
          )}
        </div>

        <span
          className={`
          text-sm font-medium
          ${currentStatus === "executing" || currentStatus === "running" ? "text-blue-600" : ""}
          ${currentStatus === "success" ? "text-green-600" : ""}
          ${currentStatus === "error" ? "text-red-600" : ""}
          ${currentStatus === "armed" ? "text-amber-600" : ""}
          ${currentStatus === "focused" ? "text-purple-600" : ""}
          ${!currentStatus || currentStatus === "ready" ? "text-gray-500" : ""}
          transition-colors duration-300
        `}
        >
          {currentStatus ? currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1) : "Ready"}
        </span>
      </div>

      {/* Debug control buttons - Step, Run - Hidden when node is executing */}
      {!isNodeRunning && (
        <div className={`flex items-center gap-2 ${hasMCPBadge ? "mr-10" : ""}`}>
          <>
            {/* Step button - Always show on trigger nodes (can re-run), OR show on armed nodes */}
            {(type === "InputTrigger" || type === "InputAction" || type === "WebhookTrigger" || isArmed) && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!urlWorkflowId || isRunning) return;

                  setIsRunning(true);
                  try {
                    await stepWorkflow(id);
                    // Keep isRunning true until the server reports success/error
                    // (cleared by the useEffect above) so the running visual shows
                    // immediately and doesn't flicker back to "ready".
                  } catch (error) {
                    console.error(`[CustomNode] Failed to step node:`, error);
                    setIsRunning(false);
                  }
                }}
                className="p-2 rounded-md transition-all duration-200 transform bg-amber-100 text-amber-600 hover:bg-amber-200 hover:text-amber-700 ring-1 ring-amber-300 hover:scale-105 active:scale-95"
                title="Step (execute node)"
              >
                <Play className="w-3 h-3" fill="currentColor" />
              </button>
            )}

            {/* Run button - Auto-execute entire workflow (only for trigger nodes) */}
            {runWorkflow && (type === "InputTrigger" || type === "InputAction" || type === "WebhookTrigger") && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!urlWorkflowId || isRunning) return;

                  setIsRunning(true);
                  try {
                    await runWorkflow(id);
                    // Keep isRunning until success/error arrives (see Step handler).
                  } catch (error) {
                    console.error(`[CustomNode] Failed to run workflow:`, error);
                    setIsRunning(false);
                  }
                }}
                className="p-2 rounded-md transition-all duration-200 transform bg-purple-100 text-purple-600 hover:bg-purple-200 hover:text-purple-700 hover:scale-105 active:scale-95"
                title="Run (auto-execute full workflow)"
              >
                <Zap className="w-3 h-3" fill="currentColor" />
              </button>
            )}

            {/* Run to Node button - Execute from current state up to this node (only when execution is paused with armed nodes) */}
            {runToNode &&
              executionId &&
              type !== "InputTrigger" &&
              type !== "InputAction" &&
              type !== "WebhookTrigger" && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!urlWorkflowId || isRunning) return;

                    // Do NOT set this node optimistically to "running": "Run to
                    // Node" executes the upstream armed nodes and PAUSES at this
                    // node — the target itself doesn't run, it becomes the armed
                    // boundary. The nodes that actually execute show their own
                    // running state from server events.
                    try {
                      await runToNode(id);
                    } catch (error) {
                      console.error(`[CustomNode] Failed to run to node:`, error);
                    }
                  }}
                  className="p-2 rounded-md transition-all duration-200 transform bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 hover:scale-105 active:scale-95"
                  title="Run to Node (execute up to this node and pause)"
                >
                  <FastForward className="w-3 h-3" />
                </button>
              )}
          </>
        </div>
      )}

      {/* MCP badge - aligned with status text */}
      {nodeType?.serviceConnectors?.some((c) => c.serviceType === "mcp") && (
        <div className="absolute right-0 w-6 h-6 bg-white flex items-center justify-center">
          <img
            src="https://res.cloudinary.com/sonik/image/upload/v1758366469/gravity/icons/mcp.png"
            alt="MCP"
            className="w-9 h-9 object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default NodeStatus;
