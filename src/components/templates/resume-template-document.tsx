"use client";

import {
  Briefcase,
  FileText,
  FolderOpen,
  Globe2,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  getCustomResumeSection,
  getResumeSectionOrder,
} from "@/lib/resume-sections";
import type { FinalResume, ProjectExperience, WorkExperience } from "@/types/resume";
import type {
  AvatarCropSettings,
  BackgroundMode,
  ResumeTemplateConfig,
} from "@/types/template";

interface ResumeTemplateDocumentProps {
  resume: FinalResume;
  template: ResumeTemplateConfig;
  accentColor: string;
  avatarImage: string | null;
  avatarCrop: AvatarCropSettings;
  backgroundImage: string | null;
  backgroundOpacity: number;
  backgroundMode: BackgroundMode;
  renderBackground?: boolean;
  forPdf?: boolean;
  className?: string;
}

export const RESUME_PAGE_WIDTH = 794;
export const RESUME_PAGE_MIN_HEIGHT = 1123;

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getBackgroundStyle(
  backgroundImage: string | null,
  backgroundMode: BackgroundMode,
  backgroundOpacity: number
): CSSProperties | null {
  if (!backgroundImage || backgroundOpacity <= 0) return null;

  return {
    backgroundImage: `url(${backgroundImage})`,
    backgroundRepeat: backgroundMode === "tile" ? "repeat" : "repeat-y",
    backgroundPosition: "center",
    backgroundSize:
      backgroundMode === "stretch" ? "cover" : backgroundMode === "center" ? "68% auto" : "180px auto",
    opacity: backgroundOpacity / 100,
    mixBlendMode: "multiply",
  };
}

