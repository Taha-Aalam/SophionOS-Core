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


import { isActiveNavigationPath } from "@/lib/auth/auth-routing";

const coreNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGridIcon },
  { href: "/areas", label: "Areas", icon: MapPinIcon },
  { href: "/goals", label: "Goals", icon: RocketIcon },
  { href: "/projects", label: "Projects", icon: FolderOpenIcon },
  { href: "/tasks", label: "Tasks", icon: CircleCheckIcon },
  { href: "/notes", label: "Notes", icon: SquarePenIcon },
  { href: "/resources", label: "Resources", icon: Link2Icon },
  { href: "/topics", label: "Topics", icon: LayersIcon },
  { href: "/contacts", label: "Contacts", icon: UsersIcon },
] as const;

const systemNavItems = [
  { href: "/my-day", label: "My Day", icon: SunIcon },
  { href: "/inbox", label: "Inbox", icon: DownloadIcon },
  { href: "/knowledge", label: "Knowledge Hub", icon: BrainIcon },
] as const;

// System-level policy pages. These are NOT app navigation: they appear only
// while you are already inside the policy pages (the sidebar swaps to a
// Policies-only mode there), plus the profile dropdown and the sign-in page.
// Icons match each page's own header icon, like every other nav item.
const trustNavItems = [
  { href: "/terms", label: "Terms", icon: FileTextIcon },
  { href: "/privacy", label: "Privacy", icon: LockIcon },
  { href: "/security", label: "Security", icon: ShieldCheckIcon },
  { href: "/subprocessors", label: "Subprocessors", icon: BriefcaseBusinessIcon },
  { href: "/data-and-ai", label: "Data & AI", icon: SparklesIcon },
  { href: "/responsible-disclosure", label: "Responsible Disclosure", icon: GavelIcon },
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
