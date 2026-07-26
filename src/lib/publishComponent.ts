/**
 * Component publishing service
 * Publishes UI components to the client via gravity:output channel
 */

import { v4 as uuid } from "uuid";

export const OUTPUT_CHANNEL = "gravity:output";

// A streaming node re-publishes once per chunk, so unguarded per-publish logs
// flood the console (hundreds of identical lines per response). Log the FIRST
// publish per (run, node) only. Soft-capped so it can't grow unbounded in a
// long-lived process.
const loggedPublishes = new Set<string>();

export function buildComponentEvent(config: {
  chatId: string;
  conversationId: string;
  userId: string;
  providerId?: string;
  component: Record<string, any>;
  metadata?: Record<string, any>;
}): Record<string, any> {
  if (!config.chatId || !config.conversationId || !config.userId) {
    throw new Error("chatId, conversationId, and userId are required");
  }

  return {
    id: uuid(),
    timestamp: new Date().toISOString(),
    providerId: config.providerId || "marketplace",
    chatId: config.chatId,
    conversationId: config.conversationId,
    userId: config.userId,
    __typename: "GravityEvent",
    type: "GRAVITY_EVENT",
    eventType: "component",
    data: {
      component: config.component,
      metadata: config.metadata || {},
    },
  };
}

export interface ComponentPublishConfig {
  component: any;
  chatId: string;
  conversationId: string;
  userId: string;
  providerId: string;
  workflowId: string;
  workflowRunId: string;
  nodeId: string;
  targetTriggerNode?: string; // Which trigger handles this component (for Focus Mode)
  metadata?: Record<string, any>;
  isUpdate?: boolean; // True for delta updates, false/undefined for initial render
  changedProps?: Record<string, any>; // Only the props that changed
}

export async function publishComponent(
  config: ComponentPublishConfig,
  api: any,
  context?: any
): Promise<{ channel: string; success: boolean; }> {
  const logger = api?.createLogger?.("ComponentPublisher") || console;

  try {
    // Get WebSocket manager
    const wsManager = api?.getWebSocketManager?.();
    const websocket = wsManager?.get(config.userId, config.conversationId);

    // Always send COMPONENT_INIT - client handles deduplication
    // Client will: 1) Update Zustand state, 2) Add to history if not exists
    const componentKey = `${config.chatId}_${config.nodeId}`;
    const props = config.component.props || {};

    const publishKey = `${config.workflowRunId}:${config.nodeId}`;
    const firstPublish = !loggedPublishes.has(publishKey);
    if (firstPublish) {
      if (loggedPublishes.size > 10000) loggedPublishes.clear();
      loggedPublishes.add(publishKey);
      logger.debug("🚀 Component INIT", {
        nodeId: config.nodeId,
        componentType: config.component.type,
        componentKey,
        props: Object.keys(props),
      });
    }

    const event = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      type: "COMPONENT_INIT",
      nodeId: config.nodeId,
      chatId: config.chatId,
      conversationId: config.conversationId,
      userId: config.userId,
      providerId: config.providerId,
      component: {
        type: config.component.type,
        componentUrl: config.component.componentUrl,
        version: config.component.version,
        ...(config.component.nodeSize && { nodeSize: config.component.nodeSize }),
        props,
      },
      metadata: {
        ...config.metadata,
        workflowId: config.workflowId,
        workflowRunId: config.workflowRunId,
        componentKey,
        targetTriggerNode: config.targetTriggerNode,
      },
    };

    // Check if we have a valid WebSocket connection
    if (!wsManager) {
      logger.warn("WebSocket manager not available", {
        componentType: config.component.type,
      });
      return { channel: "websocket", success: false };
    }

    if (!websocket) {
      logger.warn("WebSocket connection not found - component not sent", {
        userId: config.userId,
        conversationId: config.conversationId,
        componentType: config.component.type,
      });
      return { channel: "websocket", success: false };
    }

    // Send to WebSocket
    websocket.send(JSON.stringify(event));

    if (firstPublish) {
      logger.debug("✅ Message sent", {
        type: event.type,
        nodeId: config.nodeId,
      });
    }

    return { channel: "websocket", success: true };
  } catch (error: any) {
    logger.error("Failed to publish UI component", {
      error: error.message,
      workflowId: config.workflowId,
      nodeId: config.nodeId,
    });
    throw error;
  }
}
