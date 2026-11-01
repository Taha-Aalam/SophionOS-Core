import {
  Bug,
  Building2,
  Folder,
  Inbox,
  LayoutDashboard,
  Library,
  Link2,
  Lock,
  Map,
  NotebookPen,
  ScrollText,
  ShieldCheck,
  Sparkles,
  SquareCheck,
  Sun,
  Tag,
  Target,
  Users,
} from "lucide-react";

import { isActiveNavigationPath } from "@/lib/auth/auth-routing";

const coreNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/areas", label: "Areas", icon: Map },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/tasks", label: "Tasks", icon: SquareCheck },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/resources", label: "Resources", icon: Link2 },
  { href: "/topics", label: "Topics", icon: Tag },
  { href: "/contacts", label: "Contacts", icon: Users },
] as const;

const systemNavItems = [
  { href: "/my-day", label: "My Day", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/knowledge", label: "Knowledge Hub", icon: Library },
] as const;

// System-level policy pages. These are NOT app navigation: they appear only
// while you are already inside the policy pages (the sidebar swaps to a
// Policies-only mode there), plus the profile dropdown and the sign-in page.
// Icons match each page's own header icon, like every other nav item.
const trustNavItems = [
  { href: "/terms", label: "Terms", icon: ScrollText },
  { href: "/privacy", label: "Privacy", icon: Lock },
  { href: "/security", label: "Security", icon: ShieldCheck },
  { href: "/subprocessors", label: "Subprocessors", icon: Building2 },
  { href: "/data-and-ai", label: "Data & AI", icon: Sparkles },
  { href: "/responsible-disclosure", label: "Responsible Disclosure", icon: Bug },
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
