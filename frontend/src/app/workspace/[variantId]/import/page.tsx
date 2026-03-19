"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FolderOpen,
  Loader2,
  Square,
} from "lucide-react";

import { createGraphBuildJob, getGraphBuildJob, updateVariant } from "@/lib/api/variants";
import { uploadVariantSource } from "@/lib/api/variant-sources";
import { useAuth } from "@/lib/auth";

type Step = "select" | "tree" | "confirm" | "building";

interface FileTreeNode {
  name: string;
  relativePath: string;
  type: "file" | "dir";
  children: FileTreeNode[];
  file?: File;
  language?: string;
}

const DEFAULT_EXCLUDE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "__pycache__",
  ".DS_Store",
  "vendor",
  "target",
  ".idea",
  ".vscode",
];

const DEFAULT_EXCLUDE_FILE_PATTERNS = [
  /^\.env$/i,
  /^\.env\..+$/i,
  /\.md$/i,
  /\.sh$/i,
  /\.gen\.go$/i,
  /\.pb\.go$/i,
  /_connect\.go$/i,
  /^package-lock\.json$/i,
  /^pnpm-lock\.ya?ml$/i,
  /^yarn\.lock$/i,
  /^bun\.lockb?$/i,
];

const EXT_TO_LANG: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  go: "Go",
  py: "Python",
  java: "Java",
  rs: "Rust",
  rb: "Ruby",
  php: "PHP",
  cs: "C#",
  cpp: "C++",
  cc: "C++",
  c: "C",
  h: "C",
  swift: "Swift",
  kt: "Kotlin",
  scala: "Scala",
  dart: "Dart",
};

function detectLanguage(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "";
}

