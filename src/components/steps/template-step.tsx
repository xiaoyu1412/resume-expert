"use client";

import { ChangeEvent, useEffect, useState } from "react";
import {
  ChevronRight,
  Image as ImageIcon,
  Palette,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { EmptyState, SectionTitle } from "@/components/shared/ui-helpers";
import { ExportFlowIndicator } from "@/components/templates/export-flow-indicator";
import { ResumeTemplateDocument } from "@/components/templates/resume-template-document";
import { ScaledResumePreview } from "@/components/templates/scaled-resume-preview";
import { RESUME_TEMPLATES, getResumeTemplate } from "@/lib/resume-templates";
import { resizeImageFile } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/store/resume-store";
import type { AvatarCropSettings, ResumeTemplateConfig } from "@/types/template";

function TemplateThumbnail({
  template,
  active,
  accentColor,
}: {
  template: ResumeTemplateConfig;
  active: boolean;
  accentColor: string;
}) {
  return (
    <div
      className={cn(
        "relative h-24 w-16 shrink-0 overflow-hidden rounded border bg-white shadow-sm",
        active ? "border-neutral-900" : "border-neutral-200"
      )}
    >
      {template.variant === "modern" && (
        <>
          <div className="absolute inset-y-0 left-0 w-5" style={{ backgroundColor: accentColor }} />
          <div className="absolute left-7 right-2 top-4 h-1 rounded bg-neutral-300" />
          <div className="absolute left-7 right-3 top-7 h-1 rounded bg-neutral-200" />
          <div className="absolute left-7 right-2 top-12 h-1 rounded bg-neutral-300" />
          <div className="absolute left-7 right-4 top-16 h-1 rounded bg-neutral-200" />
        </>
      )}
      {template.variant === "tech" && (
        <>
          <div className="absolute inset-x-0 top-0 h-7" style={{ backgroundColor: accentColor }} />
          <div className="absolute left-3 right-3 top-10 h-1 rounded" style={{ backgroundColor: accentColor }} />
          <div className="absolute left-3 right-4 top-15 h-1 rounded bg-neutral-200" />
          <div className="absolute left-3 right-3 top-20 h-1 rounded bg-neutral-200" />
        </>
      )}
      {template.variant === "creative" && (
        <>
          <div className="absolute left-1/2 top-3 h-5 w-5 -translate-x-1/2 rounded-full" style={{ backgroundColor: accentColor }} />
          <div className="absolute left-3 right-3 top-12 h-4 rounded-md" style={{ backgroundColor: `${accentColor}18` }} />
          <div className="absolute left-3 right-3 top-18 h-4 rounded-md bg-neutral-100" />
        </>
      )}
      {template.variant === "blackGold" && (
        <>
          <div className="absolute inset-x-0 top-0 h-8 bg-neutral-950" />
          <div className="absolute left-3 top-10 h-0.5 w-8" style={{ backgroundColor: accentColor }} />
          <div className="absolute left-3 right-3 top-15 h-1 rounded bg-neutral-200" />
          <div className="absolute left-3 right-4 top-20 h-1 rounded bg-neutral-200" />
        </>
      )}
      {template.variant === "deepBanner" && (
        <>
          <div className="absolute inset-x-0 top-0 h-8" style={{ backgroundColor: accentColor }} />
          <div className="absolute left-2 top-3 h-4 w-4 rounded-full border border-white bg-white/80" />
          <div className="absolute left-8 right-3 top-3 h-1 rounded bg-white/70" />
          <div className="absolute left-8 right-6 top-6 h-0.5 rounded bg-white/50" />
          <div className="absolute left-3 right-3 top-13 h-1 rounded bg-neutral-700" />
          <div className="absolute left-3 right-3 top-17 h-px bg-neutral-400" />
          <div className="absolute left-3 top-22 h-1 w-12 rounded bg-neutral-500" />
        </>
      )}
      {template.variant === "classic" && (
        <>
          <div className="absolute left-3 right-5 top-4 h-1 rounded bg-neutral-700" />
          <div className="absolute left-3 right-3 top-9 h-px bg-neutral-300" />
          <div className="absolute left-3 right-4 top-14 h-1 rounded bg-neutral-300" />
          <div className="absolute left-3 right-3 top-19 h-px bg-neutral-300" />
        </>
      )}
    </div>
  );
}

function AvatarCropPreview({
  image,
  template,
  crop,
}: {
  image: string;
  template: ResumeTemplateConfig;
  crop: AvatarCropSettings;
}) {
  return (
    <div className="flex justify-center rounded-md border border-neutral-200 bg-neutral-100 p-3">
      <div
        role="img"
        aria-label="头像裁剪预览"
        className="relative h-36 w-36 overflow-hidden border-4 border-white bg-white shadow-sm"
        style={{ borderRadius: template.avatarShape === "circle" ? "999px" : "14px" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: `url("${image}")`,
            backgroundPosition: `${crop.positionX}% ${crop.positionY}%`,
            transform: `scale(${crop.zoom / 100})`,
            transformOrigin: `${crop.positionX}% ${crop.positionY}%`,
          }}
        />
      </div>
    </div>
  );
}

export function TemplateStep() {
  const {
    draftResume,
    templatePreferences,
    hydrateTemplatePreferences,
    setSelectedTemplate,
    setAccentColor,
    setAvatarImage,
    setAvatarCrop,
    setBackgroundImage,
    setBackgroundOpacity,
    setBackgroundMode,
    confirmTemplate,
    setCurrentStep,
  } = useResumeStore();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const selectedTemplate = getResumeTemplate(templatePreferences.selectedTemplateId);

  useEffect(() => {
    hydrateTemplatePreferences();
  }, [hydrateTemplatePreferences]);

  if (!draftResume) {
    return <EmptyState message="请先进入简历编辑器并确认内容" />;
  }

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      const dataUrl = await resizeImageFile(file, 900, 0.88);
      setAvatarImage(dataUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "头像上传失败");
    } finally {
      event.target.value = "";
    }
  };

  const handleBackgroundUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      const dataUrl = await resizeImageFile(file, 1600, 0.82);
      setBackgroundImage(dataUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "背景图上传失败");
    } finally {
      event.target.value = "";
    }
  };

  const handleConfirm = () => {
    confirmTemplate();
    setCurrentStep("export");
  };

  return (
    <div>
      <ExportFlowIndicator current={3} />
      <SectionTitle
        title="选择导出模板"
        description="选择模板后，预览和最终 PDF 将使用同一套布局、颜色、头像与背景设置"
      />

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4" />
                模板风格
              </CardTitle>
              <CardDescription>内置 6 套可扩展模板配置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {RESUME_TEMPLATES.map((template) => {
                const active = template.id === selectedTemplate.id;
                const displayColor = active ? templatePreferences.accentColor : template.defaultColor;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      "flex w-full gap-3 rounded-md border p-2 text-left transition-colors",
                      active ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:bg-neutral-50"
                    )}
                  >
                    <TemplateThumbnail template={template} active={active} accentColor={displayColor} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-neutral-900">{template.name}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-neutral-500">
                        {template.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">个性化设置</CardTitle>
              <CardDescription>设置会自动保存到本地浏览器</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-neutral-500">主题色</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTemplate.colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      aria-label={color.label}
                      title={color.label}
                      onClick={() => setAccentColor(color.value)}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-transform hover:scale-105",
                        templatePreferences.accentColor === color.value
                          ? "border-neutral-900"
                          : "border-white ring-1 ring-neutral-200"
                      )}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-neutral-500">头像</Label>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <label>
                      <Upload className="h-4 w-4" />
                      上传头像
                      <input className="hidden" type="file" accept="image/png,image/jpeg" onChange={handleAvatarUpload} />
                    </label>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="删除头像"
                    disabled={!templatePreferences.avatarImage}
                    onClick={() => setAvatarImage(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-neutral-400">支持 jpg/png，预览中按模板裁剪为圆形或方形。</p>
                {templatePreferences.avatarImage && (
                  <div className="mt-2 space-y-3">
                    <AvatarCropPreview
                      image={templatePreferences.avatarImage}
                      template={selectedTemplate}
                      crop={templatePreferences.avatarCrop}
                    />

                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="avatar-zoom" className="text-xs text-neutral-500">
                          缩放
                        </Label>
                        <span className="text-xs tabular-nums text-neutral-500">
                          {templatePreferences.avatarCrop.zoom}%
                        </span>
                      </div>
                      <input
                        id="avatar-zoom"
                        type="range"
                        min={100}
                        max={220}
                        step={1}
                        value={templatePreferences.avatarCrop.zoom}
                        onChange={(event) =>
                          setAvatarCrop({ zoom: Number(event.target.value) })
                        }
                        className="mt-2 w-full accent-neutral-900"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="avatar-position-x" className="text-xs text-neutral-500">
                          水平位置
                        </Label>
                        <span className="text-xs tabular-nums text-neutral-500">
                          {templatePreferences.avatarCrop.positionX}%
                        </span>
                      </div>
                      <input
                        id="avatar-position-x"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={templatePreferences.avatarCrop.positionX}
                        onChange={(event) =>
                          setAvatarCrop({ positionX: Number(event.target.value) })
                        }
                        className="mt-2 w-full accent-neutral-900"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="avatar-position-y" className="text-xs text-neutral-500">
                          垂直位置
                        </Label>
                        <span className="text-xs tabular-nums text-neutral-500">
                          {templatePreferences.avatarCrop.positionY}%
                        </span>
                      </div>
                      <input
                        id="avatar-position-y"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={templatePreferences.avatarCrop.positionY}
                        onChange={(event) =>
                          setAvatarCrop({ positionY: Number(event.target.value) })
                        }
                        className="mt-2 w-full accent-neutral-900"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setAvatarCrop({ zoom: 100, positionX: 50, positionY: 50 })
                      }
                    >
                      <RotateCcw className="h-4 w-4" />
                      重置裁剪
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-neutral-500">背景图</Label>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <label>
                      <ImageIcon className="h-4 w-4" />
                      上传背景
                      <input className="hidden" type="file" accept="image/png,image/jpeg" onChange={handleBackgroundUpload} />
                    </label>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!templatePreferences.backgroundImage}
                    onClick={() => setBackgroundImage(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="background-opacity" className="text-xs text-neutral-500">
                    背景透明度
                  </Label>
                  <span className="text-xs tabular-nums text-neutral-500">
                    {templatePreferences.backgroundOpacity}%
                  </span>
                </div>
                <input
                  id="background-opacity"
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={templatePreferences.backgroundOpacity}
                  onChange={(event) => setBackgroundOpacity(Number(event.target.value))}
                  className="mt-2 w-full accent-neutral-900"
                />
              </div>

              <div>
                <Label htmlFor="background-mode" className="text-xs text-neutral-500">
                  背景模式
                </Label>
                <select
                  id="background-mode"
                  value={templatePreferences.backgroundMode}
                  onChange={(event) => setBackgroundMode(event.target.value as typeof templatePreferences.backgroundMode)}
                  className="mt-2 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
                >
                  <option value="tile">平铺</option>
                  <option value="center">居中</option>
                  <option value="stretch">拉伸</option>
                </select>
              </div>

              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

              <Button onClick={handleConfirm} className="w-full">
                确认模板，进入导出
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-neutral-200 pb-3">
            <CardTitle className="text-sm">实时预览</CardTitle>
            <CardDescription>
              当前数据 · {selectedTemplate.name} · {selectedTemplate.columnLayout === "two-column" ? "双栏" : "单栏"}
            </CardDescription>
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
    </div>
  );
}
