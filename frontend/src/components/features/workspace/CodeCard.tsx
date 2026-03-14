"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Card, CardContent, Chip, Typography } from "@mui/material";
import type { BoardNode } from "@/types/type";
import { nodeColors } from "@/lib/node-colors";

type CodeCardNode = Node<BoardNode & Record<string, unknown>, "codeCard">;

function CodeCardInner({ data }: NodeProps<CodeCardNode>) {
  const colors = nodeColors[data.kind];

  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" />
      <Card
        sx={{
          minWidth: 200,
          maxWidth: 280,
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
          cursor: "pointer",
          userSelect: "none",
          boxShadow: 1,
        }}
      >
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Chip
            label={data.kind}
            size="small"
            sx={{
              backgroundColor: colors.badge,
              color: "#fff",
              fontWeight: 700,
              fontSize: 10,
              textTransform: "uppercase",
              height: 20,
              mb: 0.5,
            }}
          />
          <Typography
            variant="subtitle2"
            noWrap
            sx={{ fontWeight: 600, color: "grey.900" }}
          >
            {data.title}
          </Typography>
          {data.file_path && (
            <Typography variant="caption" noWrap sx={{ color: "grey.500" }}>
              {data.file_path}
            </Typography>
          )}
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2" />
    </>
  );
}

export const CodeCard = memo(CodeCardInner);
