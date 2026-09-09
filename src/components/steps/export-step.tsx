"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Download, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, SectionTitle } from "@/components/shared/ui-helpers";
import { ExportFlowIndicator } from "@/components/templates/export-flow-indicator";
import { ResumeTemplateDocument } from "@/components/templates/resume-template-document";
import { ScaledResumePreview } from "@/components/templates/scaled-resume-preview";
import { getResumeTemplate } from "@/lib/resume-templates";
import { exportResumeElementToPdf } from "@/lib/pdf-export";
import { useResumeStore } from "@/store/resume-store";
import { copyToClipboard, formatResumeAsText } from "@/lib/utils";

function buildPdfFileName(projectTitle: string | null, name: string, templateName: string) {
  const fallbackTitle = `${name || "未命名"}-简历-${templateName}`;
  const baseTitle = (projectTitle?.trim() || fallbackTitle).replace(/\.pdf$/i, "");
  const sanitizedTitle = baseTitle.replace(/[\\/:*?"<>|]/g, "-").replace(/[.\s]+$/g, "");
  return `${sanitizedTitle || fallbackTitle}.pdf`;
}

export function ExportStep() {
  const {
    analysisResult,
    draftResume,
    flowMode,
    activeProjectTitle,
    copied,
    setCopied,
    templatePreferences,
    hydrateTemplatePreferences,
    templateConfirmed,
    setCurrentStep,
  } = useResumeStore();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    hydrateTemplatePreferences();
  }, [hydrateTemplatePreferences]);

  if (!draftResume) {
    return <EmptyState message="请先进入简历编辑器并确认内容" />;
  }

  const selectedTemplate = getResumeTemplate(templatePreferences.selectedTemplateId);
  const resumeText = formatResumeAsText(draftResume);

  const handleCopy = async () => {
    const success = await copyToClipboard(resumeText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPdf = async () => {
    if (!exportRef.current) return;

    setIsExporting(true);
    setExportError(null);
    try {
      await exportResumeElementToPdf(exportRef.current, {
        fileName: buildPdfFileName(
          activeProjectTitle,
          draftResume.personalInfo.name,
          selectedTemplate.name
        ),
        backgroundImage:
          selectedTemplate.variant === "deepBanner" ? null : templatePreferences.backgroundImage,
        backgroundOpacity: templatePreferences.backgroundOpacity,
        backgroundMode: templatePreferences.backgroundMode,
        continuationTopMarginMm: selectedTemplate.variant === "deepBanner" ? 4.5 : 0,
        pageBackgroundColor: selectedTemplate.variant === "deepBanner" ? "#f4f4f4" : "#ffffff",
      });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "PDF 生成失败");
    } finally {
      setIsExporting(false);
    }
  };

  if (!templateConfirmed) {
    return (
      <div>
        <ExportFlowIndicator current={4} />
        <SectionTitle title="导出 PDF" description="请先确认模板，再生成最终 PDF" />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4" />
              模板尚未确认
            </CardTitle>
            <CardDescription>导出前需要先选择模板、主题色、头像和背景图。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCurrentStep("template")}>
              返回选择模板
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <ExportFlowIndicator current={4} />
      <SectionTitle
        title="导出 PDF"
        description={`当前模板：${selectedTemplate.name}。最终 PDF 将按右侧预览的样式生成。`}
      />

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Download className="h-4 w-4" />
                PDF 导出
              </CardTitle>
              <CardDescription>
                {`文件名：${buildPdfFileName(
                  activeProjectTitle,
                  draftResume.personalInfo.name,
                  selectedTemplate.name
                )}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleExportPdf} disabled={isExporting} className="w-full">
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在生成 PDF
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    导出 PDF
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep("template")} className="w-full">
                <ArrowLeft className="h-4 w-4" />
                返回调整模板
              </Button>
              {exportError && <p className="text-xs text-red-600">{exportError}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Copy className="h-4 w-4" />
                复制纯文本
              </CardTitle>
              <CardDescription>保留原有纯文本复制能力，便于粘贴到其他工具</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleCopy} className="w-full">
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    复制最终简历
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">导出摘要</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-neutral-100 p-3">
                <p className="text-xs text-neutral-400">模板</p>
                <p className="mt-1 text-sm font-medium">{selectedTemplate.name}</p>
              </div>
              {flowMode === "optimize" && analysisResult && (
                <div className="rounded-md border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-400">匹配度评分</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {analysisResult.diagnosis.overallScore}
                    <span className="text-sm font-normal text-neutral-400">/100</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-neutral-200 pb-3">
            <CardTitle className="text-sm">最终 PDF 预览</CardTitle>
            <CardDescription>预览与导出共用同一套模板渲染组件</CardDescription>
          </CardHeader>
          <CardContent className="bg-neutral-100 p-4">
            <div className="h-[760px] overflow-auto rounded-md border border-neutral-200 bg-neutral-200/70 p-5">
              <ScaledResumePreview maxScale={0.62}>
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

      <div className="pointer-events-none fixed left-[-10000px] top-0">
        <div ref={exportRef} style={{ width: 794 }}>
          <ResumeTemplateDocument
            resume={draftResume}
            template={selectedTemplate}
            accentColor={templatePreferences.accentColor}
            avatarImage={templatePreferences.avatarImage}
            avatarCrop={templatePreferences.avatarCrop}
            backgroundImage={templatePreferences.backgroundImage}
            backgroundOpacity={templatePreferences.backgroundOpacity}
            backgroundMode={templatePreferences.backgroundMode}
            forPdf
          />
        </div>
      </div>
    </div>
  );
}
