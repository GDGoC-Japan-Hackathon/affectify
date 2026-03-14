"use client";

import { Whiteboard } from "@/components/features/workspace/Whiteboard";
import { mockNodes } from "@/data/mock-nodes";
import { mockEdges } from "@/data/mock-edges";

export default function WorkspacePage() {
  return (
    <div className="w-screen h-screen">
      <Whiteboard boardNodes={mockNodes} boardEdges={mockEdges} />
    </div>
  );
}