function Avatar({
  avatarImage,
  avatarCrop,
  template,
  size,
  className,
}: {
  avatarImage: string | null;
  avatarCrop: AvatarCropSettings;
  template: ResumeTemplateConfig;
  size: number;
  className?: string;
}) {
  if (!avatarImage) return null;

  return (
    <div
      role="img"
      aria-label="简历头像"
      className={cn("relative shrink-0 overflow-hidden", className)}
      style={{
        width: size,
        height: size,
        borderRadius: template.avatarShape === "circle" ? "999px" : "14px",
      }}
    >
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url("${avatarImage}")`,
          backgroundPosition: `${avatarCrop.positionX}% ${avatarCrop.positionY}%`,
          transform: `scale(${avatarCrop.zoom / 100})`,
          transformOrigin: `${avatarCrop.positionX}% ${avatarCrop.positionY}%`,
        }}
      />
    </div>
  );
}

function ContactItems({
  resume,
  withIcons,
  color,
  className,
}: {
  resume: FinalResume;
  withIcons: boolean;
  color?: string;
  className?: string;
}) {
  const iconClass = "h-3.5 w-3.5";
  const items = [
    { id: "email", icon: Mail, text: resume.personalInfo.email },
    { id: "phone", icon: Phone, text: resume.personalInfo.phone },
    { id: "location", icon: MapPin, text: resume.personalInfo.location },
    { id: "portfolio", icon: Globe2, text: resume.personalInfo.portfolio },
  ].filter((item) => item.text.trim());

  return (
    <div
      className={cn("flex flex-wrap gap-x-4 gap-y-1 text-[13px]", className)}
      style={{ color }}
    >
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <span
            key={item.id}
            className={cn(
              "inline-flex min-w-0 items-start gap-1.5",
              item.id === "email" ? "whitespace-nowrap text-[11px]" : "break-all"
            )}
          >
            {withIcons && <Icon className={cn(iconClass, "mt-0.5 shrink-0")} />}
            {item.text}
          </span>
        );
      })}
    </div>
  );
}

function BoldText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[\s\S]+?\*\*)/g).map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-bold text-inherit">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

function Bullets({ bullets, muted = "#444" }: { bullets: string[]; muted?: string }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {bullets.map((bullet, index) => (
        <li key={index} className="flex gap-2 text-[13px] leading-relaxed" style={{ color: muted }}>
          <span className="mt-[2px] text-[12px]" aria-hidden>
            •
          </span>
          <span><BoldText text={bullet} /></span>
        </li>
      ))}
    </ul>
  );
}

function ExperienceBlock({ item, type }: { item: WorkExperience | ProjectExperience; type: "work" | "project" }) {
  const title = type === "work" ? `${(item as WorkExperience).company} · ${item.role}` : `${(item as ProjectExperience).name} · ${item.role}`;

  return (
    <div data-pdf-block className="break-inside-avoid">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[14px] font-semibold text-neutral-900">{title}</p>
        <span className="shrink-0 text-[12px] text-neutral-500">{item.period}</span>
      </div>
      <Bullets bullets={item.bullets} muted="#4b5563" />
    </div>
  );
}

function Section({
  title,
  children,
  accentColor,
  variant = "plain",
}: {
  title: string;
  children: ReactNode;
  accentColor: string;
  variant?: "plain" | "line" | "chip" | "card" | "gold";
}) {
  if (variant === "chip") {
    return (
      <section data-pdf-block className="break-inside-avoid">
        <h3
          className="mb-3 inline-flex rounded-full px-3 py-1 text-[12px] font-semibold text-white"
          style={{ backgroundColor: accentColor }}
        >
          {title}
        </h3>
        {children}
      </section>
    );
  }

  if (variant === "card") {
    return (
      <section
        data-pdf-block
        className="break-inside-avoid rounded-[18px] border p-5"
        style={{
          borderColor: hexToRgba(accentColor, 0.14),
          backgroundColor: hexToRgba(accentColor, 0.055),
        }}
      >
        <h3 className="mb-3 text-[14px] font-semibold" style={{ color: accentColor }}>
          {title}
        </h3>
        {children}
      </section>
    );
  }

  if (variant === "gold") {
    return (
      <section data-pdf-block className="break-inside-avoid">
        <div className="mb-3 flex items-center gap-3">
          <h3 className="text-[15px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#111827" }}>
            {title}
          </h3>
          <span className="h-px flex-1" style={{ backgroundColor: hexToRgba(accentColor, 0.65) }} />
        </div>
        {children}
      </section>
    );
  }

  return (
    <section data-pdf-block className="break-inside-avoid">
      <h3
        className={cn(
          "mb-3 text-[14px] font-semibold",
          variant === "line" && "border-b pb-2 uppercase tracking-[0.18em]"
        )}
        style={{
          color: variant === "plain" ? accentColor : "#111827",
          borderColor: variant === "line" ? hexToRgba(accentColor, 0.35) : undefined,
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function SkillTags({
  items,
  accentColor,
  filled = false,
}: {
  items: string[];
  accentColor: string;
  filled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="rounded-full px-2.5 py-1 text-[12px]"
          style={{
            backgroundColor: filled ? accentColor : hexToRgba(accentColor, 0.09),
            color: filled ? "white" : accentColor,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function renderModule(
  module: string,
  resume: FinalResume,
  accentColor: string,
  variant: "line" | "chip" | "card" | "gold" | "plain" = "plain"
) {
  switch (module) {
    case "summary":
      return (
        <Section key={module} title="职业摘要" accentColor={accentColor} variant={variant}>
          <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-neutral-700">
            <BoldText text={resume.summary} />
          </p>
        </Section>
      );
    case "coreSkills":
      return (
        <Section key={module} title="核心能力" accentColor={accentColor} variant={variant}>
          <SkillTags items={resume.coreSkills} accentColor={accentColor} />
        </Section>
      );
    case "workExperience":
      return (
        <Section key={module} title="工作经历" accentColor={accentColor} variant={variant}>
          <div className="space-y-4">
            {resume.workExperience.map((item) => (
              <ExperienceBlock key={`${item.company}-${item.period}`} item={item} type="work" />
            ))}
          </div>
        </Section>
      );
    case "projectExperience":
      return (
        <Section key={module} title="项目经历" accentColor={accentColor} variant={variant}>
          <div className="space-y-4">
            {resume.projectExperience.map((item) => (
              <ExperienceBlock key={`${item.name}-${item.period}`} item={item} type="project" />
            ))}
          </div>
        </Section>
      );
    case "skillsAndTools":
      return (
        <Section key={module} title="技能工具" accentColor={accentColor} variant={variant}>
          <p className="text-[13px] leading-relaxed text-neutral-700">{resume.skillsAndTools.join(" · ")}</p>
        </Section>
      );
    case "education":
      return (
        <Section key={module} title="教育背景" accentColor={accentColor} variant={variant}>
          <p className="text-[13px] text-neutral-700">
            {[
              resume.education.school,
              resume.education.major,
              resume.education.degree,
              resume.education.period,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </Section>
      );
    default: {
      const customSection = getCustomResumeSection(resume, module);
      if (!customSection) return null;
      return (
        <Section
          key={module}
          title={customSection.title || "自定义板块"}
          accentColor={accentColor}
          variant={variant}
        >
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-neutral-700">
            <BoldText text={customSection.content} />
          </p>
        </Section>
      );
    }
  }
}

function ClassicTemplate({
  resume,
  template,
  accentColor,
  avatarImage,
  avatarCrop,
}: Pick<
  ResumeTemplateDocumentProps,
  "resume" | "template" | "accentColor" | "avatarImage" | "avatarCrop"
>) {
  return (
    <div className="p-12">
      <header data-pdf-block className="flex items-start justify-between gap-8 border-b pb-5" style={{ borderColor: "#d4d4d4" }}>
        <div>
          <h1 className="text-[34px] font-semibold tracking-wide" style={{ color: "#111827", fontFamily: template.headingFontFamily }}>
            {resume.personalInfo.name}
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: accentColor }}>
            {resume.jobIntent}
          </p>
          <div className="mt-3">
            <ContactItems resume={resume} withIcons={false} color="#555" />
          </div>
        </div>
        <Avatar avatarImage={avatarImage} avatarCrop={avatarCrop} template={template} size={92} className="border border-neutral-200" />
      </header>

      <main className="mt-7 space-y-6">
        {getResumeSectionOrder(resume).map((module) =>
          renderModule(module, resume, accentColor, "line")
        )}
      </main>
    </div>
  );
}

function ModernTemplate({
  resume,
  template,
  accentColor,
  avatarImage,
  avatarCrop,
}: Pick<
  ResumeTemplateDocumentProps,
  "resume" | "template" | "accentColor" | "avatarImage" | "avatarCrop"
>) {
  const sectionOrder = getResumeSectionOrder(resume);
  const sidebarModules = sectionOrder.filter(
    (module) => module === "coreSkills" || module === "skillsAndTools"
  );
  const mainModules = sectionOrder.filter(
    (module) => module !== "coreSkills" && module !== "skillsAndTools"
  );

  return (
    <div className="flex min-h-[1123px]">
      <aside className="w-[220px] p-8 text-white" style={{ backgroundColor: accentColor }}>
        <Avatar avatarImage={avatarImage} avatarCrop={avatarCrop} template={template} size={104} className="mb-7 border-4 border-white/40" />
        <h1 className="text-[28px] font-semibold leading-tight">{resume.personalInfo.name}</h1>
        <p className="mt-2 text-[13px] text-white/80">{resume.jobIntent}</p>
        <div data-pdf-block className="mt-8 text-[12px] leading-relaxed text-white/90">
          <ContactItems
            resume={resume}
            withIcons={false}
            color="rgba(255,255,255,0.9)"
            className="flex-col gap-x-0 gap-y-2 text-[12px]"
          />
        </div>
        <div className="mt-8 space-y-5">
          {sidebarModules.map((module) =>
            module === "coreSkills" ? (
              <section key={module} data-pdf-block>
                <h3 className="mb-3 text-[12px] font-semibold text-white/70">核心能力</h3>
                <div className="space-y-2">
                  {resume.coreSkills.map((item, index) => (
                    <p
                      key={`${item}-${index}`}
                      className="rounded-full bg-white/12 px-3 py-1.5 text-[12px]"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </section>
            ) : (
              <section key={module} data-pdf-block>
                <h3 className="mb-3 text-[12px] font-semibold text-white/70">
                  技能工具
                </h3>
                <p className="text-[12px] leading-relaxed text-white/90">
                  {resume.skillsAndTools.join(" / ")}
                </p>
              </section>
            )
          )}
        </div>
      </aside>

      <main className="flex-1 p-10">
        <div className="space-y-7">
          {mainModules.map((module) =>
            renderModule(module, resume, accentColor, "plain")
          )}
        </div>
      </main>
    </div>
  );
}

function TechTemplate({
  resume,
  template,
  accentColor,
  avatarImage,
  avatarCrop,
}: Pick<
  ResumeTemplateDocumentProps,
  "resume" | "template" | "accentColor" | "avatarImage" | "avatarCrop"
>) {
  return (
    <div>
      <header data-pdf-block className="p-9 text-white" style={{ backgroundColor: accentColor }}>
        <div className="flex items-center gap-6">
          <Avatar avatarImage={avatarImage} avatarCrop={avatarCrop} template={template} size={86} className="border-2 border-white/40" />
          <div className="flex-1">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[12px]">
              <Sparkles className="h-3.5 w-3.5" />
              JD 定制简历
            </div>
            <h1 className="text-[32px] font-semibold">{resume.personalInfo.name}</h1>
            <p className="mt-1 text-[14px] text-white/82">{resume.jobIntent}</p>
          </div>
        </div>
        <div className="mt-5">
          <ContactItems resume={resume} withIcons color="rgba(255,255,255,0.88)" />
        </div>
      </header>
      <main className="space-y-5 p-9">
        {getResumeSectionOrder(resume).map((module) =>
          renderModule(module, resume, accentColor, "chip")
        )}
      </main>
    </div>
  );
}

function CreativeTemplate({
  resume,
  template,
  accentColor,
  avatarImage,
  avatarCrop,
}: Pick<
  ResumeTemplateDocumentProps,
  "resume" | "template" | "accentColor" | "avatarImage" | "avatarCrop"
>) {
  return (
    <div className="p-9" style={{ backgroundColor: hexToRgba(accentColor, 0.035) }}>
      <header data-pdf-block className="mb-7 text-center">
        <div className="flex justify-center">
          <Avatar avatarImage={avatarImage} avatarCrop={avatarCrop} template={template} size={126} className="border-[6px] border-white shadow-sm" />
        </div>
        <h1 className="mt-4 text-[34px] font-semibold text-neutral-900">{resume.personalInfo.name}</h1>
        <p className="mt-1 text-[15px]" style={{ color: accentColor }}>
          {resume.jobIntent}
        </p>
        <div className="mt-3 justify-center">
          <ContactItems resume={resume} withIcons={false} color="#666" />
        </div>
      </header>
      <main className="space-y-5">
        {getResumeSectionOrder(resume).map((module) =>
          renderModule(module, resume, accentColor, "card")
        )}
      </main>
    </div>
  );
}

function BlackGoldTemplate({
  resume,
  template,
  accentColor,
  avatarImage,
  avatarCrop,
}: Pick<
  ResumeTemplateDocumentProps,
  "resume" | "template" | "accentColor" | "avatarImage" | "avatarCrop"
>) {
  return (
    <div>
      <header data-pdf-block className="flex items-center justify-between gap-8 bg-neutral-950 p-10 text-white">
        <div>
          <p className="mb-3 text-[12px] uppercase tracking-[0.36em]" style={{ color: accentColor }}>
            Executive Resume
          </p>
          <h1 className="text-[34px] font-semibold" style={{ fontFamily: template.headingFontFamily }}>
            {resume.personalInfo.name}
          </h1>
          <p className="mt-2 text-[14px] text-white/75">{resume.jobIntent}</p>
          <div className="mt-4 h-[2px] w-28" style={{ backgroundColor: accentColor }} />
          <div className="mt-4">
            <ContactItems resume={resume} withIcons={false} color="rgba(255,255,255,0.72)" />
          </div>
        </div>
        <Avatar avatarImage={avatarImage} avatarCrop={avatarCrop} template={template} size={96} className="border border-white/25" />
      </header>
      <main className="space-y-6 p-10">
        {getResumeSectionOrder(resume).map((module) =>
          renderModule(module, resume, accentColor, "gold")
        )}
      </main>
    </div>
  );
}

function DeepBannerAvatar({
  avatarImage,
  avatarCrop,
  resume,
  template,
}: Pick<
  ResumeTemplateDocumentProps,
  "avatarImage" | "avatarCrop" | "resume" | "template"
>) {
  if (avatarImage) {
    return (
      <Avatar
        avatarImage={avatarImage}
        avatarCrop={avatarCrop}
        template={template}
        size={99}
      />
    );
  }

  return (
    <div className="flex h-[99px] w-[99px] shrink-0 items-center justify-center rounded-full bg-white/95 text-[36px] font-semibold text-neutral-700">
      {resume.personalInfo.name.slice(0, 1)}
    </div>
  );
}

function DeepBannerTitleIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1024 1024"
      className="h-[17px] w-[17px] shrink-0 translate-y-[3px] text-neutral-700"
    >
      <path
        d="M871.228952 663.161905l-58.514285 32.52419 68.266666 39.009524-373.857523 214.552381-370.590477-214.552381 64.999619-39.009524L146.285714 663.161905l-81.286095 45.494857c-15.11619 8.679619-18.383238 21.699048-9.752381 39.009524l6.534095 6.534095v3.218286L494.104381 1004.495238l13.019429 3.267048 16.237714-3.267048 425.886476-247.076571c17.310476-6.485333 21.650286-19.504762 12.970667-39.009524l-12.970667-9.752381-78.019048-45.494857z m78.019048-113.761524c17.310476-10.873905 21.650286-23.893333 12.970667-39.009524-6.485333-6.534095-10.825143-9.752381-12.970667-9.752381l-78.019048-48.761905-58.514285 32.475429 68.266666 39.009524-373.857523 214.552381-370.590477-214.552381L201.532952 487.619048 146.285714 451.876571l-81.286095 48.761905c-15.11619 8.630857-18.383238 21.650286-9.752381 39.009524l6.534095 6.485333 432.323048 250.294857 13.019429 3.267048 16.237714-3.267048 425.886476-247.027809zM64.999619 292.571429c-15.11619 6.485333-18.383238 18.432-9.752381 35.742476l6.534095 9.752381 432.323048 250.343619 13.019429 3.218285 16.237714-3.218285L949.248 341.333333c17.310476-10.825143 21.650286-23.844571 12.970667-39.009523l-12.970667-13.019429L523.361524 42.276571 510.390857 39.009524l-16.286476 3.267047L64.999619 292.571429z m445.391238-191.780572l370.590476 214.552381-373.857523 214.552381-370.590477-214.552381 373.857524-214.552381z"
        fill="currentColor"
      />
    </svg>
  );
}

function DeepBannerSection({
  title,
  children,
  fullWidthRule = false,
}: {
  title: string;
  children: ReactNode;
  fullWidthRule?: boolean;
}) {
  return (
    <section>
      <div data-pdf-block className="break-inside-avoid">
        <div className="flex h-[28px] items-center gap-1.5">
          <DeepBannerTitleIcon />
          <h3 className="text-[17px] font-bold leading-none text-[#353535]">{title}</h3>
        </div>
        <div
          className={cn(
            "mt-[13px] h-px bg-neutral-600",
            !fullWidthRule && "ml-[13px]"
          )}
        />
      </div>
      <div className="pt-[5px]">{children}</div>
    </section>
  );
}

function DeepBannerBullet({
  bullet,
  pdfBlock = true,
}: {
  bullet: string;
  pdfBlock?: boolean;
}) {
  const labelMatch = bullet.match(
    /^(背景|任务|行动|结果|职责|项目背景|核心目标|用户价值|技术架构|商业指标|模型选型与工具 AGENT 设计|用户体验与情感设计)[：:]\s*/
  );

  return (
    <p
      data-pdf-block={pdfBlock ? "" : undefined}
      className="whitespace-pre-line text-[11px] leading-[1.52] text-[#333333]"
    >
      {labelMatch ? (
        <>
          <strong className="font-bold text-neutral-800">{labelMatch[0]}</strong>
          <BoldText text={bullet.slice(labelMatch[0].length)} />
        </>
      ) : (
        <BoldText text={bullet} />
      )}
    </p>
  );
}

function DeepBannerExperienceBlock({
  item,
  type,
}: {
  item: WorkExperience | ProjectExperience;
  type: "work" | "project";
}) {
  const title =
    type === "work"
      ? `“${(item as WorkExperience).company}” | ${item.role}`
      : `${(item as ProjectExperience).name} | ${item.role}`;
  const [firstBullet, ...remainingBullets] = item.bullets;

  return (
    <div className="relative pl-[12px]">
      <span className="absolute left-0 top-[6px] h-[4px] w-[4px] rounded-full bg-[#666666]" />
      <span className="absolute bottom-0 left-[1.5px] top-[17px] w-px bg-[#777777]" />
      <div>
        <div data-pdf-block className="break-inside-avoid">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[11.5px] font-bold leading-[1.45] text-neutral-800">{title}</p>
            <span className="shrink-0 text-[10.5px] leading-[1.45] text-[#444444]">{item.period}</span>
          </div>
          {firstBullet && (
            <div className="mt-[3px]">
              <DeepBannerBullet bullet={firstBullet} pdfBlock={false} />
            </div>
          )}
        </div>
        <div className="space-y-[1px]">
          {remainingBullets.map((bullet, index) => (
            <DeepBannerBullet key={index} bullet={bullet} />
          ))}
        </div>
      </div>
    </div>
  );
}

function renderDeepBannerModule(module: string, resume: FinalResume) {
  switch (module) {
    case "summary":
      return (
        <DeepBannerSection key={module} title="个人总结" fullWidthRule>
          <p data-pdf-block className="whitespace-pre-line text-[11px] leading-[1.52] text-[#333333]">
            <BoldText text={resume.summary} />
          </p>
        </DeepBannerSection>
      );
    case "workExperience":
      return (
        <DeepBannerSection key={module} title="工作履历">
          <div className="space-y-[6px]">
            {resume.workExperience.map((item) => (
              <DeepBannerExperienceBlock
                key={`${item.company}-${item.period}`}
                item={item}
                type="work"
              />
            ))}
          </div>
        </DeepBannerSection>
      );
    case "projectExperience":
      return (
        <DeepBannerSection key={module} title="项目经历">
          <div className="space-y-[6px]">
            {resume.projectExperience.map((item) => (
              <DeepBannerExperienceBlock
                key={`${item.name}-${item.period}`}
                item={item}
                type="project"
              />
            ))}
          </div>
        </DeepBannerSection>
      );
    case "education":
      return (
        <DeepBannerSection key={module} title="教育经历">
          <div data-pdf-block className="flex items-center justify-between gap-4 text-[11px] leading-[1.52] text-[#333333]">
            <p>
              {[
                resume.education.school,
                resume.education.major
                  ? `${resume.education.major}${resume.education.degree ? `（${resume.education.degree}）` : ""}`
                  : resume.education.degree,
              ]
                .filter(Boolean)
                .join(" | ")}
            </p>
            <span>{resume.education.period}</span>
          </div>
        </DeepBannerSection>
      );
    case "coreSkills":
      return (
        <DeepBannerSection key={module} title="核心能力">
          <p data-pdf-block className="text-[11px] leading-[1.52] text-[#333333]">{resume.coreSkills.join("；")}</p>
        </DeepBannerSection>
      );
    case "skillsAndTools":
      return (
        <DeepBannerSection key={module} title="技能工具">
          <p data-pdf-block className="text-[11px] leading-[1.52] text-[#333333]">
            {resume.skillsAndTools.join(" · ")}
          </p>
        </DeepBannerSection>
      );
    default: {
      const customSection = getCustomResumeSection(resume, module);
      if (!customSection) return null;
      return (
        <DeepBannerSection
          key={module}
          title={customSection.title || "自定义板块"}
        >
          <p data-pdf-block className="whitespace-pre-line text-[11px] leading-[1.52] text-[#333333]">
            <BoldText text={customSection.content} />
          </p>
        </DeepBannerSection>
      );
    }
  }
}

function DeepBannerTemplate({
  resume,
  template,
  accentColor,
  avatarImage,
  avatarCrop,
  backgroundImage,
  backgroundOpacity,
  backgroundMode,
}: Pick<
  ResumeTemplateDocumentProps,
  | "resume"
  | "template"
  | "accentColor"
  | "avatarImage"
  | "avatarCrop"
  | "backgroundImage"
  | "backgroundOpacity"
  | "backgroundMode"
>) {
  const sectionOrder = getResumeSectionOrder(resume);
  const headerBackground = {
    backgroundColor: accentColor,
  };
  const headerImageStyle: CSSProperties = {
    backgroundImage: `url(${backgroundImage ?? "/templates/deep-banner-sea.png"})`,
    backgroundPosition: "center",
    backgroundRepeat: backgroundImage && backgroundMode === "tile" ? "repeat" : "no-repeat",
    backgroundSize: backgroundImage
      ? backgroundMode === "stretch" || backgroundMode === "center"
        ? "cover"
        : "150px auto"
      : "cover",
    filter: "grayscale(0.92) saturate(0.28) contrast(0.96) brightness(0.92)",
    opacity: backgroundImage ? backgroundOpacity / 100 : 1,
  };

  return (
    <div className="min-h-[1123px] bg-[#f7f7f7]">
      <header
        data-pdf-block
        className="relative h-[155px] overflow-hidden text-white"
        style={headerBackground}
      >
        <div
          data-resume-header-background
          className="absolute inset-0 z-0"
          style={headerImageStyle}
        />
        <div className="absolute inset-0 z-[1] bg-black/25" />
        <div className="absolute left-[19px] top-[15px] z-10">
          <DeepBannerAvatar avatarImage={avatarImage} avatarCrop={avatarCrop} resume={resume} template={template} />
        </div>
        <div className="absolute left-[166px] right-[64px] top-[17px] z-10">
          <div className="flex items-baseline gap-2.5 whitespace-nowrap">
            <h1 className="text-[24px] font-normal leading-[1.25] text-[#f2f2f2]">
              {resume.personalInfo.name}
            </h1>
            <span className="text-[12px] text-white/85">（求职岗位：{resume.jobIntent}）</span>
          </div>
        </div>
        <div className="absolute left-[166px] right-[106px] top-[53px] z-10 h-px bg-white/80" />
        <div className="absolute left-[166px] right-[64px] top-[64px] z-10">
          <div className="grid grid-cols-[190px_minmax(0,1fr)] gap-x-5 text-[11.5px] leading-[1.62] text-[#eeeeee]">
            {sectionOrder.includes("education") && resume.education.degree && (
              <p>学历：{resume.education.degree}</p>
            )}
            {resume.personalInfo.phone && <p>电话：{resume.personalInfo.phone}</p>}
            {resume.personalInfo.location && <p>现居地：{resume.personalInfo.location}</p>}
            {resume.personalInfo.email && (
              <p className="whitespace-nowrap text-[11.5px]">
                邮箱：{resume.personalInfo.email}
              </p>
            )}
            {resume.personalInfo.portfolio && (
              <p className="whitespace-nowrap">
                作品集：{resume.personalInfo.portfolio}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="space-y-[9px] px-[13px] py-[7px]">
        {sectionOrder.map((module) => renderDeepBannerModule(module, resume))}
      </main>
    </div>
  );
}

export function ResumeTemplateDocument({
  resume,
  template,
  accentColor,
  avatarImage,
  avatarCrop,
  backgroundImage,
  backgroundOpacity,
  backgroundMode,
  renderBackground = true,
  forPdf = false,
  className,
}: ResumeTemplateDocumentProps) {
  const shouldRenderPageBackground = renderBackground && template.variant !== "deepBanner";
  const backgroundStyle = shouldRenderPageBackground
    ? getBackgroundStyle(backgroundImage, backgroundMode, backgroundOpacity)
    : null;

  return (
    <article
      className={cn("relative overflow-hidden text-neutral-900 transition-all duration-300", className)}
      style={{
        width: RESUME_PAGE_WIDTH,
        minHeight: RESUME_PAGE_MIN_HEIGHT,
        backgroundColor: forPdf ? "transparent" : "#ffffff",
        boxShadow: forPdf ? "none" : "0 18px 60px rgba(15, 23, 42, 0.12)",
        fontFamily: template.fontFamily,
      }}
    >
      <div className="relative z-10">
        {template.variant === "classic" && (
          <ClassicTemplate resume={resume} template={template} accentColor={accentColor} avatarImage={avatarImage} avatarCrop={avatarCrop} />
        )}
        {template.variant === "modern" && (
          <ModernTemplate resume={resume} template={template} accentColor={accentColor} avatarImage={avatarImage} avatarCrop={avatarCrop} />
        )}
        {template.variant === "tech" && (
          <TechTemplate resume={resume} template={template} accentColor={accentColor} avatarImage={avatarImage} avatarCrop={avatarCrop} />
        )}
        {template.variant === "creative" && (
          <CreativeTemplate resume={resume} template={template} accentColor={accentColor} avatarImage={avatarImage} avatarCrop={avatarCrop} />
        )}
        {template.variant === "blackGold" && (
          <BlackGoldTemplate resume={resume} template={template} accentColor={accentColor} avatarImage={avatarImage} avatarCrop={avatarCrop} />
        )}
        {template.variant === "deepBanner" && (
          <DeepBannerTemplate
            resume={resume}
            template={template}
            accentColor={accentColor}
            avatarImage={avatarImage}
            avatarCrop={avatarCrop}
            backgroundImage={backgroundImage}
            backgroundOpacity={backgroundOpacity}
            backgroundMode={backgroundMode}
          />
        )}
      </div>
      {backgroundStyle && (
        <div
          data-resume-background
          className="pointer-events-none absolute inset-0 z-20"
          style={backgroundStyle}
        />
      )}
    </article>
  );
}