function shouldAutoExclude(pathValue: string): boolean {
  const normalized = pathValue.replaceAll("\\", "/");
  const fileName = normalized.split("/").pop() ?? normalized;

  if (normalized.split("/").some((segment) => DEFAULT_EXCLUDE_DIRS.includes(segment))) {
    return true;
  }

  return DEFAULT_EXCLUDE_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

function buildTree(files: File[]): FileTreeNode {
  const root: FileTreeNode = { name: "", relativePath: "", type: "dir", children: [] };

  for (const file of files) {
    const relativePath = (file.webkitRelativePath || file.name).replaceAll("\\", "/");
    const parts = relativePath.split("/").filter(Boolean);
    let current = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const nodePath = parts.slice(0, i + 1).join("/");
      const isLast = i === parts.length - 1;
      let child = current.children.find((candidate) => candidate.name === part);
      if (!child) {
        child = {
          name: part,
          relativePath: nodePath,
          type: isLast ? "file" : "dir",
          children: [],
          ...(isLast ? { file, language: detectLanguage(part) } : {}),
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  return root;
}

function collectAllPaths(node: FileTreeNode): string[] {
  if (node.type === "file") return [node.relativePath];
  return node.children.flatMap(collectAllPaths);
}

interface TreeNodeItemProps {
  node: FileTreeNode;
  selected: Set<string>;
  onToggle: (paths: string[]) => void;
  depth?: number;
}

function TreeNodeItem({ node, selected, onToggle, depth = 0 }: TreeNodeItemProps) {
  const [expanded, setExpanded] = useState(!shouldAutoExclude(node.relativePath));
  const allPaths = collectAllPaths(node);
  const selectedCount = allPaths.filter((pathValue) => selected.has(pathValue)).length;
  const isChecked = allPaths.length > 0 && selectedCount === allPaths.length;
  const isIndeterminate = selectedCount > 0 && !isChecked;

  if (node.type === "file") {
    return (
      <button
        onClick={() => onToggle([node.relativePath])}
        className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-slate-50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        type="button"
      >
        {selected.has(node.relativePath) ? (
          <CheckSquare className="size-4 shrink-0 text-indigo-600" />
        ) : (
          <Square className="size-4 shrink-0 text-slate-300" />
        )}
        <FileCode2 className="size-4 shrink-0 text-slate-400" />
        <span className="truncate text-sm text-slate-700">{node.name}</span>
        {node.language && <span className="ml-auto shrink-0 text-xs text-slate-400">{node.language}</span>}
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-50" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        <button onClick={() => setExpanded((value) => !value)} className="p-0.5 text-slate-400 hover:text-slate-600" type="button">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <button onClick={() => onToggle(allPaths)} className="flex min-w-0 flex-1 items-center gap-2 text-left" type="button">
          {isChecked ? (
            <CheckSquare className="size-4 shrink-0 text-indigo-600" />
          ) : isIndeterminate ? (
            <CheckSquare className="size-4 shrink-0 text-indigo-400" />
          ) : (
            <Square className="size-4 shrink-0 text-slate-300" />
          )}
          <span className="truncate text-sm font-medium text-slate-800">{node.name}</span>
          <span className="ml-auto shrink-0 text-xs text-slate-400">{allPaths.length} ファイル</span>
        </button>
      </div>
      {expanded &&
        node.children.map((child) => (
          <TreeNodeItem key={child.relativePath} node={child} selected={selected} onToggle={onToggle} depth={depth + 1} />
        ))}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportPage() {
  const params = useParams<{ variantId: string }>();
  const variantId = Array.isArray(params?.variantId) ? params.variantId[0] : params?.variantId;
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("select");
  const [allFiles, setAllFiles] = useState<File[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [buildStatus, setBuildStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [buildError, setBuildError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  const handleFolderSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setAllFiles(files);
    setSelected(
      new Set(
        files
          .map((file) => (file.webkitRelativePath || file.name).replaceAll("\\", "/"))
          .filter((pathValue) => !shouldAutoExclude(pathValue)),
      ),
    );
    setStep("tree");
  }, []);

  const handleToggle = useCallback((paths: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = paths.every((pathValue) => next.has(pathValue));
      if (allSelected) {
        paths.forEach((pathValue) => next.delete(pathValue));
      } else {
        paths.forEach((pathValue) => next.add(pathValue));
      }
      return next;
    });
  }, []);

  const tree = useMemo(() => buildTree(allFiles), [allFiles]);
  const selectedFiles = useMemo(
    () => allFiles.filter((file) => selected.has((file.webkitRelativePath || file.name).replaceAll("\\", "/"))),
    [allFiles, selected],
  );
  const totalSize = useMemo(() => selectedFiles.reduce((sum, file) => sum + file.size, 0), [selectedFiles]);
  const languages = useMemo(
    () => [...new Set(selectedFiles.map((file) => detectLanguage(file.name)).filter(Boolean))],
    [selectedFiles],
  );
  const rootFolderName = useMemo(() => {
    const first = allFiles[0]?.webkitRelativePath;
    return first ? first.split("/")[0] : "";
  }, [allFiles]);

  const handleImport = useCallback(async () => {
    if (!variantId || selectedFiles.length === 0) return;

    setStep("building");
    setBuildStatus("running");
    setBuildError("");

    try {
      const upload = await uploadVariantSource(variantId, selectedFiles);
      await updateVariant({
        id: variantId,
        sourceRootUri: upload.sourceRootUri,
      });

      const job = await createGraphBuildJob(variantId);

      while (true) {
        const current = await getGraphBuildJob(job.id);
        if (current.status === "succeeded") {
          setBuildStatus("done");
          window.setTimeout(() => router.push(`/workspace/${variantId}`), 1200);
          return;
        }
        if (current.status === "failed") {
          throw new Error(current.errorMessage || "グラフビルドに失敗しました");
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
    } catch (error) {
      setBuildStatus("error");
      setBuildError(error instanceof Error ? error.message : "インポートに失敗しました");
    }
  }, [router, selectedFiles, variantId]);

  const steps = ["フォルダ選択", "ファイル選択", "確認", "解析"] as const;
  const stepIndex: Record<Step, number> = {
    select: 0,
    tree: 1,
    confirm: 2,
    building: 3,
  };

  if (!variantId) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">variantId が不正です</div>;
  }

  if (authLoading || !user) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">認証状態を確認中...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-slate-900" type="button">
          <ArrowLeft className="size-4" />
          戻る
        </button>
        <h1 className="text-lg font-semibold text-slate-900">コードのインポート</h1>
      </header>

      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          {steps.map((label, index) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className={`flex items-center gap-2 ${index <= stepIndex[step] ? "text-indigo-600" : "text-slate-400"}`}>
                <div
                  className={`flex size-7 items-center justify-center rounded-full border-2 text-sm font-medium ${
                    index < stepIndex[step]
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : index === stepIndex[step]
                        ? "border-indigo-600 text-indigo-600"
                        : "border-slate-300 text-slate-400"
                  }`}
                >
                  {index < stepIndex[step] ? <CheckCircle2 className="size-4" /> : index + 1}
                </div>
                <span className="hidden text-sm font-medium sm:block">{label}</span>
              </div>
              {index < steps.length - 1 && <div className={`h-0.5 flex-1 ${index < stepIndex[step] ? "bg-indigo-600" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        {step === "select" && (
          <div className="w-full max-w-lg text-center">
            <FolderOpen className="mx-auto mb-4 size-16 text-slate-300" />
            <h2 className="mb-2 text-xl font-semibold text-slate-900">解析対象のルートフォルダを選択</h2>
            <p className="mb-8 text-sm text-slate-500">
              ローカルのフォルダを選ぶと、配下のファイルを確認してから取り込み対象を絞り込めます。
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
              type="button"
            >
              <FolderOpen className="size-5" />
              フォルダを選択
            </button>
            <input
              ref={fileInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is browser-specific
              webkitdirectory=""
              multiple
              className="hidden"
              onChange={handleFolderSelect}
            />
          </div>
        )}

        {step === "tree" && (
          <div className="w-full max-w-3xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">取り込むファイルを選択</h2>
              <p className="mt-1 text-sm text-slate-500">
                ルート: <span className="font-medium text-slate-700">{rootFolderName || "未選択"}</span>
              </p>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {selected.size} / {allFiles.length} ファイル選択中
              </p>
              <div className="flex gap-3 text-sm">
                <button
                  onClick={() => setSelected(new Set(allFiles.map((file) => (file.webkitRelativePath || file.name).replaceAll("\\", "/"))))}
                  className="font-medium text-indigo-600 hover:text-indigo-700"
                  type="button"
                >
                  全選択
                </button>
                <button onClick={() => setSelected(new Set())} className="font-medium text-slate-500 hover:text-slate-700" type="button">
                  全解除
                </button>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200 bg-white p-2">
              {tree.children.map((child) => (
                <TreeNodeItem key={child.relativePath} node={child} selected={selected} onToggle={handleToggle} />
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep("select")} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50" type="button">
                <ArrowLeft className="size-4" />
                戻る
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={selected.size === 0}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                type="button"
              >
                次へ
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="w-full max-w-lg">
            <h2 className="mb-6 text-xl font-semibold text-slate-900">インポート内容の確認</h2>

            <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">ルートフォルダ</span>
                <span className="font-semibold text-slate-900">{rootFolderName || "—"}</span>
              </div>
              <div className="border-t border-slate-100" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">取り込みファイル数</span>
                <span className="font-semibold text-slate-900">{selectedFiles.length} ファイル</span>
              </div>
              <div className="border-t border-slate-100" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">合計サイズ</span>
                <span className="font-semibold text-slate-900">{formatSize(totalSize)}</span>
              </div>
              <div className="border-t border-slate-100" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">検出言語</span>
                <span className="text-right font-semibold text-slate-900">{languages.length > 0 ? languages.join(", ") : "—"}</span>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep("tree")} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50" type="button">
                <ArrowLeft className="size-4" />
                戻る
              </button>
              <button onClick={() => void handleImport()} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700" type="button">
                解析開始
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {step === "building" && (
          <div className="w-full max-w-sm text-center">
            {buildStatus === "running" && (
              <>
                <Loader2 className="mx-auto mb-4 size-12 animate-spin text-indigo-600" />
                <h2 className="mb-2 text-xl font-semibold text-slate-900">解析中...</h2>
                <p className="text-sm text-slate-500">
                  選択したファイルを backend に保存し、コードグラフを生成しています。
                </p>
              </>
            )}
            {buildStatus === "done" && (
              <>
                <CheckCircle2 className="mx-auto mb-4 size-12 text-green-600" />
                <h2 className="mb-2 text-xl font-semibold text-slate-900">インポート完了</h2>
                <p className="text-sm text-slate-500">ワークスペースに移動します...</p>
              </>
            )}
            {buildStatus === "error" && (
              <>
                <AlertCircle className="mx-auto mb-4 size-12 text-red-500" />
                <h2 className="mb-2 text-xl font-semibold text-slate-900">エラーが発生しました</h2>
                <p className="mb-6 text-sm text-red-500">{buildError}</p>
                <button onClick={() => setStep("confirm")} className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50" type="button">
                  戻る
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
