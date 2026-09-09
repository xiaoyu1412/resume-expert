"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const FLOW_STEPS = ["上传识别", "编辑内容", "选择模板", "导出 PDF"];

export function ExportFlowIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div className="mb-5 rounded-md border border-neutral-200 bg-white px-4 py-3">
      <div className="grid gap-2 sm:grid-cols-4">
        {FLOW_STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < current;
          const isActive = stepNumber === current;

          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  isActive && "border-neutral-900 bg-neutral-900 text-white",
                  isCompleted && "border-emerald-600 bg-emerald-600 text-white",
                  !isActive && !isCompleted && "border-neutral-200 bg-neutral-50 text-neutral-400"
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : stepNumber}
              </span>
              <span
                className={cn(
                  "text-sm",
                  isActive ? "font-medium text-neutral-900" : "text-neutral-500"
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
