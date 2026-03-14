"use client";

import { useRef, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  Typography,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { BoardNode } from "@/types/type";
import { nodeColors } from "@/lib/node-colors";

interface CodeModalProps {
  node: BoardNode | null;
  onClose: () => void;
  onCodeChange?: (nodeId: string, code: string) => void;
}

export function CodeModal({ node, onClose, onCodeChange }: CodeModalProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = useCallback((ed) => {
    editorRef.current = ed;
  }, []);

  const handleClose = useCallback(() => {
    if (node && onCodeChange && editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== node.code_text) {
        onCodeChange(node.id, currentValue);
      }
    }
    editorRef.current = null;
    onClose();
  }, [node, onCodeChange, onClose]);

  if (!node) return null;

  const colors = nodeColors[node.kind];

  return (
    <Dialog
      open={!!node}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: "hidden" },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: colors.bg,
          borderBottom: `2px solid ${colors.border}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          py: 1.5,
          px: 2.5,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={node.kind}
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
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {node.title}
            </Typography>
          </Box>
          {node.file_path && (
            <Typography variant="caption" sx={{ color: "grey.500" }}>
              {node.file_path}
            </Typography>
          )}
          {node.signature && (
            <Typography
              variant="caption"
              sx={{ display: "block", color: "grey.400", fontFamily: "monospace" }}
            >
              {node.signature}
            </Typography>
          )}
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ mt: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{ p: 0, height: "60vh" }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Editor
          height="100%"
          language="go"
          defaultValue={node.code_text}
          theme="vs"
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: "on",
            scrollbar: { verticalScrollbarSize: 8 },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
