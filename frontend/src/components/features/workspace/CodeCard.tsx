"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Card, CardContent, Chip, Typography, Box, Collapse, Button } from "@mui/material";
import { ChevronDown, ChevronRight, Pencil, Eye } from "lucide-react";
import type { BoardNode } from "@/types/type";
import { nodeColors } from "@/lib/node-colors";

type CodeCardNode = Node<BoardNode & Record<string, unknown>, "codeCard">;

function CodeCardInner({ data }: NodeProps<CodeCardNode>) {
  const colors = nodeColors[data.kind];
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(data.code_text ?? "");
  const highlighted = (data as Record<string, unknown>).highlighted;
  const onCodeChange = (data as Record<string, unknown>).onCodeChange as
    | ((nodeId: string, code: string) => void)
    | undefined;

  const codeLines = code.split("\n");

  const handleSave = useCallback(() => {
    onCodeChange?.(data.id, code);
    setEditing(false);
  }, [data.id, code, onCodeChange]);

  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" />
      <Card
        sx={{
          minWidth: 220,
          maxWidth: expanded ? "none" : 280,
          width: expanded ? 500 : undefined,
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

        {/* 展開部分（コード表示/編集） */}
        <Collapse in={expanded}>
          <Box
            sx={{ borderTop: `1px solid ${colors.border}` }}
          >
            {/* 表示/編集切り替えボタン */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1, pt: 0.5 }}>
              <Button
                size="small"
                startIcon={editing ? <Eye size={14} /> : <Pencil size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (editing) handleSave();
                  else setEditing(true);
                }}
                sx={{ fontSize: 11, textTransform: "none" }}
              >
                {editing ? "保存" : "編集"}
              </Button>
            </Box>

            {editing ? (
              /* 編集モード */
              <Box
                className="nowheel nodrag"
                onWheel={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{ px: 1, pb: 1 }}
              >
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{
                    width: "100%",
                    minWidth: 300,
                    minHeight: 200,
                    fontFamily: "monospace",
                    fontSize: 12,
                    lineHeight: "20px",
                    padding: 8,
                    border: "1px solid #e2e8f0",
                    borderRadius: 4,
                    resize: "both",
                    outline: "none",
                    overflow: "auto",
                  }}
                />
              </Box>
            ) : (
              /* 表示モード */
              <Box
                sx={{ maxHeight: 300, overflow: "auto" }}
                className="nowheel nodrag"
                onWheel={(e) => e.stopPropagation()}
              >
                <Box sx={{ display: "flex", fontFamily: "monospace", fontSize: 12 }}>
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
                    <code>{code}</code>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Collapse>
      </Card>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2" />
    </>
  );
}

export const CodeCard = memo(CodeCardInner);
