/**
 * THE universal design-component executor — ONE PromiseNode for every component.
 *
 * The old pipeline generated this class once per component; the only variance was
 * the prop names, which are DATA (the rx def). This class takes that data in its
 * constructor and reproduces the generated semantics EXACTLY (pinned by the
 * design-component-node guard):
 *   - per-(execution,node) first-render tracking + one log line
 *   - workflow-fed props from config; unresolved STRING inputs pinned to "" on the
 *     first publish only (so the client never falls back to workbench sample defaults
 *     mid-run); later publishes omit unresolved props (client merge keeps streamed values)
 *   - DELTA publishes — only changed props are sent; no-change re-executions publish nothing
 *   - COMPONENT_INIT via publishComponent (unoverse://components/<Name> componentUrl)
 *   - named defaultState → TEMPLATE_DATA emit (open name; template branches on it)
 *   - declared `outputs` → awaitSubmission (user_action resolves), answers projected to
 *     the declared keys only, `submitted: true` merged, defaultState handed back
 *
 * Every future design-component feature is written HERE once, for all components.
 */

import { PromiseNode, type ValidationResult, type NodeExecutionContext } from "@unoverse-platform/base/pluginBase.js";
import { publishComponent } from "./publishComponent.js";
import { awaitSubmission } from "./awaitSubmission.js";
import { componentUri, type RuntimeComponentMeta } from "./meta.js";

export class DesignComponentExecutor extends PromiseNode {
  // Shared across ALL components — keys are per (execution, node), so one map serves
  // the whole family. Soft-capped exactly like the generated statics were.
  private static loggedRenders = new Set<string>();
  private static lastPublished = new Map<string, Record<string, any>>();

  // ONE node serves EVERY component. The set of component metas is baked at registration;
  // `config.component` selects which one a given node renders (resolved per execution).
  private readonly metas: ReadonlyMap<string, RuntimeComponentMeta>;

  constructor(metas: ReadonlyMap<string, RuntimeComponentMeta>) {
    super("Component");
    this.metas = metas;
  }

  protected async validateConfig(_config: any): Promise<ValidationResult> {
    return { success: true };
  }

  protected async executeNode(_inputs: Record<string, any>, config: any, context: NodeExecutionContext): Promise<any> {
    // Which component this node renders — the ONE knob that used to be 18 node types.
    const name = config?.component;
    const meta = typeof name === "string" ? this.metas.get(name) : undefined;
    if (!meta) {
      throw new Error(
        `Component node: set 'component' to one of [${[...this.metas.keys()].join(", ")}] (got: ${JSON.stringify(name)})`,
      );
    }

    // One log + one first-render marker per (execution, node) pair.
    const renderKey = `${context.executionId}:${context.nodeId}`;
    const firstRender = !DesignComponentExecutor.loggedRenders.has(renderKey);
    if (firstRender) {
      if (DesignComponentExecutor.loggedRenders.size > 10000) {
        DesignComponentExecutor.loggedRenders.clear();
        DesignComponentExecutor.lastPublished.clear();
      }
      DesignComponentExecutor.loggedRenders.add(renderKey);
      this.logger.info(`✅ [${meta.name}] ComponentSpec generated for node: ${context.nodeId}`);
    }

    // Workflow-fed props only — the def's declared inputs, nothing else. Include
    // empty strings (streaming text); pin unresolved STRING inputs to "" on the
    // first publish so the client never shows definition preview defaults mid-run.
    const props: Record<string, any> = {};
    for (const { key, isString } of meta.inputProps) {
      if (config?.[key] !== undefined) {
        props[key] = config[key];
      } else if (isString && firstRender) {
        props[key] = "";
      }
    }

    // DELTA publish: only props whose value changed since the last publish.
    const prev = DesignComponentExecutor.lastPublished.get(renderKey);
    const changed: Record<string, any> = {};
    for (const [k, v] of Object.entries(props)) {
      if (!prev || JSON.stringify(prev[k]) !== JSON.stringify(v)) changed[k] = v;
    }
    DesignComponentExecutor.lastPublished.set(renderKey, { ...(prev ?? {}), ...props });

    const componentSpec = {
      type: meta.name,
      version: "1.0.0",
      nodeId: context.nodeId,
      props: changed,
      componentUrl: componentUri(meta),
      ...(meta.nodeSize ? { nodeSize: { width: meta.nodeSize.width, height: meta.nodeSize.height } } : {}),
      metadata: {
        dataSource: "direct",
        nodeId: context.nodeId,
        executionId: context.executionId,
      },
    };

    if (!context.publishingContext) {
      throw new Error("Publishing context not available - cannot publish component");
    }

    // No changed props and not the first render → the client already has this state.
    if (firstRender || Object.keys(changed).length > 0) {
      await publishComponent(
        {
          component: componentSpec,
          chatId: context.publishingContext.chatId,
          conversationId: context.publishingContext.conversationId,
          userId: context.publishingContext.userId,
          providerId: context.publishingContext.providerId,
          workflowId: context.workflowId,
          workflowRunId: context.executionId,
          nodeId: context.nodeId,
          targetTriggerNode: context.publishingContext.targetTriggerNode,
        },
        (context as any).api,
        context,
      );
    }

    // Named default state (open name) — the ACTIVE template renders its own surface for it.
    if (meta.defaultState) {
      this.sendTemplateData(context, { defaultState: meta.defaultState });
    }

    // Interactive components (declared `outputs`): STANDARD promise semantics — wait
    // for the user's submission, project ONLY the declared keys, mark submitted,
    // hand the surface back, and return the answers as the standard `output`.
    if (meta.outputKeys.length) {
      const submitted = await awaitSubmission(`${context.publishingContext.chatId}:${context.nodeId}`);
      const answers: Record<string, any> = {};
      for (const k of meta.outputKeys) if (submitted[k] !== undefined) answers[k] = submitted[k];

      this.sendComponentData(context, { submitted: true });
      if (meta.defaultState) this.sendTemplateData(context, { defaultState: "" });

      return { __outputs: { output: answers } };
    }

    return { __outputs: { componentSpec } };
  }

  private sendTemplateData(context: NodeExecutionContext, data: Record<string, any>): void {
    this.sendEvent(context, "TEMPLATE_DATA", data);
  }

  private sendComponentData(context: NodeExecutionContext, data: Record<string, any>): void {
    this.sendEvent(context, "COMPONENT_DATA", data, { nodeId: context.nodeId });
  }

  private sendEvent(context: NodeExecutionContext, type: string, data: Record<string, any>, extra: Record<string, any> = {}): void {
    (context as any).api
      ?.getWebSocketManager?.()
      ?.get(context.publishingContext.userId, context.publishingContext.conversationId)
      ?.send(
        JSON.stringify({
          type,
          chatId: context.publishingContext.chatId,
          conversationId: context.publishingContext.conversationId,
          userId: context.publishingContext.userId,
          workflowId: context.workflowId,
          workflowRunId: context.executionId,
          data,
          timestamp: new Date().toISOString(),
          ...extra,
        }),
      );
  }
}

/** Class factory — the runtime instantiates the ONE Component executor with a no-arg constructor. */
export function makeUniversalExecutorClass(
  metas: ReadonlyMap<string, RuntimeComponentMeta>,
): new () => DesignComponentExecutor {
  return class extends DesignComponentExecutor {
    constructor() {
      super(metas);
    }
  };
}
