/**
 * Recipe preview — the "mural".
 *
 * A read-only canvas you can pan and zoom around, showing the actual graph: which
 * nodes, how they connect, and what each one is configured to do (prompts included).
 * Editing is off; this is for reading a workflow before you take a copy of it.
 *
 * The graph is the SAME payload the canvas clipboard uses
 * (`{ type: "gravity-workflow", version, nodes, edges }`), so a recipe is simply
 * something someone copied from a canvas. Nothing new to author or convert.
 *
 * HOW A NODE IS DRAWN. Exactly as WorkflowCanvas decides it: the node's CATALOG
 * ENTRY carries a `template`, and that picks the renderer — `service`/`mini` is a
 * service or MCP node, `uiComponent`/`printComponent` is a design system component
 * that renders itself, `Note` is a note, everything else is a step. Reading the
 * graph alone cannot tell you this; only the catalog knows. So the mural is wrapped
 * in the canvas's own NodeTypesProvider and reuses the canvas's own components,
 * which is also what gives every node its real handles, colour and logo.
 *
 * What is NOT reused is the run machinery — status rings, Step/Run controls, live
 * streamed data, the debug session. Nothing here executes, so those renderers
 * (CustomNode, UIComponentNode) are represented by the read-only halves below.
 *
 * NB "recipe", not "template": `template` is already taken by the rx app templates
 * in Studio's Apps section (server RegistryKind "template"), which are a different
 * thing entirely.
 */
import { useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, BackgroundVariant, Controls, type Node, type Edge } from "@xyflow/react";
// React Flow needs its own stylesheet to position anything. The canvas components
// import it too; Studio routes never load those, so without this the mural renders
// as a pile of unpositioned boxes.
import "@xyflow/react/dist/style.css";
import { Lock, Unlock } from "lucide-react";
// The canvas's own nodes and node chrome.
import NoteNode from "./canvas/NoteNode";
import ServiceNode from "./canvas/ServiceNode";
import NodeContainer from "./canvas/NodeContainer";
import NodeHeader from "./canvas/NodeHeader";
import NodeStatus from "./canvas/NodeStatus";
import IOHandles from "./canvas/IOHandles";
import ServiceHandles from "./canvas/ServiceHandles";
import { NodeTypesProvider, useNodeType } from "./canvas/NodeTypesContext";
import OrthogonalEdge from "./canvas/OrthogonalEdge";
import { DEFAULT_EDGE_OPTIONS } from "./canvas/edgeStyles";
import type { CatalogNode } from "./host";

// The canvas's edge map, verbatim (WorkflowCanvas): every known type routes through
// OrthogonalEdge, so an edge that kept a legacy `type` still draws.
const edgeTypes = {
  orthogonal: OrthogonalEdge,
  smoothstep: OrthogonalEdge,
  default: OrthogonalEdge,
  service: OrthogonalEdge,
};

export interface WorkflowClip {
  type: "gravity-workflow";
  version?: number;
  nodes: any[];
  edges: any[];
}

/** Accepts clipboard text; returns the graph only if it really is one. */
export function parseWorkflowClip(text: string): WorkflowClip | null {
  try {
    const d = JSON.parse(text);
    if (d?.type !== "gravity-workflow" || !Array.isArray(d.nodes)) return null;
    return { type: "gravity-workflow", version: d.version, nodes: d.nodes, edges: Array.isArray(d.edges) ? d.edges : [] };
  } catch {
    return null;
  }
}

// COMPONENT PREVIEWS NEED A UNIVERSE. The SDK renders a component by fetching its
// definition from the server that serves it, and a public storefront has no server to
// ask. The node itself still draws with its proper chrome; only the live preview inside
// it is absent, which is honest rather than a broken fetch.
const isUnoverse = (_url: string | null) => false;

/** CustomNode's "ready" statusInfo. Nothing here runs, so it is the only one. */
const READY = { color: "bg-gray-400", pulse: false, icon: "", gradient: "from-gray-300 to-gray-500" };
const NOOP = () => {};

