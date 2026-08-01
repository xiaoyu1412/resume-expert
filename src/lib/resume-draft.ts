import type { FinalResume, ProjectExperience, WorkExperience } from "@/types/resume";
import {
  DEFAULT_RESUME_SECTION_ORDER,
  getResumeSectionOrder,
} from "@/lib/resume-sections";

type ResumeSection =
  | "general"
  | "summary"
  | "work"
  | "project"
  | "skills"
  | "education";

const SECTION_HEADINGS: Array<[ResumeSection, RegExp]> = [
  ["summary", /^(个人简介|个人总结|职业摘要|自我评价|个人优势)$/],
  ["work", /^(工作经历|工作经验|职业经历)$/],
  ["project", /^(项目经历|项目经验|代表项目)$/],
  ["skills", /^(技能|专业技能|技能工具|专业能力|核心能力)$/],
  ["education", /^(教育|教育经历|教育背景|学历信息)$/],
  ["general", /^(个人信息|基本信息|联系方式)$/],
];

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(?:\+?86[-\s]?)?1[3-9](?:[-\s]?[\d*]){9}/;
const DATE_PATTERN = /(?:19|20)\d{2}[./年-]?\d{0,2}|至今|现在/;
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s|｜，,；;]+/i;
const EDUCATION_LEVEL_PATTERN = /博士研究生|博士|硕士研究生|硕士|本科|学士|大专|专科|高中|中专/;

