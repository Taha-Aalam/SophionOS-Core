import {
  CheckSquare,
  FolderKanban,
  Globe,
  Inbox,
  LayoutDashboard,
  Library,
  Map,
  NotebookPen,
  Sun,
  Tag,
  Target,
  Users,
} from "lucide-react";

const coreNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/areas", label: "Areas", icon: Map },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/resources", label: "Resources", icon: Globe },
  { href: "/topics", label: "Topics", icon: Tag },
  { href: "/contacts", label: "Contacts", icon: Users },
] as const;

const systemNavItems = [
  { href: "/my-day", label: "My Day", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/knowledge", label: "Knowledge Hub", icon: Library },
] as const;

const breadcrumbLabels: Record<string, string> = {
  areas: "Areas",
  contacts: "Contacts",
  dashboard: "Dashboard",
  "forgot-password": "Forgot Password",
  goals: "Goals",
  inbox: "Inbox",
  knowledge: "Knowledge Hub",
  login: "Login",
  "my-day": "My Day",
  notes: "Notes",
  projects: "Projects",
  "reset-password": "Reset Password",
  resources: "Resources",
  settings: "Settings",
  signup: "Sign Up",
  tasks: "Tasks",
  topics: "Topics",
};

export { breadcrumbLabels, coreNavItems, systemNavItems };