/**
 * A step node: CustomNode, minus the ability to run.
 *
 * Same container, service handles, header, status row and I/O handles, in that
 * order, fed the same way. What is dropped is the debug wiring behind the status
 * row (useWorkflowDebug, useTestSession, useWorkflowControl) — nothing here
 * executes. NodeStatus gates every run control on a callback or on `type`, so
 * passing neither leaves the status row and the MCP badge and no dead buttons.
 */
function StepNode({ data, type }: any) {
  const nodeType: any = useNodeType(type);
  const color = nodeType?.color || "#3b82f6";

  return (
    <NodeContainer selected={data.selected} currentStatus="ready" data={data} isArmed={false}>
      <ServiceHandles nodeType={nodeType} color={color} />
      <NodeHeader
        logoUrl={nodeType?.logoUrl}
        name={nodeType?.name || "Node"}
        type={type}
        data={data}
        color={color}
        currentStatus="ready"
        nodeType={nodeType}
      />
      <div className="p-4 space-y-3 bg-white rounded-b-xl">
        <NodeStatus
          currentStatus="ready"
          statusInfo={READY}
          nodeType={nodeType}
          isNodeRunning={false}
          isCompleted={false}
          isArmed={false}
          isRunning={false}
          data={data}
          executionId={null}
          setIsRunning={NOOP}
        />
      </div>
      <IOHandles inputs={nodeType?.inputs || []} outputs={nodeType?.outputs || []} color={color} />
    </NodeContainer>
  );
}

/**
 * A design system component node (StreamingText and friends): UIComponentNode with
 * the live half removed.
 *
 * The component renders itself through the SDK, from a DETERMINISTIC URI derived
 * from `config.component` (UNOVERSE_MCP_TEMPLATE_PROTOCOL §4a), with the node type's
 * `componentUrls` map winning when it carries one. Props are the schema defaults
 * overlaid with the node's own STATIC config: template-bound fields
 * (`return signal.*`, `{{…}}`) cannot resolve without a run, so they fall back to
 * the default, which is exactly what the canvas shows on an unexecuted node.
 *
 * Dropped from UIComponentNode: the streamed store, the local interaction store and
 * the action dispatcher. A recipe is read, not driven, so actions are no-ops.
 */
function ComponentNode({ data, type }: any) {
  const nodeType: any = useNodeType(type);
  const color = nodeType?.color || "#10b981";
  const config = data.config ?? {};

  const componentUrl: string | null = useMemo(() => {
    const fromMap = config.component ? nodeType?.componentUrls?.[config.component] : null;
    const derived = config.component ? `unoverse://components/${String(config.component).toLowerCase()}` : null;
    return nodeType?.componentTemplate?.componentUrl || fromMap || derived || null;
  }, [nodeType?.componentTemplate?.componentUrl, nodeType?.componentUrls, config.component]);

  const props = useMemo(() => {
    const defaults: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries<any>(nodeType?.configSchema?.properties ?? {})) {
      defaults[key] = prop?.default;
    }
    const unresolved = (v: unknown) => typeof v === "string" && (v.includes("{{") || v.trim().startsWith("return "));
    const result = { ...defaults };
    for (const [key, value] of Object.entries(config)) {
      if (unresolved(value) || value === "" || value === null || value === undefined) continue;
      result[key] = value;
    }
    return result;
  }, [nodeType?.configSchema?.properties, config]);

  return (
    <NodeContainer selected={data.selected} currentStatus={undefined} data={{}} isArmed={false}>
      <ServiceHandles nodeType={nodeType} color={color} />
      {isUnoverse(componentUrl) ? (
        // The SDK self-isolates in a Shadow DOM, so no wrapper here.
        <div className="component-preview w-full">
          <UnoverseComponent client={unoverseClient} uri={componentUrl} data={props} onAction={() => {}} />
        </div>
      ) : (
        <>
          <NodeHeader
            logoUrl={nodeType?.logoUrl}
            name={nodeType?.name || data.label || type}
            type={type}
            data={data}
            color={color}
            currentStatus={undefined}
            nodeType={nodeType}
          />
          <div className="rounded-b-xl bg-white px-4 py-6 text-center text-[12px] text-gray-400">
            {config.component ? `${config.component} is not installed` : "No component selected"}
          </div>
        </>
      )}
      <IOHandles inputs={nodeType?.inputs || []} outputs={nodeType?.outputs || []} color={color} />
    </NodeContainer>
  );
}