function cleanLine(line: string) {
  return line
    .replace(/^[\s•·▪●◦*-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeading(line: string) {
  return line
    .trim()
    .replace(/^[【\[(（]/, "")
    .replace(/[】\])）:：]$/, "")
    .replace(/\s+/g, "");
}

function getSectionFromHeading(line: string): ResumeSection | null {
  const normalized = normalizeHeading(line);
  return SECTION_HEADINGS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null;
}

function splitList(value: string) {
  return value
    .replace(/^(技能|专业技能|技能工具|专业能力|核心能力)\s*[:：]?\s*/, "")
    .split(/[，,、；;|｜·\n]+/)
    .map(cleanLine)
    .filter(Boolean);
}

function extractLabeledValue(text: string, labels: string[]) {
  const pattern = new RegExp(`(?:${labels.join("|")})\\s*[:：]\\s*([^\\n|｜]+)`, "i");
  return text.match(pattern)?.[1]?.trim() ?? "";
}

function findName(lines: string[]) {
  const labeled = lines.join("\n").match(/姓名\s*[:：]\s*([^\n|｜]+)/)?.[1]?.trim();
  if (labeled) return labeled;

  for (const line of lines.slice(0, 10)) {
    if (!line || getSectionFromHeading(line) || EMAIL_PATTERN.test(line) || PHONE_PATTERN.test(line)) {
      continue;
    }
    const candidate = cleanLine(line.split(/[|｜]/)[0]).replace(/^(姓名|Name)\s*[:：]?\s*/i, "");
    if (/^[\u3400-\u9fff]{2,6}$/.test(candidate) || /^[A-Za-z][A-Za-z .'-]{1,40}$/.test(candidate)) {
      return candidate;
    }
  }

  return "未命名";
}

function findJobIntent(text: string, lines: string[], fallback: string) {
  if (fallback.trim()) return fallback.trim();

  const labeled = extractLabeledValue(text, ["求职意向", "目标岗位", "应聘岗位", "岗位"]);
  if (labeled) return labeled;

  const firstLineParts = lines[0]?.split(/[|｜]/).map(cleanLine).filter(Boolean) ?? [];
  return firstLineParts[1] ?? "";
}

function findLocation(text: string, generalLines: string[], name: string) {
  const labeled = extractLabeledValue(text, ["现居地", "所在地", "居住地", "城市", "地点"]);
  if (labeled) return labeled;

  const contactLine = generalLines.find((line) => EMAIL_PATTERN.test(line) || PHONE_PATTERN.test(line));
  const candidates = (contactLine ? [contactLine] : generalLines.slice(1))
    .flatMap((line) => line.split(/[|｜]/))
    .map(cleanLine)
    .filter((part) => !EMAIL_PATTERN.test(part) && !PHONE_PATTERN.test(part) && !part.includes("："));

  return candidates.find((part) => part !== name && /^[\u3400-\u9fff]{2,10}$/.test(part)) ?? "";
}

function parseExperienceLines<T extends WorkExperience | ProjectExperience>(
  lines: string[],
  kind: "work" | "project"
) {
  const entries: T[] = [];
  const residual: string[] = [];
  let current: T | null = null;

  const flush = () => {
    if (!current) return;
    entries.push(current);
    current = null;
  };

  lines.forEach((rawLine) => {
    const line = cleanLine(rawLine);
    if (!line) return;

    const parts = line.split(/\s*[|｜]\s*/).map(cleanLine).filter(Boolean);
    const isEntryHeader = parts.length >= 3 || (parts.length >= 2 && DATE_PATTERN.test(line));
    const isBullet = /^[\s•·▪●◦*-]/.test(rawLine);

    if (isEntryHeader) {
      flush();
      const periodIndex = parts.findIndex((part, index) => index > 0 && DATE_PATTERN.test(part));
      const roleEnd = periodIndex > 1 ? periodIndex : Math.max(parts.length - 1, 2);
      const period = periodIndex > 0 ? parts.slice(periodIndex).join(" - ") : parts.slice(2).join(" | ");
      current = (kind === "work"
        ? {
            company: parts[0] ?? "",
            role: parts.slice(1, roleEnd).join(" | ") || parts[1] || "",
            period,
            bullets: [],
          }
        : {
            name: parts[0] ?? "",
            role: parts.slice(1, roleEnd).join(" | ") || parts[1] || "",
            period,
            bullets: [],
          }) as unknown as T;
      return;
    }

    if (current && (isBullet || !getSectionFromHeading(line))) {
      current.bullets.push(line);
      return;
    }

    residual.push(line);
  });

  flush();
  return { entries, residual };
}

function parseEducation(lines: string[]) {
  const line = lines.map(cleanLine).find(Boolean) ?? "";
  const parts = line.split(/\s*[|｜]\s*/).map(cleanLine).filter(Boolean);
  const periodIndex = parts.findIndex((part) => DATE_PATTERN.test(part));
  const period = periodIndex >= 0 ? parts.slice(periodIndex).join(" - ") : "";
  const educationParts = parts.slice(1, periodIndex >= 0 ? periodIndex : undefined);
  const combinedEducation = educationParts.join(" | ");
  const degree = combinedEducation.match(EDUCATION_LEVEL_PATTERN)?.[0] ?? "";
  const major = combinedEducation
    .replace(EDUCATION_LEVEL_PATTERN, "")
    .replace(/^[\s|｜/·-]+|[\s|｜/·-]+$/g, "")
    .trim();

  return {
    school: parts[0] ?? "",
    major,
    degree,
    period,
  };
}

export function normalizeEducation(
  education: Partial<FinalResume["education"]> | null | undefined,
  sourceText = ""
): FinalResume["education"] {
  const source = education ?? {};
  const hadMajorField = Object.prototype.hasOwnProperty.call(source, "major");
  const combinedLegacyValue = source.degree?.trim() ?? "";
  const matchedDegree = combinedLegacyValue.match(EDUCATION_LEVEL_PATTERN)?.[0] ?? "";
  const sourceDegree = sourceText.match(EDUCATION_LEVEL_PATTERN)?.[0] ?? "";

  if (hadMajorField) {
    return {
      school: source.school?.trim() ?? "",
      major: source.major?.trim() ?? "",
      degree: combinedLegacyValue || sourceDegree,
      period: source.period?.trim() ?? "",
    };
  }

  return {
    school: source.school?.trim() ?? "",
    major: combinedLegacyValue
      .replace(EDUCATION_LEVEL_PATTERN, "")
      .replace(/^[\s|｜/·-]+|[\s|｜/·-]+$/g, "")
      .trim(),
    degree: matchedDegree || sourceDegree,
    period: source.period?.trim() ?? "",
  };
}

export function normalizeResumeDraft(resume: FinalResume, sourceText = ""): FinalResume {
  const normalized: FinalResume = {
    ...resume,
    personalInfo: {
      ...resume.personalInfo,
      portfolio: resume.personalInfo.portfolio ?? "",
    },
    sectionOrder: Array.isArray(resume.sectionOrder)
      ? resume.sectionOrder
      : [...DEFAULT_RESUME_SECTION_ORDER],
    customSections: Array.isArray(resume.customSections) ? resume.customSections : [],
    education: normalizeEducation(resume.education, sourceText),
  };

  return {
    ...normalized,
    sectionOrder: getResumeSectionOrder(normalized),
  };
}

export function cloneResume(resume: FinalResume, sourceText = ""): FinalResume {
  const normalized = normalizeResumeDraft(resume, sourceText);
  return {
    ...normalized,
    personalInfo: { ...normalized.personalInfo },
    coreSkills: [...normalized.coreSkills],
    workExperience: normalized.workExperience.map((item) => ({
      ...item,
      bullets: [...item.bullets],
    })),
    projectExperience: normalized.projectExperience.map((item) => ({
      ...item,
      bullets: [...item.bullets],
    })),
    skillsAndTools: [...normalized.skillsAndTools],
    education: { ...normalized.education },
    sectionOrder: [...normalized.sectionOrder],
    customSections: normalized.customSections.map((section) => ({ ...section })),
  };
}

export function createResumeDraftFromText(text: string, targetRole = ""): FinalResume {
  const normalizedText = text.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").trim();
  const lines = normalizedText.split("\n").map((line) => line.trim()).filter(Boolean);
  const sections: Record<ResumeSection, string[]> = {
    general: [],
    summary: [],
    work: [],
    project: [],
    skills: [],
    education: [],
  };

  let currentSection: ResumeSection = "general";
  lines.forEach((line) => {
    const heading = getSectionFromHeading(line);
    if (heading) {
      currentSection = heading;
      return;
    }
    sections[currentSection].push(line);
  });

  const work = parseExperienceLines<WorkExperience>(sections.work, "work");
  const projects = parseExperienceLines<ProjectExperience>(sections.project, "project");
  const name = findName(lines);
  const email = normalizedText.match(EMAIL_PATTERN)?.[0] ?? "";
  const phone = normalizedText.match(PHONE_PATTERN)?.[0]?.replace(/\s+/g, "") ?? "";
  const location = findLocation(normalizedText, sections.general, name);
  const portfolio = normalizedText.match(URL_PATTERN)?.[0] ?? "";
  const skills = splitList(sections.skills.join("\n"));

  const generalSummary = sections.general
    .map(cleanLine)
    .filter((line) => {
      if (!line || line === name || EMAIL_PATTERN.test(line) || PHONE_PATTERN.test(line)) return false;
      if (/^(姓名|电话|手机|邮箱|现居地|所在地|居住地|求职意向|目标岗位)\s*[:：]/.test(line)) return false;
      return line.length >= 12 && !line.includes("|") && !line.includes("｜");
    });
  const summaryLines = sections.summary.map(cleanLine).filter(Boolean);
  const residual = [...work.residual, ...projects.residual];
  const summaryParts = summaryLines.length > 0 ? summaryLines : generalSummary;
  if (residual.length > 0) {
    summaryParts.push(`待整理内容：${residual.join("；")}`);
  }

  return normalizeResumeDraft({
    personalInfo: { name, email, phone, location, portfolio },
    jobIntent: findJobIntent(normalizedText, lines, targetRole),
    summary: summaryParts.join("\n"),
    coreSkills: skills.slice(0, 8),
    workExperience: work.entries,
    projectExperience: projects.entries,
    skillsAndTools: skills,
    education: parseEducation(sections.education),
    sectionOrder: [...DEFAULT_RESUME_SECTION_ORDER],
    customSections: [],
  }, normalizedText);
}
