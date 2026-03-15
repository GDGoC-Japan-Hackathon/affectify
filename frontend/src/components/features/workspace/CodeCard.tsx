"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Card, CardContent, Chip, Typography, Box, Collapse } from "@mui/material";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { BoardNode } from "@/types/type";
import { nodeColors } from "@/lib/node-colors";

type CodeCardNode = Node<BoardNode & Record<string, unknown>, "codeCard">;

function CodeCardInner({ data }: NodeProps<CodeCardNode>) {
  const colors = nodeColors[data.kind];
  const [expanded, setExpanded] = useState(false);
  const highlighted = (data as Record<string, unknown>).highlighted;
  const codeLines = data.code_text?.split("\n") ?? [];

  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" />
      <Card
        sx={{
          minWidth: 220,
          maxWidth: expanded ? 600 : 280,
          backgroundColor: colors.bg,
          border: `2px solid ${highlighted ? "#facc15" : colors.border}`,
          cursor: "pointer",
          userSelect: "none",
          boxShadow: highlighted
            ? "0 0 12px 4px rgba(250, 204, 21, 0.5)"
            : 1,
          transition: "box-shadow 0.2s, border-color 0.2s, max-width 0.3s",
        }}
      >
        {/* ヘッダー部分（クリックで展開） */}
        <CardContent
          sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {expanded ? (
              <ChevronDown className="size-4 shrink-0" />
            ) : (
              <ChevronRight className="size-4 shrink-0" />
            )}
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
              }}
            />
          </Box>
          <Typography
            variant="subtitle2"
            noWrap={!expanded}
            sx={{ fontWeight: 600, color: "grey.900", mt: 0.5 }}
          >
            {data.receiver ? `(${data.receiver}).` : ""}
            {data.title}
          </Typography>
          {data.file_path && (
            <Typography variant="caption" noWrap sx={{ color: "grey.500" }}>
              {data.file_path}
            </Typography>
          )}
        </CardContent>

        {/* 展開部分（コード表示） */}
        <Collapse in={expanded}>
          <Box
            sx={{
              borderTop: `1px solid ${colors.border}`,
              maxHeight: 300,
              overflow: "auto",
            }}
            className="nowheel nodrag"
            onWheel={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: "flex", fontFamily: "monospace", fontSize: 12 }}>
              {/* 行番号 */}
              <Box
                sx={{
                  px: 1,
                  py: 1,
                  backgroundColor: "rgba(0,0,0,0.04)",
                  color: "grey.500",
                  userSelect: "none",
                  borderRight: "1px solid",
                  borderColor: "grey.200",
                  textAlign: "right",
                }}
              >
                {codeLines.map((_, i) => (
                  <Box key={i} sx={{ lineHeight: "20px" }}>
                    {i + 1}
                  </Box>
                ))}
              </Box>
              {/* コード */}
              <Box
                component="pre"
                sx={{
                  flex: 1,
                  px: 1.5,
                  py: 1,
                  m: 0,
                  overflowX: "auto",
                  lineHeight: "20px",
                  whiteSpace: "pre",
                }}
              >
                <code>{data.code_text}</code>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Card>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2" />
    </>
  );
}

export const CodeCard = memo(CodeCardInner);
