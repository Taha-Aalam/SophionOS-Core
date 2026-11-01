import type { ComponentType } from "react";

import {
  CircleCheckIcon,
  DownloadIcon,
  FolderOpenIcon,
  Link2Icon,
  MapPinIcon,
  RocketIcon,
  SquarePenIcon,
  SunIcon,
  UsersIcon,
  BrainIcon,
} from "@/components/icons";

import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "@/lib/services/user-settings.service";

export interface OnboardingStepMeta {
  step: OnboardingStep;
  title: string;
  subtitle: string;
  /** Animated glyph matching the feature's nav icon. */
  icon: ComponentType<{ className?: string; size?: number }>;
  /** Steps that create real data vs. value-explainer steps. */
  kind: "action" | "explainer";
}

export const ONBOARDING_STEP_META: Record<OnboardingStep, OnboardingStepMeta> = {
  areas: {
    step: "areas",
    title: "Your life areas",
    subtitle: "We seeded a starter set. Keep the ones that fit — you can edit later.",
    icon: MapPinIcon,
    kind: "action",
  },
  goal: {
    step: "goal",
    title: "Set your first goal",
    subtitle: "Something you want to make progress on. It anchors your projects and tasks.",
    icon: RocketIcon,
    kind: "action",
  },
  project: {
    step: "project",
    title: "Add a project",
    subtitle: "A concrete effort that moves your goal forward.",
    icon: FolderOpenIcon,
    kind: "action",
  },
  tasks: {
    step: "tasks",
    title: "Capture a few tasks",
    subtitle: "The next small actions. Add one to three to get rolling.",
    icon: CircleCheckIcon,
    kind: "action",
  },
  my_day: {
    step: "my_day",
    title: "My Day — your daily focus",
    subtitle: "A focused view of what matters today. Pin tasks, review priorities, and stay on track.",
    icon: SunIcon,
    kind: "explainer",
  },
  inbox: {
    step: "inbox",
    title: "Inbox — capture everything",
    subtitle: "Dump tasks, notes, and resources here. Process them later when you're ready.",
    icon: DownloadIcon,
    kind: "explainer",
  },
  knowledge: {
    step: "knowledge",
    title: "Knowledge — your second brain",
    subtitle: "Browse all your notes, resources, and contacts in one place, organised by topic.",
    icon: BrainIcon,
    kind: "explainer",
  },
  notes: {
    step: "notes",
    title: "Notes capture thinking",
    subtitle: "Draft ideas, journal, and research all live in Notes.",
    icon: SquarePenIcon,
    kind: "explainer",
  },
  resources: {
    step: "resources",
    title: "Resources hold references",
    subtitle: "Links, files, and materials you return to — organised by topic.",
    icon: Link2Icon,
    kind: "explainer",
  },
  contacts: {
    step: "contacts",
    title: "Contacts keep people close",
    subtitle: "Track the people who matter and your follow-ups with them.",
    icon: UsersIcon,
    kind: "explainer",
  },
};

export const ONBOARDING_STEP_LIST: OnboardingStepMeta[] = ONBOARDING_STEPS.map(
  (step) => ONBOARDING_STEP_META[step],
);
