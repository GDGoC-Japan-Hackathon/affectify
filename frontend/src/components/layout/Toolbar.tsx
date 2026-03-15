"use client";

import { IconButton, Paper, Tooltip } from "@mui/material";
import NearMeIcon from "@mui/icons-material/NearMe";
import PanToolIcon from "@mui/icons-material/PanTool";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";

export type ToolType = "select" | "hand" | "note";

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const tools: { type: ToolType; label: string; icon: React.ReactNode }[] = [
  { type: "select", label: "選択ツール (V)", icon: <NearMeIcon fontSize="small" /> },
  { type: "hand", label: "手のひらツール (H)", icon: <PanToolIcon fontSize="small" /> },
  { type: "note", label: "付箋ツール (N)", icon: <StickyNote2OutlinedIcon fontSize="small" /> },
];

export function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <Paper
      elevation={2}
      sx={{
        position: "absolute",
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        p: 0.5,
        borderRadius: 2,
      }}
    >
      {tools.map((tool) => (
        <Tooltip key={tool.type} title={tool.label} placement="right" arrow>
          <IconButton
            size="small"
            onClick={() => onToolChange(tool.type)}
            sx={{
              borderRadius: 1.5,
              backgroundColor: activeTool === tool.type ? "action.selected" : "transparent",
              "&:hover": {
                backgroundColor: activeTool === tool.type ? "action.selected" : "action.hover",
              },
            }}
          >
            {tool.icon}
          </IconButton>
        </Tooltip>
      ))}
    </Paper>
  );
}
