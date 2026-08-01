import { create } from "zustand";
import type {
  AnalysisResult,
  FinalResume,
  OptimizeStyle,
  ResumeFlowMode,
  StepId,
  StepStatus,
  UserInput,
} from "@/types/resume";
import type { AIMode } from "@/lib/ai/types";
import {
  DEFAULT_TEMPLATE_PREFERENCES,
  getTemplateDefaultColor,
} from "@/lib/resume-templates";
import {
  getResumeProject,
  putResumeProject,
  removeResumeProject,
} from "@/lib/resume-history-storage";
import { getTemplateImage, setTemplateImage } from "@/lib/template-image-storage";
import { cloneResume, createResumeDraftFromText } from "@/lib/resume-draft";
import type { ResumeProject, ResumeProjectSaveStatus } from "@/types/resume-history";
import type {
  AvatarCropSettings,
  BackgroundMode,
  ResumeTemplateId,
  TemplatePreferences,
} from "@/types/template";

const STEPS: StepId[] = [
  "input",
  "jd-analysis",
  "diagnosis",
  "match",
  "follow-up",
  "optimize",
  "final-resume",
  "interview",
  "template",
  "export",
];

const DIRECT_STEPS: StepId[] = ["input", "final-resume", "template", "export"];

const TEMPLATE_STORAGE_KEY = "resume-expert-template-preferences";
const DRAFT_STORAGE_KEY = "resume-expert-draft-resume";
const ACTIVE_PROJECT_STORAGE_KEY = "resume-expert-active-project";
const LEGACY_PROJECT_ID = "legacy-draft-v1";

type StoredTemplatePreferences = Omit<
  TemplatePreferences,
  "avatarImage" | "backgroundImage"
>;

interface ResumeStore {
  userInput: UserInput;
  currentStep: StepId;
  flowMode: ResumeFlowMode;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
  draftResume: FinalResume | null;
  analysisError: string | null;
  aiMode: AIMode | null;
  optimizeStyle: OptimizeStyle;
  copied: boolean;
  templatePreferences: TemplatePreferences;
  templateConfirmed: boolean;
  activeProjectId: string | null;
  activeProjectTitle: string | null;
  activeProjectCreatedAt: string | null;
  saveStatus: ResumeProjectSaveStatus;
  saveError: string | null;
  lastSavedAt: string | null;
  workspaceHydrated: boolean;
  historyRevision: number;

  setUserInput: (input: Partial<UserInput>) => void;
  loadExampleData: () => void;
  setCurrentStep: (step: StepId) => void;
  startDirectEditing: () => void;
  hydrateDraftResume: () => void;
  updateDraftResume: (updater: (resume: FinalResume) => FinalResume) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  setAnalysisError: (error: string | null) => void;
  setAiMode: (mode: AIMode | null) => void;
  setOptimizeStyle: (style: OptimizeStyle) => void;
  updateFollowUpAnswer: (id: string, answer: string) => void;
  setFollowUpBullet: (id: string, bullet: string) => void;
  getStepStatus: (step: StepId) => StepStatus;
  setCopied: (copied: boolean) => void;
  hydrateWorkspace: () => Promise<void>;
  hydrateTemplatePreferences: () => void;
  setSelectedTemplate: (templateId: ResumeTemplateId) => void;
  setAccentColor: (color: string) => void;
  setAvatarImage: (image: string | null) => void;
  setAvatarCrop: (crop: Partial<AvatarCropSettings>) => void;
  setBackgroundImage: (image: string | null) => void;
  setBackgroundOpacity: (opacity: number) => void;
  setBackgroundMode: (mode: BackgroundMode) => void;
  confirmTemplate: () => void;
  markProjectDirty: () => void;
  saveCurrentProject: (title?: string) => Promise<boolean>;
  loadResumeProject: (id: string) => Promise<boolean>;
  renameResumeProject: (id: string, title: string) => Promise<boolean>;
  duplicateResumeProject: (id: string) => Promise<boolean>;
  deleteResumeProject: (id: string) => Promise<boolean>;
  createNewResumeProject: () => Promise<void>;
}

const defaultUserInput: UserInput = {
  targetRole: "",
  industry: "",
  companyType: "中型公司",
  jobStage: "社招-中级",
  highlightSkills: "",
  jobDescription: "",
  originalResume: "",
  additionalInfo: "",
};

function createDefaultUserInput(): UserInput {
  return { ...defaultUserInput };
}

