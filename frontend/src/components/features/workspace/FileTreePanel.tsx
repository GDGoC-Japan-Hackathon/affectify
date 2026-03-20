"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  FileCode,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BoardNode } from "@/types/type";

interface FileTreePanelProps {
  nodes: BoardNode[];
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (filePath: string) => void;
}

interface FolderNode {
  name: string;
  path: string;
  files: Map<string, BoardNode[]>;
  subfolders: Map<string, FolderNode>;
}

// BoardNode[] を file_path でグループ化してフォルダツリーを構築
function buildFolderTree(nodes: BoardNode[]): FolderNode {
  const root: FolderNode = {
    name: "root",
    path: "/",
    files: new Map(),
    subfolders: new Map(),
  };

  // file_path でノードをグループ化
  const fileMap = new Map<string, BoardNode[]>();
  for (const node of nodes) {
    if (!node.file_path) continue;
    const arr = fileMap.get(node.file_path) ?? [];
    arr.push(node);
    fileMap.set(node.file_path, arr);
  }

  // 各ファイルパスをフォルダツリーに配置
  for (const [filePath, fileNodes] of fileMap) {
    const parts = filePath.split("/");
    let current = root;

    // フォルダ階層を構築
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      const folderPath = "/" + parts.slice(0, i + 1).join("/");

      if (!current.subfolders.has(folderName)) {
        current.subfolders.set(folderName, {
          name: folderName,
          path: folderPath,
          files: new Map(),
          subfolders: new Map(),
        });
      }
      current = current.subfolders.get(folderName)!;
    }

    // ファイルを追加
    const fileName = parts[parts.length - 1];
    current.files.set(fileName, fileNodes);
  }

  return root;
}

export function FileTreePanel({
  nodes,
  isOpen,
  onClose,
  onFileSelect,
}: FileTreePanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["/"])
  );

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderFolder = (node: FolderNode, depth: number = 0): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];

    // サブフォルダを表示
    for (const subfolder of node.subfolders.values()) {
      const hasContent =
        subfolder.files.size > 0 || subfolder.subfolders.size > 0;
      const isExpanded = expandedFolders.has(subfolder.path);

      if (!hasContent) continue;

      elements.push(
        <div key={subfolder.path}>
          <div
            className="flex items-center gap-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded"
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
            onClick={() => toggleFolder(subfolder.path)}
          >
            {isExpanded ? (
              <ChevronDown className="size-4 shrink-0" />
            ) : (
              <ChevronRight className="size-4 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="size-4 text-blue-500 shrink-0" />
            ) : (
              <Folder className="size-4 text-blue-500 shrink-0" />
            )}
            <span className="text-sm truncate">{subfolder.name}</span>
          </div>
          {isExpanded && <div>{renderFolder(subfolder, depth + 1)}</div>}
        </div>
      );
    }

    // ファイルを表示
    for (const [fileName, fileNodes] of node.files) {
      const filePath = fileNodes[0].file_path;

      elements.push(
        <div key={filePath}>
          <div
            className="flex items-center gap-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded group"
            style={{ paddingLeft: `${depth * 12 + 28}px` }}
            onClick={() => onFileSelect(filePath)}
          >
            <FileCode className="size-4 text-green-600 shrink-0" />
            <span className="text-sm truncate flex-1">{fileName}</span>
            <Badge
              variant="secondary"
              className="text-xs opacity-0 group-hover:opacity-100 transition-opacity mr-2"
            >
              {fileNodes.length}
            </Badge>
          </div>

        </div>
      );
    }

    return elements;
  };

  const folderTree = buildFolderTree(nodes);
  const filesWithPath = nodes.filter((n) => n.file_path);
  const uniqueFiles = new Set(filesWithPath.map((n) => n.file_path));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          style={{ transformOrigin: "16px 16px" }}
          className="fixed left-0 top-0 bottom-0 w-[320px] bg-white border-r border-gray-200 shadow-2xl z-50"
        >
          <div className="flex flex-col h-full">
            {/* ヘッダー */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="font-semibold text-lg">ファイルツリー</h2>
                  <p className="text-sm text-gray-500">コード構造</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="size-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Badge variant="secondary" className="gap-1">
                  <FileCode className="size-3" />
                  {uniqueFiles.size} ファイル
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  {filesWithPath.length} 関数
                </Badge>
              </div>
            </div>

            {/* ファイルツリー */}
            <ScrollArea className="flex-1 overflow-auto">
              <div className="p-2">
                {nodes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Folder className="size-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">ファイルがありません</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {renderFolder(folderTree)}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
