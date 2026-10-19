import { AreaEmoji } from "@/components/layout/area-emoji";
import { ContactsEmoji } from "@/components/layout/contacts-emoji";
import { DataAndAiEmoji } from "@/components/layout/data-and-ai-emoji";
import { DashboardEmoji } from "@/components/layout/dashboard-emoji";
import { GoalEmoji } from "@/components/layout/goal-emoji";
import { InboxTrayEmoji } from "@/components/layout/inbox-tray-emoji";
import { KnowledgeEmoji } from "@/components/layout/knowledge-emoji";
import { MyDayEmoji } from "@/components/layout/my-day-emoji";
import { NoteEmoji } from "@/components/layout/note-emoji";
import { PrivacyPolicyEmoji } from "@/components/layout/privacy-policy-emoji";
import { ProjectEmoji } from "@/components/layout/project-emoji";
import { ResponsibleDisclosureEmoji } from "@/components/layout/responsible-disclosure-emoji";
import { ResourceEmoji } from "@/components/layout/resource-emoji";
import { SecurityEmoji } from "@/components/layout/security-emoji";
import { SubprocessorsEmoji } from "@/components/layout/subprocessors-emoji";
import { TagEmoji } from "@/components/layout/tag-emoji";
import { TaskEmoji } from "@/components/layout/task-emoji";
import { TermsEmoji } from "@/components/layout/terms-emoji";
import { isActiveNavigationPath } from "@/lib/auth/auth-routing";

const coreNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardEmoji },
  { href: "/areas", label: "Areas", icon: AreaEmoji },
  { href: "/goals", label: "Goals", icon: GoalEmoji },
  { href: "/projects", label: "Projects", icon: ProjectEmoji },
  { href: "/tasks", label: "Tasks", icon: TaskEmoji },
  { href: "/notes", label: "Notes", icon: NoteEmoji },
  { href: "/resources", label: "Resources", icon: ResourceEmoji },
  { href: "/topics", label: "Topics", icon: TagEmoji },
  { href: "/contacts", label: "Contacts", icon: ContactsEmoji },
] as const;

const systemNavItems = [
  { href: "/my-day", label: "My Day", icon: MyDayEmoji },
  { href: "/inbox", label: "Inbox", icon: InboxTrayEmoji },
  { href: "/knowledge", label: "Knowledge Hub", icon: KnowledgeEmoji },
] as const;

// System-level policy pages. These are NOT app navigation: they appear only
// while you are already inside the policy pages (the sidebar swaps to a
// Policies-only mode there), plus the profile dropdown and the sign-in page.
// Emoji icons match each page's own header emoji, like every other nav item.
const trustNavItems = [
  { href: "/terms", label: "Terms", icon: TermsEmoji },
  { href: "/privacy", label: "Privacy", icon: PrivacyPolicyEmoji },
  { href: "/security", label: "Security", icon: SecurityEmoji },
  { href: "/subprocessors", label: "Subprocessors", icon: SubprocessorsEmoji },
  { href: "/data-and-ai", label: "Data & AI", icon: DataAndAiEmoji },
  { href: "/responsible-disclosure", label: "Responsible Disclosure", icon: ResponsibleDisclosureEmoji },
] as const;

/** True when `pathname` is one of the policy pages (a trustNavItems href). */
function isPolicyPath(pathname: string): boolean {
  return trustNavItems.some((item) => isActiveNavigationPath(pathname, item.href));
}

const breadcrumbLabels: Record<string, string> = {
  areas: "Areas",
  contacts: "Contacts",
  dashboard: "Dashboard",
  "data-and-ai": "Data & AI",
  "forgot-password": "Forgot Password",
  goals: "Goals",
  inbox: "Inbox",
  knowledge: "Knowledge Hub",
  login: "Login",
  "my-day": "My Day",
  notes: "Notes",
  privacy: "Privacy",
  projects: "Projects",
  "reset-password": "Reset Password",
  resources: "Resources",
  "responsible-disclosure": "Responsible Disclosure",
  security: "Security",
  settings: "Settings",
  signup: "Sign Up",
  subprocessors: "Subprocessors",
  tasks: "Tasks",
  terms: "Terms",
  topics: "Topics",
};

export { breadcrumbLabels, coreNavItems, isPolicyPath, systemNavItems, trustNavItems };
