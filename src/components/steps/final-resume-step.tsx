"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Brain,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, SectionTitle } from "@/components/shared/ui-helpers";
import { ExportFlowIndicator } from "@/components/templates/export-flow-indicator";
import { ResumeTemplateDocument } from "@/components/templates/resume-template-document";
import { ScaledResumePreview } from "@/components/templates/scaled-resume-preview";
import { getResumeTemplate } from "@/lib/resume-templates";
import {
  DEFAULT_RESUME_SECTION_ORDER,
  getCustomSectionKey,
  getResumeSectionLabel,
} from "@/lib/resume-sections";
import { useResumeStore } from "@/store/resume-store";
import type {
  ProjectExperience,
  ResumeSectionId,
  ResumeStandardSectionId,
  WorkExperience,
} from "@/types/resume";

function EditorSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-neutral-200 bg-white">
      <div className="flex min-h-11 items-center justify-between border-b border-neutral-100 px-4 py-2">
        <h3 className="text-sm font-medium text-neutral-900">{title}</h3>
        {action}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

function EntryActions({
  index,
  length,
  onMove,
  onDelete,
}: {
  index: number;
  length: number;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="上移"
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="下移"
        disabled={index === length - 1}
        onClick={() => onMove(1)}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-600 hover:text-red-700"
        title="删除"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function splitExperienceBullets(text: string) {
  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\s*[•▪●◦]\s*/g, "\n")
    .replace(/(?:^|\n)\s*[·*-]\s+/g, "\n")
    .replace(
      /\s+(?=(?:\d{1,2}[.、)](?!\d)|[（(]\d{1,2}[）)]))\s*/g,
      "\n"
    );

  return normalized
    .split(/\n+/)
    .flatMap((line) => line.match(/[^。！？；;]+[。！？；;]?/g) ?? [line])
    .map((line) =>
      line
        .replace(
          /^\s*(?:\d{1,2}[.、)](?!\d)|[（(]\d{1,2}[）)])\s*/,
          ""
        )
        .trim()
    )
    .filter(Boolean);
}

function BoldTextarea({
  label,
  value,
  onValueChange,
  ...props
}: Omit<ComponentProps<"textarea">, "value" | "onChange"> & {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    let nextValue: string;
    let nextStart: number;
    let nextEnd: number;

    if (
      start >= 2 &&
      value.slice(start - 2, start) === "**" &&
      value.slice(end, end + 2) === "**"
    ) {
      nextValue = `${value.slice(0, start - 2)}${selected}${value.slice(end + 2)}`;
      nextStart = start - 2;
      nextEnd = end - 2;
    } else if (selected.startsWith("**") && selected.endsWith("**") && selected.length > 4) {
      const unwrapped = selected.slice(2, -2);
      nextValue = `${value.slice(0, start)}${unwrapped}${value.slice(end)}`;
      nextStart = start;
      nextEnd = start + unwrapped.length;
    } else {
      nextValue = `${value.slice(0, start)}**${selected}**${value.slice(end)}`;
      nextStart = start + 2;
      nextEnd = selected ? end + 2 : start + 2;
    }

    onValueChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextStart, nextEnd);
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex min-h-7 items-center justify-between">
        {label ? <Label htmlFor={props.id}>{label}</Label> : <span />}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          title="加粗选中文字"
          aria-label="加粗选中文字"
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleBold}
        >
          <span className="font-serif text-sm font-bold">B</span>
        </Button>
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        {...props}
      />
    </div>
  );
}

function ExperienceBulletEditor({
  id,
  label,
  bullets,
  onChange,
}: {
  id: string;
  label: string;
  bullets: string[];
  onChange: (bullets: string[]) => void;
}) {
  const value = bullets.join("\n");

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData("text");
    if (!pastedText.trim()) return;

    const target = event.currentTarget;
    const before = value.slice(0, target.selectionStart).trimEnd();
    const after = value.slice(target.selectionEnd).trimStart();
    const combined = [before, pastedText, after].filter(Boolean).join("\n");
    const nextBullets = splitExperienceBullets(combined);
    if (nextBullets.length === 0) return;

    event.preventDefault();
    onChange(nextBullets);
  };

  return (
    <BoldTextarea
      id={id}
      label={label}
      value={value}
      placeholder="粘贴或输入内容"
      className="min-h-[140px] leading-relaxed"
      onValueChange={(nextValue) => onChange(nextValue.split("\n"))}
      onPaste={handlePaste}
      onBlur={() => onChange(bullets.map((bullet) => bullet.trim()).filter(Boolean))}
    />
  );
}

