"use client";

import { type EdgeProps, getBezierPath, BaseEdge } from "@xyflow/react";

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {/* エッジ上を流れる点のアニメーション */}
      <circle r="3" fill={(style as React.CSSProperties & { stroke?: string }).stroke ?? "#94a3b8"}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
      <circle r="3" fill={(style as React.CSSProperties & { stroke?: string }).stroke ?? "#94a3b8"}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="0.66s" />
      </circle>
      <circle r="3" fill={(style as React.CSSProperties & { stroke?: string }).stroke ?? "#94a3b8"}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="1.33s" />
      </circle>
    </>
  );
}
