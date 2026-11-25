import {
  BrainIcon,
  BriefcaseBusinessIcon,
  CircleCheckIcon,
  DownloadIcon,
  FileTextIcon,
  FolderOpenIcon,
  GavelIcon,
  LayersIcon,
  LayoutGridIcon,
  Link2Icon,
  LockIcon,
  MapPinIcon,
  RocketIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SquarePenIcon,
  SunIcon,
  UsersIcon,
} from "@/components/icons";

import type { ElementType } from "react";

import { isActiveNavigationPath } from "@/lib/auth/auth-routing";
import en, { type TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Navigation structure. Items deliberately carry a dictionary *key*, never a
 * display label: the visible name comes from the active locale at render time,
 * which is what lets the shell re-render in another language without touching
 * routes, hrefs, or internal identifiers. `navigation-label-guard` fails the
 * build if a display string is added back here.
 */
export interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: ElementType;
}

const coreNavItems: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutGridIcon },
  { href: "/areas", labelKey: "nav.areas", icon: MapPinIcon },
  { href: "/goals", labelKey: "nav.goals", icon: RocketIcon },
  { href: "/projects", labelKey: "nav.projects", icon: FolderOpenIcon },
  { href: "/tasks", labelKey: "nav.tasks", icon: CircleCheckIcon },
  { href: "/notes", labelKey: "nav.notes", icon: SquarePenIcon },
  { href: "/resources", labelKey: "nav.resources", icon: Link2Icon },
  { href: "/topics", labelKey: "nav.topics", icon: LayersIcon },
  { href: "/contacts", labelKey: "nav.contacts", icon: UsersIcon },
];

const systemNavItems: NavItem[] = [
  { href: "/my-day", labelKey: "nav.myDay", icon: SunIcon },
  { href: "/inbox", labelKey: "nav.inbox", icon: DownloadIcon },
  { href: "/knowledge", labelKey: "nav.knowledgeHub", icon: BrainIcon },
];

// System-level policy pages. These are NOT app navigation: they appear only
// while you are already inside the policy pages (the sidebar swaps to a
// Policies-only mode there), plus the profile dropdown and the sign-in page.
// Icons match each page's own header icon, like every other nav item.
const trustNavItems: NavItem[] = [
  { href: "/terms", labelKey: "legal.terms", icon: FileTextIcon },
  { href: "/privacy", labelKey: "legal.privacy", icon: LockIcon },
  { href: "/security", labelKey: "legal.security", icon: ShieldCheckIcon },
  { href: "/subprocessors", labelKey: "legal.subprocessors", icon: BriefcaseBusinessIcon },
  { href: "/data-and-ai", labelKey: "legal.dataAndAi", icon: SparklesIcon },
  {
    href: "/responsible-disclosure",
    labelKey: "legal.responsibleDisclosure",
    icon: GavelIcon,
  },
];

/** True when `pathname` is one of the policy pages (a trustNavItems href). */
function isPolicyPath(pathname: string): boolean {
  return trustNavItems.some((item) => isActiveNavigationPath(pathname, item.href));
}

/** URL segment → dictionary key for the topbar breadcrumb. */
export const breadcrumbLabelKeys: Record<string, TranslationKey> = {
  areas: "nav.areas",
  contacts: "nav.contacts",
  dashboard: "nav.dashboard",
  "data-and-ai": "legal.dataAndAi",
  "forgot-password": "page.forgotPassword",
  goals: "nav.goals",
  inbox: "nav.inbox",
  knowledge: "nav.knowledgeHub",
  login: "page.login",
  "my-day": "nav.myDay",
  notes: "nav.notes",
  privacy: "legal.privacy",
  projects: "nav.projects",
  "reset-password": "page.resetPassword",
  resources: "nav.resources",
  "responsible-disclosure": "legal.responsibleDisclosure",
  security: "legal.security",
  settings: "nav.settings",
  signup: "page.signUp",
  subprocessors: "legal.subprocessors",
  tasks: "nav.tasks",
  terms: "legal.terms",
  topics: "nav.topics",
};

/**
 * English label for a breadcrumb segment. Non-React consumers (the bug-report
 * builder, tests, metadata) use this; the UI itself translates the key via
 * `useI18n()`. The values come from the dictionary, so this map holds no
 * display literals of its own.
 */
const breadcrumbLabels: Record<string, string> = Object.fromEntries(
  Object.entries(breadcrumbLabelKeys).map(([segment, key]) => [segment, en[key]]),
);

export {
  breadcrumbLabels,
  coreNavItems,
  isPolicyPath,
  systemNavItems,
  trustNavItems,
};