export function FinalResumeStep() {
  const [sectionToAdd, setSectionToAdd] = useState("");
  const {
    analysisResult,
    draftResume,
    flowMode,
    userInput,
    updateDraftResume,
    setCurrentStep,
    templatePreferences,
    hydrateTemplatePreferences,
    activeProjectId,
    saveStatus,
  } = useResumeStore();

  useEffect(() => {
    hydrateTemplatePreferences();
  }, [hydrateTemplatePreferences]);

  if (!draftResume) {
    return <EmptyState message="请先上传或粘贴简历内容，再进入编辑器" />;
  }

  const selectedTemplate = getResumeTemplate(templatePreferences.selectedTemplateId);
  const hiddenStandardSections = DEFAULT_RESUME_SECTION_ORDER.filter(
    (sectionId) => !draftResume.sectionOrder.includes(sectionId)
  );
  const sectionPosition = (sectionId: ResumeSectionId) =>
    draftResume.sectionOrder.indexOf(sectionId);

  const removeSection = (sectionId: ResumeSectionId) => {
    updateDraftResume((resume) => ({
      ...resume,
      sectionOrder: resume.sectionOrder.filter((item) => item !== sectionId),
      customSections: sectionId.startsWith("custom:")
        ? resume.customSections.filter(
            (section) => getCustomSectionKey(section.id) !== sectionId
          )
        : resume.customSections,
    }));
  };

  const addSection = () => {
    if (!sectionToAdd) return;

    updateDraftResume((resume) => {
      if (sectionToAdd === "custom") {
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `section-${Date.now()}`;
        const sectionKey = getCustomSectionKey(id);

        return {
          ...resume,
          sectionOrder: [...resume.sectionOrder, sectionKey],
          customSections: [
            ...resume.customSections,
            { id, title: "自定义板块", content: "" },
          ],
        };
      }

      const sectionId = sectionToAdd as ResumeStandardSectionId;
      if (resume.sectionOrder.includes(sectionId)) return resume;
      return { ...resume, sectionOrder: [...resume.sectionOrder, sectionId] };
    });
    setSectionToAdd("");
  };

  const updateWork = (index: number, patch: Partial<WorkExperience>) => {
    updateDraftResume((resume) => ({
      ...resume,
      workExperience: resume.workExperience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const updateProject = (index: number, patch: Partial<ProjectExperience>) => {
    updateDraftResume((resume) => ({
      ...resume,
      projectExperience: resume.projectExperience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  };

  return (
    <div>
      <ExportFlowIndicator current={2} />
      <SectionTitle
        title="编辑简历"
        description="修改会实时同步到模板预览，保存到历史后将自动更新"
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div
          className={`flex items-center gap-2 text-xs ${
            saveStatus === "error"
              ? "text-red-700"
              : activeProjectId && saveStatus === "saved"
                ? "text-emerald-700"
                : "text-neutral-500"
          }`}
        >
          {saveStatus === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {!activeProjectId
            ? "当前为临时草稿，点击顶部保存"
            : saveStatus === "saving"
              ? "正在保存到历史简历"
              : saveStatus === "error"
                ? "自动保存失败，请点击顶部重试"
                : saveStatus === "idle"
                  ? "有修改等待自动保存"
                  : "已保存到历史简历"}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentStep("input")}>
            <ArrowLeft className="h-4 w-4" />
            返回输入
          </Button>
          {flowMode === "optimize" && analysisResult && (
            <Button variant="outline" size="sm" onClick={() => setCurrentStep("interview")}>
              <Brain className="h-4 w-4" />
              面试准备
            </Button>
          )}
          <Button size="sm" onClick={() => setCurrentStep("template")}>
            选择模板并导出
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="space-y-4">
          <EditorSection title="个人信息">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["name", "姓名"],
                  ["email", "邮箱"],
                  ["phone", "电话"],
                  ["location", "所在地"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={`personal-${field}`}>{label}</Label>
                  <Input
                    id={`personal-${field}`}
                    value={draftResume.personalInfo[field]}
                    onChange={(event) =>
                      updateDraftResume((resume) => ({
                        ...resume,
                        personalInfo: { ...resume.personalInfo, [field]: event.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-intent">求职意向</Label>
              <Input
                id="job-intent"
                value={draftResume.jobIntent}
                onChange={(event) =>
                  updateDraftResume((resume) => ({ ...resume, jobIntent: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="personal-portfolio">个人作品集</Label>
              <Input
                id="personal-portfolio"
                type="url"
                placeholder="https://your-portfolio.com"
                value={draftResume.personalInfo.portfolio}
                onChange={(event) =>
                  updateDraftResume((resume) => ({
                    ...resume,
                    personalInfo: {
                      ...resume.personalInfo,
                      portfolio: event.target.value,
                    },
                  }))
                }
              />
            </div>
          </EditorSection>

          <EditorSection title="板块管理">
            {draftResume.sectionOrder.length === 0 && (
              <p className="text-sm text-neutral-400">当前没有正文板块</p>
            )}
            <div className="space-y-2">
              {draftResume.sectionOrder.map((sectionId, index) => (
                <div
                  key={sectionId}
                  className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2"
                >
                  <span className="text-sm text-neutral-700">
                    {getResumeSectionLabel(draftResume, sectionId)}
                  </span>
                  <EntryActions
                    index={index}
                    length={draftResume.sectionOrder.length}
                    onMove={(direction) =>
                      updateDraftResume((resume) => ({
                        ...resume,
                        sectionOrder: moveItem(resume.sectionOrder, index, direction),
                      }))
                    }
                    onDelete={() => removeSection(sectionId)}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                aria-label="选择要添加的板块"
                value={sectionToAdd}
                onChange={(event) => setSectionToAdd(event.target.value)}
                className="h-9 flex-1 rounded-md border border-neutral-200 bg-white px-3 text-sm"
              >
                <option value="">选择板块</option>
                {hiddenStandardSections.map((sectionId) => (
                  <option key={sectionId} value={sectionId}>
                    {getResumeSectionLabel(draftResume, sectionId)}
                  </option>
                ))}
                <option value="custom">自定义板块</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!sectionToAdd}
                onClick={addSection}
              >
                <Plus className="h-4 w-4" />
                添加板块
              </Button>
            </div>
          </EditorSection>

          <div className="flex flex-col gap-4">
          <div
            className={draftResume.sectionOrder.includes("summary") ? "" : "hidden"}
            style={{ order: sectionPosition("summary") }}
          >
          <EditorSection title="职业摘要">
            <BoldTextarea
              className="min-h-[130px] leading-relaxed"
              value={draftResume.summary}
              onValueChange={(summary) =>
                updateDraftResume((resume) => ({ ...resume, summary }))
              }
            />
          </EditorSection>
          </div>

          <div
            className={draftResume.sectionOrder.includes("coreSkills") ? "" : "hidden"}
            style={{ order: sectionPosition("coreSkills") }}
          >
          <EditorSection
            title="核心能力"
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateDraftResume((resume) => ({
                    ...resume,
                    coreSkills: [...resume.coreSkills, ""],
                  }))
                }
              >
                <Plus className="h-4 w-4" />
                添加
              </Button>
            }
          >
            {draftResume.coreSkills.length === 0 && (
              <p className="text-sm text-neutral-400">暂无核心能力</p>
            )}
            {draftResume.coreSkills.map((skill, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={skill}
                  onChange={(event) =>
                    updateDraftResume((resume) => ({
                      ...resume,
                      coreSkills: resume.coreSkills.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item
                      ),
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="删除"
                  onClick={() =>
                    updateDraftResume((resume) => ({
                      ...resume,
                      coreSkills: resume.coreSkills.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </EditorSection>
          </div>

          <div
            className={draftResume.sectionOrder.includes("workExperience") ? "" : "hidden"}
            style={{ order: sectionPosition("workExperience") }}
          >
          <EditorSection
            title="工作经历"
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateDraftResume((resume) => ({
                    ...resume,
                    workExperience: [
                      ...resume.workExperience,
                      { company: "", role: "", period: "", bullets: [""] },
                    ],
                  }))
                }
              >
                <Plus className="h-4 w-4" />
                添加经历
              </Button>
            }
          >
            {draftResume.workExperience.length === 0 && (
              <p className="text-sm text-neutral-400">暂无工作经历</p>
            )}
            {draftResume.workExperience.map((work, index) => (
              <div key={index} className="space-y-3 rounded-md border border-neutral-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-neutral-500">经历 {index + 1}</p>
                  <EntryActions
                    index={index}
                    length={draftResume.workExperience.length}
                    onMove={(direction) =>
                      updateDraftResume((resume) => ({
                        ...resume,
                        workExperience: moveItem(resume.workExperience, index, direction),
                      }))
                    }
                    onDelete={() =>
                      updateDraftResume((resume) => ({
                        ...resume,
                        workExperience: resume.workExperience.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input placeholder="公司" value={work.company} onChange={(event) => updateWork(index, { company: event.target.value })} />
                  <Input placeholder="职位" value={work.role} onChange={(event) => updateWork(index, { role: event.target.value })} />
                  <Input placeholder="时间" value={work.period} onChange={(event) => updateWork(index, { period: event.target.value })} />
                </div>
                <ExperienceBulletEditor
                  id={`work-bullets-${index}`}
                  label="工作描述（可整段粘贴）"
                  bullets={work.bullets}
                  onChange={(bullets) => updateWork(index, { bullets })}
                />
              </div>
            ))}
          </EditorSection>
          </div>

          <div
            className={draftResume.sectionOrder.includes("projectExperience") ? "" : "hidden"}
            style={{ order: sectionPosition("projectExperience") }}
          >
          <EditorSection
            title="项目经历"
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateDraftResume((resume) => ({
                    ...resume,
                    projectExperience: [
                      ...resume.projectExperience,
                      { name: "", role: "", period: "", bullets: [""] },
                    ],
                  }))
                }
              >
                <Plus className="h-4 w-4" />
                添加项目
              </Button>
            }
          >
            {draftResume.projectExperience.length === 0 && (
              <p className="text-sm text-neutral-400">暂无项目经历</p>
            )}
            {draftResume.projectExperience.map((project, index) => (
              <div key={index} className="space-y-3 rounded-md border border-neutral-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-neutral-500">项目 {index + 1}</p>
                  <EntryActions
                    index={index}
                    length={draftResume.projectExperience.length}
                    onMove={(direction) =>
                      updateDraftResume((resume) => ({
                        ...resume,
                        projectExperience: moveItem(resume.projectExperience, index, direction),
                      }))
                    }
                    onDelete={() =>
                      updateDraftResume((resume) => ({
                        ...resume,
                        projectExperience: resume.projectExperience.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input placeholder="项目名称" value={project.name} onChange={(event) => updateProject(index, { name: event.target.value })} />
                  <Input placeholder="项目角色" value={project.role} onChange={(event) => updateProject(index, { role: event.target.value })} />
                  <Input placeholder="时间" value={project.period} onChange={(event) => updateProject(index, { period: event.target.value })} />
                </div>
                <ExperienceBulletEditor
                  id={`project-bullets-${index}`}
                  label="项目描述（可整段粘贴）"
                  bullets={project.bullets}
                  onChange={(bullets) => updateProject(index, { bullets })}
                />
              </div>
            ))}
          </EditorSection>
          </div>

          <div
            className={draftResume.sectionOrder.includes("skillsAndTools") ? "" : "hidden"}
            style={{ order: sectionPosition("skillsAndTools") }}
          >
          <EditorSection
            title="技能工具"
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateDraftResume((resume) => ({
                    ...resume,
                    skillsAndTools: [...resume.skillsAndTools, ""],
                  }))
                }
              >
                <Plus className="h-4 w-4" />
                添加
              </Button>
            }
          >
            {draftResume.skillsAndTools.length === 0 && (
              <p className="text-sm text-neutral-400">暂无技能工具</p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {draftResume.skillsAndTools.map((skill, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={skill}
                    onChange={(event) =>
                      updateDraftResume((resume) => ({
                        ...resume,
                        skillsAndTools: resume.skillsAndTools.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item
                        ),
                      }))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="删除"
                    onClick={() =>
                      updateDraftResume((resume) => ({
                        ...resume,
                        skillsAndTools: resume.skillsAndTools.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </EditorSection>
          </div>

          <div
            className={draftResume.sectionOrder.includes("education") ? "" : "hidden"}
            style={{ order: sectionPosition("education") }}
          >
          <EditorSection title="教育背景">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["school", "学校", "如：某大学"],
                  ["major", "专业", "如：视觉传达"],
                  ["degree", "学历", "如：本科"],
                  ["period", "时间", "如：2018 - 2022"],
                ] as const
              ).map(([field, label, placeholder]) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={`education-${field}`}>{label}</Label>
                  <Input
                    id={`education-${field}`}
                    placeholder={placeholder}
                    value={draftResume.education[field]}
                    onChange={(event) =>
                      updateDraftResume((resume) => ({
                        ...resume,
                        education: { ...resume.education, [field]: event.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </EditorSection>
          </div>

          {draftResume.customSections.map((section) => {
            const sectionKey = getCustomSectionKey(section.id);
            return (
              <div
                key={section.id}
                className={draftResume.sectionOrder.includes(sectionKey) ? "" : "hidden"}
                style={{ order: sectionPosition(sectionKey) }}
              >
                <EditorSection title={section.title || "自定义板块"}>
                  <div className="space-y-1.5">
                    <Label htmlFor={`custom-title-${section.id}`}>板块名称</Label>
                    <Input
                      id={`custom-title-${section.id}`}
                      value={section.title}
                      onChange={(event) =>
                        updateDraftResume((resume) => ({
                          ...resume,
                          customSections: resume.customSections.map((item) =>
                            item.id === section.id
                              ? { ...item, title: event.target.value }
                              : item
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <BoldTextarea
                      id={`custom-content-${section.id}`}
                      label="内容"
                      className="min-h-[120px] leading-relaxed"
                      value={section.content}
                      onValueChange={(content) =>
                        updateDraftResume((resume) => ({
                          ...resume,
                          customSections: resume.customSections.map((item) =>
                            item.id === section.id
                              ? { ...item, content }
                              : item
                          ),
                        }))
                      }
                    />
                  </div>
                </EditorSection>
              </div>
            );
          })}
          </div>

          {userInput.originalResume && (
            <details className="rounded-md border border-neutral-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-neutral-700">
                识别原文
              </summary>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-t border-neutral-100 p-4 text-xs leading-relaxed text-neutral-500">
                {userInput.originalResume}
              </pre>
            </details>
          )}
        </div>

        <Card className="self-start overflow-hidden lg:sticky lg:top-0">
          <CardHeader className="border-b border-neutral-200 pb-3">
            <CardTitle className="text-sm">实时预览</CardTitle>
            <CardDescription>{selectedTemplate.name}</CardDescription>
          </CardHeader>
          <CardContent className="bg-neutral-100 p-4">
            <div className="h-[690px] overflow-auto rounded-md border border-neutral-200 bg-neutral-200/70 p-4">
              <ScaledResumePreview maxScale={0.54}>
                <ResumeTemplateDocument
                  resume={draftResume}
                  template={selectedTemplate}
                  accentColor={templatePreferences.accentColor}
                  avatarImage={templatePreferences.avatarImage}
                  avatarCrop={templatePreferences.avatarCrop}
                  backgroundImage={templatePreferences.backgroundImage}
                  backgroundOpacity={templatePreferences.backgroundOpacity}
                  backgroundMode={templatePreferences.backgroundMode}
                />
              </ScaledResumePreview>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