function createDefaultTemplatePreferences(): TemplatePreferences {
  return {
    ...DEFAULT_TEMPLATE_PREFERENCES,
    avatarCrop: { ...DEFAULT_TEMPLATE_PREFERENCES.avatarCrop },
  };
}

function createProjectId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getProjectTitle(
  draftResume: FinalResume | null,
  userInput: UserInput,
  fallback = "未命名简历"
) {
  const name = draftResume?.personalInfo.name.trim();
  const role = userInput.targetRole.trim() || draftResume?.jobIntent.trim();
  if (name && role) return `${name} - ${role}`;
  if (name) return `${name}的简历`;
  if (role) return `${role}简历`;
  return fallback;
}

function readActiveProjectId() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistActiveProjectId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
    }
  } catch {
    // 当前项目仍保留在内存中；失败只影响刷新后的自动恢复。
  }
}

function clearLegacyDraftResume() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // 清理旧草稿失败不会影响 IndexedDB 中的历史记录。
  }
}

function persistTemplatePreferences(preferences: TemplatePreferences) {
  if (typeof window === "undefined") return;

  const stored: StoredTemplatePreferences = {
    selectedTemplateId: preferences.selectedTemplateId,
    accentColor: preferences.accentColor,
    avatarCrop: preferences.avatarCrop,
    backgroundOpacity: preferences.backgroundOpacity,
    backgroundMode: preferences.backgroundMode,
  };

  try {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // 轻量偏好保存失败不应影响当前编辑和导出流程。
  }
}

function readTemplatePreferences(): TemplatePreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTemplatePreferences>;

    return {
      ...DEFAULT_TEMPLATE_PREFERENCES,
      ...parsed,
      avatarCrop: {
        ...DEFAULT_TEMPLATE_PREFERENCES.avatarCrop,
        ...parsed.avatarCrop,
      },
      avatarImage: null,
      backgroundImage: null,
    };
  } catch {
    return null;
  }
}

async function readTemplatePreferencesWithImages(): Promise<TemplatePreferences> {
  const preferences = readTemplatePreferences() ?? createDefaultTemplatePreferences();
  const [avatarImage, backgroundImage] = await Promise.all([
    getTemplateImage("avatarImage"),
    getTemplateImage("backgroundImage"),
  ]);

  return {
    ...preferences,
    avatarImage,
    backgroundImage,
  };
}

async function persistProjectTemplatePreferences(preferences: TemplatePreferences) {
  persistTemplatePreferences(preferences);
  await Promise.all([
    setTemplateImage("avatarImage", preferences.avatarImage),
    setTemplateImage("backgroundImage", preferences.backgroundImage),
  ]);
}

function updateTemplatePreferences(
  preferences: TemplatePreferences,
  patch: Partial<TemplatePreferences>
) {
  const next = { ...preferences, ...patch };
  persistTemplatePreferences(next);
  return next;
}

function persistDraftResume(resume: FinalResume) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(resume));
  } catch {
    // 草稿自动保存失败不影响当前编辑和导出。
  }
}

