"use client";

import { EdgeProps, getBezierPath, BaseEdge } from "@xyflow/react";

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

      {/* 流れる点のアニメーション */}
      <circle r="3" fill={(style.stroke as string) || "#94a3b8"}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
      <circle r="3" fill={(style.stroke as string) || "#94a3b8"}>
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={edgePath}
          begin="0.5s"
        />
      </circle>
      <circle r="3" fill={(style.stroke as string) || "#94a3b8"}>
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={edgePath}
          begin="1s"
        />
      </circle>
    </>
  );
}
