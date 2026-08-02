// Single source of truth for edge styles
export const EDGE_STYLES = {
  default: {
    strokeWidth: 3,
    stroke: "#d1d9e3", // Lighter gray color
  },
  service: {
    strokeWidth: 3,
    stroke: "#c4b5fd",
  },
};

export const DEFAULT_EDGE_OPTIONS = {
  // Custom edge: draws ELK's computed orthogonal route when the edge carries
  // data.points, else falls back to smoothstep. Registered in WorkflowCanvas.
  type: "orthogonal",
  animated: false,
  style: EDGE_STYLES.default,
  markerEnd: undefined, // No arrow markers on edges
};

export const CONNECTION_LINE_STYLE = {
  strokeWidth: 2,
  stroke: "#a5b4fc", // Lighter indigo for connection preview
};
