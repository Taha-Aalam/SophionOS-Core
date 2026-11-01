import {
  Folder,
  Inbox,
  Library,
  Link2,
  Map,
  NotebookPen,
  SquareCheck,
  Sun,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "@/lib/services/user-settings.service";

export interface OnboardingStepMeta {
  step: OnboardingStep;
  title: string;
  subtitle: string;
  /** Lucide glyph matching the feature's nav icon. */
  icon: LucideIcon;
  /** Steps that create real data vs. value-explainer steps. */
  kind: "action" | "explainer";
}

export const ONBOARDING_STEP_META: Record<OnboardingStep, OnboardingStepMeta> = {
  areas: {
    step: "areas",
    title: "Your life areas",
    subtitle: "We seeded a starter set. Keep the ones that fit — you can edit later.",
    icon: Map,
    kind: "action",
  },
  goal: {
    step: "goal",
    title: "Set your first goal",
    subtitle: "Something you want to make progress on. It anchors your projects and tasks.",
    icon: Target,
    kind: "action",
  },
  project: {
    step: "project",
    title: "Add a project",
    subtitle: "A concrete effort that moves your goal forward.",
    icon: Folder,
    kind: "action",
  },
  tasks: {
    step: "tasks",
    title: "Capture a few tasks",
    subtitle: "The next small actions. Add one to three to get rolling.",
    icon: SquareCheck,
    kind: "action",
  },
  my_day: {
    step: "my_day",
    title: "My Day — your daily focus",
    subtitle: "A focused view of what matters today. Pin tasks, review priorities, and stay on track.",
    icon: Sun,
    kind: "explainer",
  },
  inbox: {
    step: "inbox",
    title: "Inbox — capture everything",
    subtitle: "Dump tasks, notes, and resources here. Process them later when you're ready.",
    icon: Inbox,
    kind: "explainer",
  },
  knowledge: {
    step: "knowledge",
    title: "Knowledge — your second brain",
    subtitle: "Browse all your notes, resources, and contacts in one place, organised by topic.",
    icon: Library,
    kind: "explainer",
  },
  notes: {
    step: "notes",
    title: "Notes capture thinking",
    subtitle: "Draft ideas, journal, and research all live in Notes.",
    icon: NotebookPen,
    kind: "explainer",
  },
  resources: {
    step: "resources",
    title: "Resources hold references",
    subtitle: "Links, files, and materials you return to — organised by topic.",
    icon: Link2,
    kind: "explainer",
  },
  contacts: {
    step: "contacts",
    title: "Contacts keep people close",
    subtitle: "Track the people who matter and your follow-ups with them.",
    icon: Users,
    kind: "explainer",
  },
};

export const ONBOARDING_STEP_LIST: OnboardingStepMeta[] = ONBOARDING_STEPS.map(
  (step) => ONBOARDING_STEP_META[step],
);
