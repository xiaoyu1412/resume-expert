import type {
  AnalysisResult,
  FinalResume,
  OptimizeStyle,
  ResumeFlowMode,
  StepId,
  UserInput,
} from "@/types/resume";
import type { TemplatePreferences } from "@/types/template";

export type ResumeProjectSaveStatus = "idle" | "saving" | "saved" | "error";

export interface ResumeProject {
  schemaVersion: 1;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  currentStep: StepId;
  flowMode: ResumeFlowMode;
  userInput: UserInput;
  analysisResult: AnalysisResult | null;
  draftResume: FinalResume | null;
  optimizeStyle: OptimizeStyle;
  templatePreferences: TemplatePreferences;
  templateConfirmed: boolean;
}
