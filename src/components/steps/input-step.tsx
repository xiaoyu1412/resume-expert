"use client";

import { ChangeEvent, useState } from "react";
import { FilePenLine, FileUp, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionTitle } from "@/components/shared/ui-helpers";
import { useResumeStore } from "@/store/resume-store";
import { runResumeAnalysis } from "@/services/ai/resumeAgent";
import { parseResumeFile } from "@/lib/resume-file-parser";
import type { CompanyType, JobStage } from "@/types/resume";

export function InputStep() {
  const {
    userInput,
    draftResume,
    setUserInput,
    loadExampleData,
    startDirectEditing,
    isAnalyzing,
    analysisError,
    setAnalyzing,
    setAnalysisResult,
    setAnalysisError,
    setCurrentStep,
  } = useResumeStore();
  const [resumeParseStatus, setResumeParseStatus] = useState<string | null>(null);
  const [resumeParseError, setResumeParseError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!userInput.targetRole || !userInput.jobDescription || !userInput.originalResume) {
      return;
    }
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await runResumeAnalysis(userInput);
      setAnalysisResult(result);
      setCurrentStep("jd-analysis");
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "分析失败，请稍后重试");
    } finally {
      setAnalyzing(false);
    }
  };

  const canAnalyze =
    userInput.targetRole.trim() &&
    userInput.jobDescription.trim() &&
    userInput.originalResume.trim();
  const canDirectEdit = Boolean(userInput.originalResume.trim() || draftResume);

  const handleResumeFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeParseError(null);
    setResumeParseStatus("正在读取简历文件...");

    try {
      const text = await parseResumeFile(file, setResumeParseStatus);
      if (!text.trim()) {
        throw new Error("未识别到有效简历文字，请换一份更清晰的 PDF 或图片");
      }
      setUserInput({ originalResume: text });
      setResumeParseStatus(`已从「${file.name}」识别出 ${text.length} 个字符，可继续编辑`);
    } catch (error) {
      setResumeParseError(error instanceof Error ? error.message : "简历文件解析失败");
      setResumeParseStatus(null);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div>
      <SectionTitle
        title="输入材料"
        description="上传简历后可直接编辑导出，也可以补充目标 JD 进行定制分析与优化"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={loadExampleData}>
          <Wand2 className="h-3.5 w-3.5" />
          使用示例数据
        </Button>
        <Button size="sm" onClick={startDirectEditing} disabled={!canDirectEdit || isAnalyzing}>
          <FilePenLine className="h-3.5 w-3.5" />
          {userInput.originalResume.trim() ? "直接编辑并导出" : "继续上次编辑"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          disabled={!canAnalyze || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              开始分析
            </>
          )}
        </Button>
      </div>

      {analysisError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {analysisError}
        </div>
      )}

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">目标岗位信息</CardTitle>
            <CardDescription>帮助 Agent 理解你的求职方向</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetRole">目标岗位</Label>
              <Input
                id="targetRole"
                placeholder="如：AI 产品经理"
                value={userInput.targetRole}
                onChange={(e) => setUserInput({ targetRole: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">行业</Label>
              <Input
                id="industry"
                placeholder="如：企业服务 / SaaS"
                value={userInput.industry}
                onChange={(e) => setUserInput({ industry: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>公司类型</Label>
              <Select
                value={userInput.companyType}
                onValueChange={(v) => setUserInput({ companyType: v as CompanyType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="大厂">大厂</SelectItem>
                  <SelectItem value="中型公司">中型公司</SelectItem>
                  <SelectItem value="创业公司">创业公司</SelectItem>
                  <SelectItem value="外企">外企</SelectItem>
                  <SelectItem value="国企">国企</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>求职阶段</Label>
              <Select
                value={userInput.jobStage}
                onValueChange={(v) => setUserInput({ jobStage: v as JobStage })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="校招">校招</SelectItem>
                  <SelectItem value="社招-初级">社招-初级</SelectItem>
                  <SelectItem value="社招-中级">社招-中级</SelectItem>
                  <SelectItem value="社招-高级">社招-高级</SelectItem>
                  <SelectItem value="转行">转行</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="highlightSkills">希望突出的能力</Label>
              <Input
                id="highlightSkills"
                placeholder="如：AI 产品规划、数据驱动、ToB 需求分析"
                value={userInput.highlightSkills}
                onChange={(e) => setUserInput({ highlightSkills: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">目标 JD</CardTitle>
            <CardDescription>粘贴完整岗位描述，Agent 将解析职责与要求</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[200px] font-mono text-xs leading-relaxed"
              placeholder="粘贴岗位 JD..."
              value={userInput.jobDescription}
              onChange={(e) => setUserInput({ jobDescription: e.target.value })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm">原始简历</CardTitle>
                <CardDescription>上传 PDF / 图片自动解析，或直接粘贴当前简历全文</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <label className={resumeParseStatus?.startsWith("正在") ? "pointer-events-none" : ""}>
                  {resumeParseStatus?.startsWith("正在") ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileUp className="h-3.5 w-3.5" />
                  )}
                  上传简历
                  <input
                    className="hidden"
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    onChange={handleResumeFileUpload}
                    disabled={Boolean(resumeParseStatus?.startsWith("正在"))}
                  />
                </label>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {resumeParseStatus && (
              <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                {resumeParseStatus}
              </div>
            )}
            {resumeParseError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {resumeParseError}
              </div>
            )}
            <Textarea
              className="min-h-[240px] font-mono text-xs leading-relaxed"
              placeholder="上传 PDF / 图片后会自动回填，也可以直接粘贴简历内容..."
              value={userInput.originalResume}
              onChange={(e) => setUserInput({ originalResume: e.target.value })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">补充信息（可选）</CardTitle>
            <CardDescription>项目细节、转型动机、特殊说明等</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[100px] text-sm"
              placeholder="补充 Agent 需要了解的信息..."
              value={userInput.additionalInfo}
              onChange={(e) => setUserInput({ additionalInfo: e.target.value })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
