"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { StepSidebar } from "@/components/layout/step-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { StepContent } from "@/components/steps/step-content";
import { useResumeStore } from "@/store/resume-store";

export function AppShell() {
  const hydrateWorkspace = useResumeStore((state) => state.hydrateWorkspace);
  const workspaceHydrated = useResumeStore((state) => state.workspaceHydrated);
  const activeProjectId = useResumeStore((state) => state.activeProjectId);
  const currentStep = useResumeStore((state) => state.currentStep);
  const flowMode = useResumeStore((state) => state.flowMode);
  const userInput = useResumeStore((state) => state.userInput);
  const analysisResult = useResumeStore((state) => state.analysisResult);
  const draftResume = useResumeStore((state) => state.draftResume);
  const optimizeStyle = useResumeStore((state) => state.optimizeStyle);
  const templatePreferences = useResumeStore((state) => state.templatePreferences);
  const templateConfirmed = useResumeStore((state) => state.templateConfirmed);
  const markProjectDirty = useResumeStore((state) => state.markProjectDirty);
  const saveCurrentProject = useResumeStore((state) => state.saveCurrentProject);
  const autosaveProjectRef = useRef<string | null>(null);

  useEffect(() => {
    void hydrateWorkspace();
  }, [hydrateWorkspace]);

  useEffect(() => {
    if (!workspaceHydrated || !activeProjectId) {
      autosaveProjectRef.current = activeProjectId;
      return;
    }

    if (autosaveProjectRef.current !== activeProjectId) {
      autosaveProjectRef.current = activeProjectId;
      return;
    }

    markProjectDirty();
    const timer = window.setTimeout(() => {
      void saveCurrentProject();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [
    activeProjectId,
    analysisResult,
    currentStep,
    draftResume,
    flowMode,
    markProjectDirty,
    optimizeStyle,
    saveCurrentProject,
    templateConfirmed,
    templatePreferences,
    userInput,
    workspaceHydrated,
  ]);

  if (!workspaceHydrated) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <TopNav />
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          正在恢复简历...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <StepSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl p-4 sm:p-6">
            <StepContent />
          </div>
        </main>
      </div>
    </div>
  );
}
