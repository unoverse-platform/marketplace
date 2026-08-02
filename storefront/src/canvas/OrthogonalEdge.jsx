import React from "react";
import { BaseEdge, getSmoothStepPath } from "@xyflow/react";

/**
 * OrthogonalEdge — a plain handle-to-handle connector.
 *
 * We do NOT draw a custom route. React Flow's smoothstep path routes the edge
 * naturally between the REAL source/target handles (using sourcePosition/
 * targetPosition to leave/enter the correct side). The connector manages itself.
 *
 * Previously this threaded ELK's interior bend points (`data.points`), but ELK
 * computes those from its own port positions, which differ from the rendered
 * handles — so anchoring the ends to the real handles while following ELK's
 * middle route kinked the edge (a dip to a common channel and back). ELK still
 * owns NODE positions (layered layout); it just no longer draws the edges.
 */
function OrthogonalEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style }) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
}

export default React.memo(OrthogonalEdge);
