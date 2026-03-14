import type { NodeKind } from "@/types/type";

export const nodeColors: Record<
  NodeKind,
  { bg: string; border: string; badge: string }
> = {
  function: { bg: "#eff6ff", border: "#60a5fa", badge: "#3b82f6" },
  method: { bg: "#ecfdf5", border: "#34d399", badge: "#10b981" },
  interface: { bg: "#faf5ff", border: "#c084fc", badge: "#a855f7" },
  group: { bg: "#fffbeb", border: "#fbbf24", badge: "#f59e0b" },
  note: { bg: "#fefce8", border: "#facc15", badge: "#eab308" },
  image: { bg: "#fdf2f8", border: "#f472b6", badge: "#ec4899" },
};