export function RecipePreview({
  clip,
  catalog,
  height = 460,
  onSelect,
  selectedId,
}: {
  clip: WorkflowClip;
  /** The node catalog, which is what decides how each node is drawn. */
  catalog: CatalogNode[];
  /** Number for px, or any CSS length: the detail page fills its own box. */
  height?: number | string;
  /** Opening a node hands the RAW node back, so the page can show everything. */
  onSelect?: (node: any) => void;
  selectedId?: string | null;
}) {
  /**
   * The catalog in the shape the canvas node components expect: they look a node
   * type up by `id`, where the marketplace catalog calls it `type`.
   *
   * Then the part a canvas never has to handle. A recipe can name a node THIS
   * universe has not installed, and every one of those components reads its ports
   * and its service connectors from the catalog entry. No entry means no handles,
   * and an edge with no handle to land on is one React Flow refuses to draw
   * (error #008), so the connection silently disappears — the node looks isolated
   * rather than missing.
   *
   * A saved graph carries enough to stand in: the node's OWN `serviceConnectors`
   * (which is why the canvas writes them onto each node), and, from the recipe's
   * own edges, every handle the author actually wired. So each uninstalled type
   * gets a definition built from the recipe itself.
   */
  const nodeTypeDefs = useMemo(() => {
    const defs: any[] = catalog.map((n) => ({ ...n, id: n.type }));
    const byType = new Map(defs.map((d) => [d.id, d]));

    // Every handle the recipe wires, per node type.
    const nodeById = new Map((clip.nodes ?? []).map((n) => [String(n.id), n]));
    const ports = new Map<string, { inputs: Set<string>; outputs: Set<string> }>();
    const portsFor = (t: string) => {
      let p = ports.get(t);
      if (!p) ports.set(t, (p = { inputs: new Set(), outputs: new Set() }));
      return p;
    };
    for (const e of clip.edges ?? []) {
      const src = nodeById.get(String(e?.source));
      const tgt = nodeById.get(String(e?.target));
      if (src) portsFor(String(src.type)).outputs.add(String(e.sourceHandle ?? "output"));
      if (tgt) portsFor(String(tgt.type)).inputs.add(String(e.targetHandle ?? "input"));
    }

    for (const n of clip.nodes ?? []) {
      const t = String(n.type);
      if (t === "Note") continue;
      const known = byType.get(t);
      if (known) {
        // Installed, so the catalog is authority — except where it says nothing
        // about service connectors and the node itself does.
        if (!known.serviceConnectors && n?.data?.serviceConnectors) {
          known.serviceConnectors = n.data.serviceConnectors;
        }
        continue;
      }
      const p = ports.get(t);
      const def = {
        id: t,
        type: t,
        name: n?.data?.label || t,
        // `serviceConsumer` and `service` are drawn by ServiceHandles, so they must
        // not also appear as I/O ports or the handle id would exist twice.
        inputs: [...(p?.inputs ?? [])].filter((h) => h !== "serviceConsumer").map((name) => ({ name })),
        outputs: [...(p?.outputs ?? [])].filter((h) => h !== "service").map((name) => ({ name })),
        serviceConnectors: n?.data?.serviceConnectors ?? null,
      };
      defs.push(def);
      byType.set(t, def);
    }
    return defs;
  }, [catalog, clip]);

  // The renderer for each type present in this recipe, chosen by the SAME rule
  // WorkflowCanvas uses. A type missing from the catalog falls through to StepNode,
  // which draws it from the graph's own label — the detail page names the package
  // to install separately.
  const nodeTypes = useMemo(() => {
    const byId = new Map(nodeTypeDefs.map((d) => [d.id, d]));
    const types: Record<string, any> = {};
    for (const n of clip.nodes ?? []) {
      const t = String(n.type);
      if (types[t]) continue;
      if (t === "Note") {
        types[t] = NoteNode;
        continue;
      }
      const template = (byId.get(t) as any)?.template;
      types[t] =
        template === "uiComponent" || template === "printComponent"
          ? ComponentNode
          : template === "service" || template === "mini"
            ? ServiceNode
            : StepNode;
    }
    return types;
  }, [clip, nodeTypeDefs]);

  const nodes = useMemo<Node[]>(
    () =>
      (clip.nodes ?? []).map((n, i) => {
        const id = String(n.id ?? i);
        return {
          id,
          // Position and style as authored, and NOTHING else about size. The saved
          // `width`/`height` are stale authoring values (200 x 100 on nodes that
          // render taller); forcing them clamps the node and bunches its handles,
          // which is why the canvas does not pass them either. A node sizes itself,
          // and `style` is how the author overrides that (the StreamingText 750).
          position: n.position,
          style: n.style,
          // The node keeps its OWN type, so nodeTypes resolves the right renderer
          // and every handle id matches what the author wired.
          type: String(n.type),
          zIndex: n.type === "Note" ? -1 : undefined,
          data: n.type === "Note" ? n.data : { ...n.data, selected: selectedId === id },
          draggable: false,
          selectable: false,
          connectable: false,
          // A graph copied from a canvas carries whatever was highlighted at the
          // time, which would draw every node here ringed as selected.
          selected: false,
        } as Node;
      }),
    [clip, selectedId],
  );

  // The saved edges, untouched. They already carry their `type`, their handles and
  // their style — including the lilac the canvas gives service connections — so
  // there is nothing here to derive. Anything they omit comes from the canvas's own
  // defaultEdgeOptions below.
  const edges = useMemo<Edge[]>(() => (clip.edges ?? []) as Edge[], [clip]);

  // Locked by default: a mural inside a scrolling page that grabs the wheel on
  // hover is the thing that makes these embeds hostile to read.
  const [exploring, setExploring] = useState(false);

  // Escape always gives the page back, so nobody is ever trapped in the mural.
  useEffect(() => {
    if (!exploring) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExploring(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exploring]);

  return (
    <div className="relative h-full">
      <div style={{ height }} className="overflow-hidden rounded-[18px] border border-gray-200 bg-[#F7F8FB]">
        <NodeTypesProvider nodeTypes={nodeTypeDefs}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.2}
            maxZoom={1.5}
            // Read only: pan and zoom to explore, but nothing here can be changed.
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            // The mural sits INSIDE a scrolling page, so it must not eat the wheel
            // until asked. Until then the page scrolls straight past it and only
            // clicking a node does anything. Explore hands it the wheel and drag.
            zoomOnScroll={exploring}
            zoomOnPinch={exploring}
            zoomOnDoubleClick={exploring}
            panOnDrag={exploring}
            preventScrolling={exploring}
            onNodeClick={(_, node) => onSelect?.((clip.nodes ?? []).find((n) => String(n.id) === node.id) ?? node)}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={32} size={1} color="#cbd5e1" className="opacity-40" />
            {exploring && (
              <Controls
                showInteractive={false}
                className="!bg-white/90 !backdrop-blur-sm !border-2 !border-gray-200 !rounded-xl !shadow-lg"
              />
            )}
          </ReactFlow>
        </NodeTypesProvider>
      </div>

      <button
        onClick={() => setExploring((v) => !v)}
        title={exploring ? "Lock the mural" : "Unlock to pan and zoom"}
        aria-label={exploring ? "Lock the mural" : "Unlock to pan and zoom"}
        aria-pressed={exploring}
        className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full shadow-sm backdrop-blur-sm transition ${
          exploring
            ? "bg-gray-900 text-white hover:bg-gray-700"
            : "border border-gray-200 bg-white/90 text-gray-500 hover:text-gray-900"
        }`}
      >
        {exploring ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
