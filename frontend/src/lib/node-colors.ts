import type { NodeKind } from "@/types/type";

export const nodeColors: Record<
  NodeKind,
  { bg: string; border: string; badge: string }
> = {
  function: { bg: "#ffffff", border: "#60a5fa", badge: "#3b82f6" },
  method: { bg: "#ffffff", border: "#34d399", badge: "#10b981" },
  interface: { bg: "#ffffff", border: "#c084fc", badge: "#a855f7" },
  group: { bg: "#ffffff", border: "#fbbf24", badge: "#f59e0b" },
  note: { bg: "#ffffff", border: "#facc15", badge: "#eab308" },
  image: { bg: "#ffffff", border: "#f472b6", badge: "#ec4899" },
};
