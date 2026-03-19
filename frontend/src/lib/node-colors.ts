import type { NodeKind } from "@/types/type";

const defaultColors = { bg: "#ffffff", border: "#94a3b8", badge: "#64748b" };

const colorMap: Record<NodeKind, { bg: string; border: string; badge: string }> = {
  function: { bg: "#ffffff", border: "#60a5fa", badge: "#3b82f6" },
  method: { bg: "#ffffff", border: "#34d399", badge: "#10b981" },
  interface: { bg: "#ffffff", border: "#c084fc", badge: "#a855f7" },
  struct: { bg: "#ffffff", border: "#fb923c", badge: "#f97316" },
  type: { bg: "#ffffff", border: "#e879f9", badge: "#d946ef" },
  const: { bg: "#ffffff", border: "#38bdf8", badge: "#0ea5e9" },
  var: { bg: "#ffffff", border: "#4ade80", badge: "#22c55e" },
  group: { bg: "#ffffff", border: "#fbbf24", badge: "#f59e0b" },
  note: { bg: "#ffffff", border: "#facc15", badge: "#eab308" },
  memo: { bg: "#fef08a", border: "#fde047", badge: "#ca8a04" },
  image: { bg: "#ffffff", border: "#f472b6", badge: "#ec4899" },
  drawing: { bg: "#ffffff", border: "#a78bfa", badge: "#7c3aed" },
};

export const nodeColors = new Proxy(colorMap, {
  get(target, key: string) {
    return target[key as NodeKind] ?? defaultColors;
  },
});
