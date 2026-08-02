/**
 * Reading a workflow off the clipboard.
 *
 * Lifted verbatim from RecipePreview, which stayed in the platform: it draws a recipe as a
 * real canvas using Canvas's own node renderers and the SDK, and copying that here would
 * mean a second copy of node chrome drifting from the first.
 *
 * This half has no such dependency. It is the shape the canvas already puts on the
 * clipboard, so there is nothing to convert on either side.
 */
export interface WorkflowClip {
  type: "gravity-workflow";
  version?: string;
  nodes: any[];
  edges: any[];
}

export function parseWorkflowClip(text: string): WorkflowClip | null {
  try {
    const d = JSON.parse(text);
    if (d?.type !== "gravity-workflow" || !Array.isArray(d.nodes)) return null;
    return { type: "gravity-workflow", version: d.version, nodes: d.nodes, edges: Array.isArray(d.edges) ? d.edges : [] };
  } catch {
    return null;
  }
}