function readDraftResume(): FinalResume | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FinalResume;
    if (!parsed.personalInfo || !Array.isArray(parsed.workExperience)) return null;
    return cloneResume(parsed);
  } catch {
    return null;
  }
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  userInput: defaultUserInput,
  currentStep: "input",
  flowMode: "optimize",
  isAnalyzing: false,
  analysisResult: null,
  draftResume: null,
  analysisError: null,
  aiMode: null,
  optimizeStyle: "ai-product",
  copied: false,
  templatePreferences: createDefaultTemplatePreferences(),
  templateConfirmed: false,
  activeProjectId: null,
  activeProjectTitle: null,
  activeProjectCreatedAt: null,
  saveStatus: "idle",
  saveError: null,
  lastSavedAt: null,
  workspaceHydrated: false,
  historyRevision: 0,

  setUserInput: (input) =>
    set((state) => ({
      userInput: { ...state.userInput, ...input },
    })),

  loadExampleData: () =>
    set({
      userInput: {
        targetRole: "AI 产品经理",
        industry: "企业服务 / SaaS / AI",
        companyType: "中型公司",
        jobStage: "转行",
        highlightSkills: "AI 产品规划、Prompt 设计、数据驱动、ToB 需求分析、跨团队协作",
        jobDescription: `【岗位职责】
1. 负责 AI 功能的产品规划与迭代，包括智能问答、文档理解、工作流自动化等模块
2. 深入理解 B 端客户业务场景，将 AI 能力转化为可落地的产品方案
3. 与算法、工程团队协作，推动 AI 功能从 POC 到规模化上线
4. 建立 AI 产品效果评估体系，通过数据驱动持续优化
5. 跟踪 AI 行业趋势，输出竞品分析与产品策略

【任职要求】
1. 3年以上产品经理经验，有 ToB SaaS 或企业服务产品经验
2. 了解 LLM 基本原理，有 AI 产品或智能化功能落地经验者优先
3. 具备优秀的需求分析和逻辑思维能力，能将复杂业务抽象为产品方案
4. 有数据报表、ERP/WMS 等系统产品经验者优先
5. 良好的跨部门沟通能力和项目管理能力
6. 本科及以上学历，计算机或相关专业优先`,
        originalResume: `张明 | 产品经理 | 3.5年经验

【个人信息】
电话：138****5678 | 邮箱：zhangming@email.com | 上海

【职业摘要】
3.5年 B 端产品经理经验，主导 ERP 库存管理、WMS 仓储系统及经营数据报表平台的产品设计与迭代。擅长需求调研、流程梳理与跨部门协作，具备从 0 到 1 搭建数据产品的经验。

【工作经历】
某 SaaS 公司 | 产品经理 | 2021.06 - 至今
• 负责 WMS 仓储管理系统核心模块，服务 50+ 企业客户
• 主导库存盘点功能重构，盘点效率提升 40%
• 设计经营数据报表平台，支持 20+ 自定义报表模板
• 协调研发、测试、实施团队，按时交付 3 个 major 版本

某软件公司 | 产品助理 | 2020.07 - 2021.05
• 参与 ERP 采购模块需求分析与原型设计
• 编写 PRD 文档，跟进开发进度与 UAT 测试
• 收集客户反馈，优化订单审批流程

【项目经历】
经营数据报表平台 | 产品负责人 | 2022.03 - 2023.06
• 从 0 到 1 搭建 BI 报表平台，覆盖销售、库存、财务三大主题
• 设计拖拽式报表配置器，降低业务人员使用门槛
• 上线后月活用户 200+，报表生成效率提升 60%

WMS 智能补货 | 产品经理 | 2023.01 - 2023.09
• 基于历史销售数据设计补货策略模型
• 推动补货建议功能上线，缺货率下降 25%

【技能】
Axure、Figma、SQL、Jira、Confluence、数据分析

【教育】
某大学 | 信息管理与信息系统 | 本科 | 2016-2020`,
        additionalInfo: "最近自学了 Prompt Engineering 和 LangChain 基础，做过一个内部文档问答 Demo。希望突出数据产品背景和 ToB 经验，弱化纯执行类描述。",
      },
    }),

  setCurrentStep: (step) => set({ currentStep: step }),

  startDirectEditing: () => {
    const { userInput, draftResume, activeProjectId } = get();
    const nextDraft = userInput.originalResume.trim()
      ? createResumeDraftFromText(userInput.originalResume, userInput.targetRole)
      : draftResume;

    if (!nextDraft) return;
    if (!activeProjectId) persistDraftResume(nextDraft);
    set({
      flowMode: "direct",
      draftResume: nextDraft,
      currentStep: "final-resume",
      templateConfirmed: false,
    });
  },

  hydrateDraftResume: () => {
    const stored = readDraftResume();
    if (stored) {
      set((state) => ({ draftResume: state.draftResume ?? stored }));
    }
  },

  updateDraftResume: (updater) =>
    set((state) => {
      if (!state.draftResume) return state;
      const nextDraft = updater(cloneResume(state.draftResume));
      if (!state.activeProjectId) persistDraftResume(nextDraft);
      return { draftResume: nextDraft, templateConfirmed: false };
    }),

  setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),

  setAnalysisResult: (result) =>
    set((state) => {
      const shouldInitializeDraft = state.currentStep === "input" || !state.draftResume;
      const draftResume = shouldInitializeDraft ? cloneResume(result.finalResume) : state.draftResume;
      if (shouldInitializeDraft && draftResume && !state.activeProjectId) {
        persistDraftResume(draftResume);
      }
      return {
        analysisResult: result,
        analysisError: null,
        draftResume,
        flowMode: shouldInitializeDraft ? "optimize" : state.flowMode,
        templateConfirmed: shouldInitializeDraft ? false : state.templateConfirmed,
      };
    }),

  setAnalysisError: (error) => set({ analysisError: error }),

  setAiMode: (mode) => set({ aiMode: mode }),

  setOptimizeStyle: (style) => set({ optimizeStyle: style }),

  updateFollowUpAnswer: (id, answer) =>
    set((state) => {
      if (!state.analysisResult) return state;
      return {
        analysisResult: {
          ...state.analysisResult,
          followUpQuestions: state.analysisResult.followUpQuestions.map((q) =>
            q.id === id ? { ...q, userAnswer: answer } : q
          ),
        },
      };
    }),

  setFollowUpBullet: (id, bullet) =>
    set((state) => {
      if (!state.analysisResult) return state;
      return {
        analysisResult: {
          ...state.analysisResult,
          followUpQuestions: state.analysisResult.followUpQuestions.map((q) =>
            q.id === id ? { ...q, generatedBullet: bullet } : q
          ),
        },
      };
    }),

  getStepStatus: (step) => {
    const { currentStep, flowMode, analysisResult, draftResume, templateConfirmed } = get();
    const activeSteps = flowMode === "direct" ? DIRECT_STEPS : STEPS;
    if (!activeSteps.includes(step)) return "disabled";

    const stepIndex = activeSteps.indexOf(step);
    const currentIndex = activeSteps.indexOf(currentStep);

    if (step === "input") {
      if (currentStep === "input") return "active";
      return analysisResult || draftResume ? "completed" : "pending";
    }

    if (flowMode === "direct" && !draftResume) return "disabled";
    if (flowMode === "optimize" && !analysisResult) return "disabled";
    if (step === "export" && !templateConfirmed) return "disabled";

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  },

  setCopied: (copied) => set({ copied }),

  hydrateWorkspace: async () => {
    if (get().workspaceHydrated) return;

    try {
      const activeProjectId = readActiveProjectId();
      if (activeProjectId) {
        const project = await getResumeProject(activeProjectId);
        if (project) {
          const draftResume = project.draftResume
            ? cloneResume(project.draftResume, project.userInput.originalResume)
            : null;
          const analysisResult = project.analysisResult
            ? {
                ...project.analysisResult,
                finalResume: cloneResume(
                  project.analysisResult.finalResume,
                  project.userInput.originalResume
                ),
              }
            : null;
          await persistProjectTemplatePreferences(project.templatePreferences);
          clearLegacyDraftResume();
          set({
            userInput: project.userInput,
            currentStep: project.currentStep,
            flowMode: project.flowMode,
            isAnalyzing: false,
            analysisResult,
            draftResume,
            analysisError: null,
            optimizeStyle: project.optimizeStyle,
            copied: false,
            templatePreferences: project.templatePreferences,
            templateConfirmed: project.templateConfirmed,
            activeProjectId: project.id,
            activeProjectTitle: project.title,
            activeProjectCreatedAt: project.createdAt,
            saveStatus: "saved",
            saveError: null,
            lastSavedAt: project.updatedAt,
            workspaceHydrated: true,
          });
          return;
        }
        persistActiveProjectId(null);
      }

      const [legacyDraft, templatePreferences] = await Promise.all([
        Promise.resolve(readDraftResume()),
        readTemplatePreferencesWithImages(),
      ]);

      if (!legacyDraft) {
        set({ templatePreferences, workspaceHydrated: true });
        return;
      }

      const now = new Date().toISOString();
      const userInput = createDefaultUserInput();
      const project: ResumeProject = {
        schemaVersion: 1,
        id: LEGACY_PROJECT_ID,
        title: getProjectTitle(legacyDraft, userInput, "上次编辑的简历"),
        createdAt: now,
        updatedAt: now,
        currentStep: "final-resume",
        flowMode: "direct",
        userInput,
        analysisResult: null,
        draftResume: legacyDraft,
        optimizeStyle: "ai-product",
        templatePreferences,
        templateConfirmed: false,
      };

      await putResumeProject(project);
      persistActiveProjectId(project.id);
      clearLegacyDraftResume();
      set((state) => ({
        draftResume: legacyDraft,
        currentStep: "final-resume",
        flowMode: "direct",
        templatePreferences,
        activeProjectId: project.id,
        activeProjectTitle: project.title,
        activeProjectCreatedAt: project.createdAt,
        saveStatus: "saved",
        lastSavedAt: project.updatedAt,
        workspaceHydrated: true,
        historyRevision: state.historyRevision + 1,
      }));
    } catch (error) {
      set({
        draftResume: readDraftResume(),
        workspaceHydrated: true,
        saveStatus: "error",
        saveError: error instanceof Error ? error.message : "本地历史记录读取失败",
      });
    }
  },

  hydrateTemplatePreferences: () => {
    if (get().activeProjectId) return;
    const stored = readTemplatePreferences();
    if (stored) {
      set({ templatePreferences: stored });
    }

    Promise.all([getTemplateImage("avatarImage"), getTemplateImage("backgroundImage")]).then(
      ([avatarImage, backgroundImage]) => {
        set((state) => ({
          templatePreferences: {
            ...state.templatePreferences,
            avatarImage,
            backgroundImage,
          },
        }));
      }
    );
  },

  setSelectedTemplate: (templateId) =>
    set((state) => ({
      templateConfirmed: false,
      templatePreferences: updateTemplatePreferences(state.templatePreferences, {
        selectedTemplateId: templateId,
        accentColor: getTemplateDefaultColor(templateId),
      }),
    })),

  setAccentColor: (color) =>
    set((state) => ({
      templateConfirmed: false,
      templatePreferences: updateTemplatePreferences(state.templatePreferences, {
        accentColor: color,
      }),
    })),

  setAvatarImage: (image) => {
    void setTemplateImage("avatarImage", image);
    set((state) => ({
      templateConfirmed: false,
      templatePreferences: updateTemplatePreferences(state.templatePreferences, {
        avatarImage: image,
        avatarCrop: { ...DEFAULT_TEMPLATE_PREFERENCES.avatarCrop },
      }),
    }));
  },

  setAvatarCrop: (crop) =>
    set((state) => ({
      templateConfirmed: false,
      templatePreferences: updateTemplatePreferences(state.templatePreferences, {
        avatarCrop: {
          ...state.templatePreferences.avatarCrop,
          ...crop,
        },
      }),
    })),

  setBackgroundImage: (image) => {
    void setTemplateImage("backgroundImage", image);
    set((state) => ({
      templateConfirmed: false,
      templatePreferences: updateTemplatePreferences(state.templatePreferences, {
        backgroundImage: image,
      }),
    }));
  },

  setBackgroundOpacity: (opacity) =>
    set((state) => ({
      templateConfirmed: false,
      templatePreferences: updateTemplatePreferences(state.templatePreferences, {
        backgroundOpacity: opacity,
      }),
    })),

  setBackgroundMode: (mode) =>
    set((state) => ({
      templateConfirmed: false,
      templatePreferences: updateTemplatePreferences(state.templatePreferences, {
        backgroundMode: mode,
      }),
    })),

  confirmTemplate: () => set({ templateConfirmed: true }),

  markProjectDirty: () => {
    const { activeProjectId, workspaceHydrated, saveStatus } = get();
    if (!activeProjectId || !workspaceHydrated || saveStatus === "saving") return;
    set({ saveStatus: "idle", saveError: null });
  },

  saveCurrentProject: async (title) => {
    const state = get();
    const hasContent = Boolean(
      state.draftResume ||
        state.analysisResult ||
        state.userInput.originalResume.trim() ||
        state.userInput.jobDescription.trim()
    );
    if (!hasContent) return false;

    const now = new Date().toISOString();
    const id = state.activeProjectId ?? createProjectId();
    const resolvedTitle =
      title?.trim() ||
      state.activeProjectTitle ||
      getProjectTitle(state.draftResume, state.userInput);
    const project: ResumeProject = {
      schemaVersion: 1,
      id,
      title: resolvedTitle,
      createdAt: state.activeProjectCreatedAt ?? now,
      updatedAt: now,
      currentStep: state.currentStep,
      flowMode: state.flowMode,
      userInput: state.userInput,
      analysisResult: state.analysisResult,
      draftResume: state.draftResume,
      optimizeStyle: state.optimizeStyle,
      templatePreferences: state.templatePreferences,
      templateConfirmed: state.templateConfirmed,
    };

    set({ saveStatus: "saving", saveError: null });
    try {
      await putResumeProject(project);

      const currentActiveId = get().activeProjectId;
      if (
        (state.activeProjectId && currentActiveId !== state.activeProjectId) ||
        (!state.activeProjectId && currentActiveId)
      ) {
        return true;
      }

      persistActiveProjectId(project.id);
      clearLegacyDraftResume();
      set((current) => ({
        activeProjectId: project.id,
        activeProjectTitle: project.title,
        activeProjectCreatedAt: project.createdAt,
        saveStatus: "saved",
        saveError: null,
        lastSavedAt: project.updatedAt,
        historyRevision: current.historyRevision + 1,
      }));
      return true;
    } catch (error) {
      set({
        saveStatus: "error",
        saveError: error instanceof Error ? error.message : "简历保存失败",
      });
      return false;
    }
  },

  loadResumeProject: async (id) => {
    set({ saveStatus: "saving", saveError: null });
    try {
      const project = await getResumeProject(id);
      if (!project) throw new Error("未找到这份历史简历");

      const draftResume = project.draftResume
        ? cloneResume(project.draftResume, project.userInput.originalResume)
        : null;
      const analysisResult = project.analysisResult
        ? {
            ...project.analysisResult,
            finalResume: cloneResume(
              project.analysisResult.finalResume,
              project.userInput.originalResume
            ),
          }
        : null;

      await persistProjectTemplatePreferences(project.templatePreferences);
      persistActiveProjectId(project.id);
      clearLegacyDraftResume();
      set({
        userInput: project.userInput,
        currentStep: project.currentStep,
        flowMode: project.flowMode,
        isAnalyzing: false,
        analysisResult,
        draftResume,
        analysisError: null,
        optimizeStyle: project.optimizeStyle,
        copied: false,
        templatePreferences: project.templatePreferences,
        templateConfirmed: project.templateConfirmed,
        activeProjectId: project.id,
        activeProjectTitle: project.title,
        activeProjectCreatedAt: project.createdAt,
        saveStatus: "saved",
        saveError: null,
        lastSavedAt: project.updatedAt,
      });
      return true;
    } catch (error) {
      set({
        saveStatus: "error",
        saveError: error instanceof Error ? error.message : "历史简历载入失败",
      });
      return false;
    }
  },

  renameResumeProject: async (id, title) => {
    const nextTitle = title.trim();
    if (!nextTitle) return false;

    try {
      const project = await getResumeProject(id);
      if (!project) throw new Error("未找到这份历史简历");
      const updatedAt = new Date().toISOString();
      await putResumeProject({ ...project, title: nextTitle, updatedAt });
      set((state) => ({
        activeProjectTitle: state.activeProjectId === id ? nextTitle : state.activeProjectTitle,
        lastSavedAt: state.activeProjectId === id ? updatedAt : state.lastSavedAt,
        historyRevision: state.historyRevision + 1,
      }));
      return true;
    } catch (error) {
      set({ saveError: error instanceof Error ? error.message : "重命名失败" });
      return false;
    }
  },

  duplicateResumeProject: async (id) => {
    try {
      const project = await getResumeProject(id);
      if (!project) throw new Error("未找到这份历史简历");
      const now = new Date().toISOString();
      await putResumeProject({
        ...project,
        id: createProjectId(),
        title: `${project.title} 副本`,
        createdAt: now,
        updatedAt: now,
      });
      set((state) => ({ historyRevision: state.historyRevision + 1 }));
      return true;
    } catch (error) {
      set({ saveError: error instanceof Error ? error.message : "复制失败" });
      return false;
    }
  },

  deleteResumeProject: async (id) => {
    try {
      await removeResumeProject(id);
      const isActive = get().activeProjectId === id;
      if (isActive) {
        await get().createNewResumeProject();
      }
      set((state) => ({ historyRevision: state.historyRevision + 1 }));
      return true;
    } catch (error) {
      set({ saveError: error instanceof Error ? error.message : "删除失败" });
      return false;
    }
  },

  createNewResumeProject: async () => {
    const templatePreferences = createDefaultTemplatePreferences();
    persistActiveProjectId(null);
    clearLegacyDraftResume();
    await persistProjectTemplatePreferences(templatePreferences);
    set({
      userInput: createDefaultUserInput(),
      currentStep: "input",
      flowMode: "optimize",
      isAnalyzing: false,
      analysisResult: null,
      draftResume: null,
      analysisError: null,
      optimizeStyle: "ai-product",
      copied: false,
      templatePreferences,
      templateConfirmed: false,
      activeProjectId: null,
      activeProjectTitle: null,
      activeProjectCreatedAt: null,
      saveStatus: "idle",
      saveError: null,
      lastSavedAt: null,
      workspaceHydrated: true,
    });
  },
}));
