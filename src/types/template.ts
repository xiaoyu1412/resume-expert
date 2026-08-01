export type ResumeTemplateId =
  | "classic-business"
  | "modern-minimal"
  | "tech-blue"
  | "creative-design"
  | "black-gold"
  | "deep-banner";

export type ResumeTemplateVariant =
  | "classic"
  | "modern"
  | "tech"
  | "creative"
  | "blackGold"
  | "deepBanner";

export type ResumeColumnLayout = "single" | "two-column";

export type AvatarShape = "circle" | "square";

export type AvatarPlacement = "header-right" | "sidebar" | "header-left" | "center";

export type BackgroundMode = "tile" | "center" | "stretch";

export interface AvatarCropSettings {
  zoom: number;
  positionX: number;
  positionY: number;
}

export interface ThemeColorOption {
  label: string;
  value: string;
}

export interface ResumeTemplateConfig {
  id: ResumeTemplateId;
  name: string;
  description: string;
  variant: ResumeTemplateVariant;
  defaultColor: string;
  colorOptions: ThemeColorOption[];
  fontFamily: string;
  headingFontFamily: string;
  columnLayout: ResumeColumnLayout;
  moduleOrder: string[];
  spacing: "compact" | "normal" | "airy";
  avatarShape: AvatarShape;
  avatarPlacement: AvatarPlacement;
  cardStyle: "none" | "subtle" | "strong";
  showContactIcons: boolean;
}

export interface TemplatePreferences {
  selectedTemplateId: ResumeTemplateId;
  accentColor: string;
  avatarImage: string | null;
  avatarCrop: AvatarCropSettings;
  backgroundImage: string | null;
  backgroundOpacity: number;
  backgroundMode: BackgroundMode;
}
