"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  FilePlus2,
  History,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listResumeProjects } from "@/lib/resume-history-storage";
import { getResumeTemplate } from "@/lib/resume-templates";
import { useResumeStore } from "@/store/resume-store";
import type { ResumeProject } from "@/types/resume-history";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function ResumeHistoryDialog() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ResumeProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const activeProjectId = useResumeStore((state) => state.activeProjectId);
  const historyRevision = useResumeStore((state) => state.historyRevision);
  const userInput = useResumeStore((state) => state.userInput);
  const draftResume = useResumeStore((state) => state.draftResume);
  const analysisResult = useResumeStore((state) => state.analysisResult);
  const saveCurrentProject = useResumeStore((state) => state.saveCurrentProject);
  const loadResumeProject = useResumeStore((state) => state.loadResumeProject);
  const renameResumeProject = useResumeStore((state) => state.renameResumeProject);
  const duplicateResumeProject = useResumeStore((state) => state.duplicateResumeProject);
  const deleteResumeProject = useResumeStore((state) => state.deleteResumeProject);
  const createNewResumeProject = useResumeStore((state) => state.createNewResumeProject);

  const hasCurrentContent = Boolean(
    draftResume ||
      analysisResult ||
      userInput.originalResume.trim() ||
      userInput.jobDescription.trim()
  );

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listResumeProjects());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "历史简历读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void refreshProjects();
  }, [historyRevision, open, refreshProjects]);

  const handleContinue = async (project: ResumeProject) => {
    if (project.id === activeProjectId) {
      await saveCurrentProject();
      setOpen(false);
      return;
    }

    if (activeProjectId) {
      const saved = await saveCurrentProject();
      if (!saved) {
        setError("当前简历保存失败，暂未切换");
        return;
      }
    } else if (
      hasCurrentContent &&
      !window.confirm("当前临时草稿尚未保存，继续后将被历史简历替换。确定继续吗？")
    ) {
      return;
    }

    setBusyId(project.id);
    const loaded = await loadResumeProject(project.id);
    setBusyId(null);
    if (loaded) {
      setOpen(false);
    } else {
      setError("这份简历载入失败，请重试");
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    setBusyId(id);
    const renamed = await renameResumeProject(id, renameValue);
    setBusyId(null);
    if (renamed) {
      setRenamingId(null);
      setRenameValue("");
    } else {
      setError("重命名失败，请重试");
    }
  };

  const handleDuplicate = async (id: string) => {
    setBusyId(id);
    if (id === activeProjectId) {
      const saved = await saveCurrentProject();
      if (!saved) {
        setBusyId(null);
        setError("当前简历保存失败，暂未复制");
        return;
      }
    }
    const duplicated = await duplicateResumeProject(id);
    setBusyId(null);
    if (!duplicated) setError("复制失败，请重试");
  };

  const handleDelete = async (project: ResumeProject) => {
    if (!window.confirm(`确定删除“${project.title}”吗？删除后无法恢复。`)) return;
    setBusyId(project.id);
    const deleted = await deleteResumeProject(project.id);
    setBusyId(null);
    if (!deleted) setError("删除失败，请重试");
  };

  const handleCreate = async () => {
    if (activeProjectId) {
      const saved = await saveCurrentProject();
      if (!saved) {
        setError("当前简历保存失败，暂未新建");
        return;
      }
    } else if (
      hasCurrentContent &&
      !window.confirm("当前临时草稿尚未保存，新建后将清空这些内容。确定继续吗？")
    ) {
      return;
    }

    await createNewResumeProject();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="查看历史简历">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">历史简历</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-neutral-200 px-6 py-5 pr-12">
          <DialogTitle>历史简历</DialogTitle>
          <DialogDescription>选择一份已保存的简历，恢复内容并继续编辑。</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-6 py-3">
          <p className="text-xs text-neutral-500">共 {projects.length} 份</p>
          <Button size="sm" onClick={handleCreate}>
            <FilePlus2 className="h-4 w-4" />
            新建简历
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-neutral-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在读取历史简历...
            </div>
          ) : projects.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <History className="mb-3 h-8 w-8 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-700">还没有保存的简历</p>
              <p className="mt-1 text-xs text-neutral-400">编辑内容后点击顶部“保存”即可创建记录</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 border-y border-neutral-100">
              {projects.map((project) => {
                const isActive = project.id === activeProjectId;
                const isBusy = project.id === busyId;
                const targetRole =
                  project.userInput.targetRole.trim() ||
                  project.draftResume?.jobIntent.trim() ||
                  "未设置目标岗位";
                const templateName = getResumeTemplate(
                  project.templatePreferences.selectedTemplateId
                ).name;

                return (
                  <div key={project.id} className="py-4 first:pt-3 last:pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        {renamingId === project.id ? (
                          <div className="flex max-w-md items-center gap-1.5">
                            <Input
                              autoFocus
                              className="h-8"
                              value={renameValue}
                              onChange={(event) => setRenameValue(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") void handleRename(project.id);
                                if (event.key === "Escape") setRenamingId(null);
                              }}
                            />
                            <Button
                              size="icon"
                              className="h-8 w-8"
                              title="确认重命名"
                              disabled={isBusy || !renameValue.trim()}
                              onClick={() => void handleRename(project.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="取消重命名"
                              onClick={() => setRenamingId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-medium text-neutral-900">
                              {project.title}
                            </p>
                            {isActive && (
                              <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                当前
                              </span>
                            )}
                          </div>
                        )}
                        <p className="mt-1 truncate text-xs text-neutral-500">
                          {targetRole} · {templateName} · 更新于 {formatUpdatedAt(project.updatedAt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant={isActive ? "secondary" : "outline"}
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleContinue(project)}
                        >
                          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                          {isActive ? "继续编辑" : "打开"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="重命名"
                          disabled={isBusy}
                          onClick={() => {
                            setRenamingId(project.id);
                            setRenameValue(project.title);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="复制简历"
                          disabled={isBusy}
                          onClick={() => void handleDuplicate(project.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          title="删除简历"
                          disabled={isBusy}
                          onClick={() => void handleDelete(project)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
