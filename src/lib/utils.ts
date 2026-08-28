import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  getCustomResumeSection,
  getResumeSectionOrder,
} from "@/lib/resume-sections";
import type { FinalResume } from "@/types/resume";
import { parseResumeBullet } from "@/lib/resume-bullets";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function stripBoldFormatting(text: string) {
  return text.replace(/\*\*([\s\S]+?)\*\*/g, "$1");
}

function formatBulletAsText(bullet: string) {
  const { level, text } = parseResumeBullet(bullet);
  return `${level === 2 ? "    ◦" : "  •"} ${stripBoldFormatting(text)}`;
}

export function formatResumeAsText(resume: FinalResume): string {
  const lines: string[] = [];

  lines.push(resume.personalInfo.name);
  lines.push(
    [
      resume.personalInfo.email,
      resume.personalInfo.phone,
      resume.personalInfo.location,
      resume.personalInfo.portfolio,
    ]
      .filter(Boolean)
      .join(" | ")
  );
  lines.push("");
  lines.push(`求职意向：${resume.jobIntent}`);
  lines.push("");

  getResumeSectionOrder(resume).forEach((sectionId) => {
    switch (sectionId) {
      case "summary":
        lines.push("职业摘要", stripBoldFormatting(resume.summary), "");
        break;
      case "coreSkills":
        lines.push("核心能力");
        resume.coreSkills.forEach((skill) => lines.push(`• ${skill}`));
        lines.push("");
        break;
      case "workExperience":
        lines.push("工作经历");
        resume.workExperience.forEach((work) => {
          lines.push(`${work.company} | ${work.role} | ${work.period}`);
          work.bullets.forEach((bullet) => lines.push(formatBulletAsText(bullet)));
          lines.push("");
        });
        break;
      case "projectExperience":
        lines.push("项目经历");
        resume.projectExperience.forEach((project) => {
          lines.push(`${project.name} | ${project.role} | ${project.period}`);
          project.bullets.forEach((bullet) => lines.push(formatBulletAsText(bullet)));
          lines.push("");
        });
        break;
      case "skillsAndTools":
        lines.push("技能工具", resume.skillsAndTools.join(" · "), "");
        break;
      case "education":
        lines.push(
          "教育背景",
          [
            resume.education.school,
            resume.education.major,
            resume.education.degree,
            resume.education.period,
          ]
            .filter(Boolean)
            .join(" | "),
          ""
        );
        break;
      default: {
        const customSection = getCustomResumeSection(resume, sectionId);
        if (customSection) {
          lines.push(
            customSection.title || "自定义板块",
            stripBoldFormatting(customSection.content),
            ""
          );
        }
      }
    }
  });

  return lines.join("\n");
}
