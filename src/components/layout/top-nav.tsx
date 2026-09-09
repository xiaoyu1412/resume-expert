"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResumeHistoryDialog } from "@/components/history/resume-history-dialog";
import { fetchAIStatus } from "@/services/ai/resumeAgent";
import { useResumeStore } from "@/store/resume-store";

export function TopNav() {
  const {
    aiMode,
    setAiMode,
    userInput,
    draftResume,
    analysisResult,
    workspaceHydrated,
    activeProjectTitle,
    saveStatus,
    saveError,
    saveCurrentProject,
  } = useResumeStore();
  const [mockReason, setMockReason] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const hasContent = Boolean(
    draftResume ||
      analysisResult ||
      userInput.originalResume.trim() ||
      userInput.jobDescription.trim()
  );

  const saveLabel =
    saveStatus === "saving"
      ? "保存中"
      : saveStatus === "saved"
        ? "已保存"
        : saveStatus === "error"
          ? "重试保存"
          : "保存";

  const openSaveDialog = () => {
    const name = draftResume?.personalInfo.name.trim();
    const role = userInput.targetRole.trim() || draftResume?.jobIntent.trim();
    const suggestedTitle =
      activeProjectTitle ||
      (name && role
        ? `${name} - ${role}`
        : name
          ? `${name}的简历`
          : role
            ? `${role}简历`
            : "未命名简历");

    setSaveTitle(suggestedTitle);
    setSaveDialogOpen(true);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = saveTitle.trim();
    if (!nextTitle) return;

    const saved = await saveCurrentProject(nextTitle);
    if (saved) {
      setSaveDialogOpen(false);
    }
  };

  useEffect(() => {
    fetchAIStatus()
      .then((status) => {
        setAiMode(status.mode);
        if (status.reason === "missing_api_key") {
          setMockReason("未配置 LLM_API_KEY");
        } else if (status.reason === "forced") {
          setMockReason("已强制 Mock");
        } else {
          setMockReason(null);
        }
      })
      .catch(() => setAiMode("mock"));
  }, [setAiMode]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
          <FileText className="h-3.5 w-3.5 text-neutral-700" />
        </div>
        <div>
          <h1 className="whitespace-nowrap text-sm font-semibold tracking-tight text-neutral-900">
            简历专家
          </h1>
        </div>
        <span className="hidden rounded-md border border-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 sm:inline-flex">
          JD 定制简历优化 Agent
        </span>
        {aiMode && (
          <Badge variant={aiMode === "llm" ? "success" : "secondary"} className="font-normal">
            {aiMode === "llm" ? (
              "AI 模式"
            ) : (
              <>
                <span className="sm:hidden">Mock</span>
                <span className="hidden sm:inline">
                  {mockReason ? `Mock · ${mockReason}` : "Mock 模式"}
                </span>
              </>
            )}
          </Badge>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <p className="mr-1 hidden text-xs text-neutral-400 xl:block">
          基于目标岗位 JD · 诊断 · 匹配 · 优化 · 面试准备
        </p>
        <Button
          variant="outline"
          size="sm"
          title={saveError ?? (activeProjectTitle ? `保存“${activeProjectTitle}”` : "保存当前简历")}
          disabled={!workspaceHydrated || !hasContent || saveStatus === "saving"}
          className={saveStatus === "error" ? "border-red-200 text-red-700" : ""}
          onClick={openSaveDialog}
        >
          {saveStatus === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveStatus === "saved" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{saveLabel}</span>
        </Button>
        <ResumeHistoryDialog />
      </div>
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>保存简历</DialogTitle>
            <DialogDescription>
              这个名称会用于历史简历和导出的 PDF 文件名。
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <label htmlFor="resume-save-title" className="text-sm font-medium text-neutral-800">
                简历名称
              </label>
              <Input
                id="resume-save-title"
                autoFocus
                maxLength={80}
                value={saveTitle}
                onChange={(event) => setSaveTitle(event.target.value)}
                placeholder="例如：AI 产品经理 - 教育行业版"
              />
            </div>
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saveStatus === "saving"}
                onClick={() => setSaveDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={!saveTitle.trim() || saveStatus === "saving"}>
                {saveStatus === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
                {saveStatus === "saving" ? "保存中" : "保存"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
