"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Code, Layers, ChevronDown, X } from "lucide-react";
import { useAIReview } from "./AIReviewContext";
import type { Resolution } from "@/types/ai-review";

const bucketConfig: {
  type: Resolution;
  label: string;
  icon: typeof BookOpen;
  accent: string;
  bg: string;
  border: string;
  countBg: string;
}[] = [
  {
    type: "update_design_guide",
    label: "UPDATE DESIGN GUIDE",
    icon: BookOpen,
    accent: "text-indigo-400",
    bg: "bg-[#1a1f35]",
    border: "border-indigo-700",
    countBg: "bg-indigo-800 text-indigo-200",
  },
  {
    type: "fix_code",
    label: "FIX CODE",
    icon: Code,
    accent: "text-emerald-400",
    bg: "bg-[#0f2a1e]",
    border: "border-emerald-700",
    countBg: "bg-emerald-800 text-emerald-200",
  },
  {
    type: "both",
    label: "BOTH",
    icon: Layers,
    accent: "text-purple-400",
    bg: "bg-[#1e1535]",
    border: "border-purple-700",
    countBg: "bg-purple-800 text-purple-200",
  },
];

export function ResolutionBuckets() {
  const { cards, unresolveCard } = useAIReview();
  const [expandedBucket, setExpandedBucket] = useState<Resolution | null>(null);

  return (
    <div className="flex items-start gap-4 border-b border-slate-700 bg-[#0d1117] px-6 py-4">
      {bucketConfig.map(({ type, label, icon: Icon, accent, bg, border, countBg }) => {
        const resolvedCards = cards.filter((c) => c.resolved && c.resolution === type);
        const isExpanded = expandedBucket === type;

        return (
          <div key={type} className="relative flex-1">
            <motion.div
              animate={resolvedCards.length > 0 ? { scale: [1, 1.04, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={`rounded-xl border ${border} ${bg} px-4 py-3`}
            >
              <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() => setExpandedBucket(isExpanded ? null : type)}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`size-4 ${accent}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-sm font-bold ${countBg}`}>
                    {resolvedCards.length}
                  </span>
                  {resolvedCards.length > 0 && (
                    <ChevronDown className={`size-3 ${accent} transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && resolvedCards.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 space-y-1 overflow-hidden"
                  >
                    {resolvedCards.map((card) => (
                      <div key={card.id} className="flex items-center justify-between rounded-lg bg-black/20 px-2 py-1">
                        <span className="truncate text-xs text-slate-300">{card.title}</span>
                        <button
                          onClick={() => unresolveCard(card.id)}
                          className="ml-1 shrink-0 rounded p-0.5 text-slate-500 hover:text-red-400"
                          title="確定を取り消す"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
