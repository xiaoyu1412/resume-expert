import type {
  CustomResumeSection,
  FinalResume,
  ResumeSectionId,
  ResumeStandardSectionId,
} from "@/types/resume";

export const DEFAULT_RESUME_SECTION_ORDER: ResumeStandardSectionId[] = [
  "summary",
  "coreSkills",
  "workExperience",
  "projectExperience",
  "skillsAndTools",
  "education",
];

export const RESUME_SECTION_LABELS: Record<ResumeStandardSectionId, string> = {
  summary: "职业摘要",
  coreSkills: "核心能力",
  workExperience: "工作经历",
  projectExperience: "项目经历",
  skillsAndTools: "技能工具",
  education: "教育背景",
};

export function isStandardResumeSection(
  sectionId: ResumeSectionId | string
): sectionId is ResumeStandardSectionId {
  return DEFAULT_RESUME_SECTION_ORDER.includes(sectionId as ResumeStandardSectionId);
}

export function getCustomSectionKey(sectionId: string) {
  return `custom:${sectionId}` as ResumeSectionId;
}

export function getCustomSectionId(sectionKey: ResumeSectionId | string) {
  return sectionKey.startsWith("custom:") ? sectionKey.slice("custom:".length) : null;
}

export function getResumeSectionOrder(resume: FinalResume): ResumeSectionId[] {
  const rawOrder = Array.isArray(resume.sectionOrder)
    ? resume.sectionOrder
    : DEFAULT_RESUME_SECTION_ORDER;
  const customSections = Array.isArray(resume.customSections) ? resume.customSections : [];
  const customKeys = new Set(customSections.map((section) => getCustomSectionKey(section.id)));
  const seen = new Set<string>();

  return rawOrder.filter((sectionId) => {
    const valid = isStandardResumeSection(sectionId) || customKeys.has(sectionId);
    if (!valid || seen.has(sectionId)) return false;
    seen.add(sectionId);
    return true;
  });
}

export function getCustomResumeSection(
  resume: FinalResume,
  sectionKey: ResumeSectionId | string
): CustomResumeSection | null {
  const sectionId = getCustomSectionId(sectionKey);
  if (!sectionId) return null;
  return resume.customSections.find((section) => section.id === sectionId) ?? null;
}

export function getResumeSectionLabel(resume: FinalResume, sectionId: ResumeSectionId) {
  if (isStandardResumeSection(sectionId)) return RESUME_SECTION_LABELS[sectionId];
  return getCustomResumeSection(resume, sectionId)?.title || "自定义板块";
}
