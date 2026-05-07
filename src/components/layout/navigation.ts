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
  Target,
  Users,
} from "lucide-react";

const coreNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/areas", label: "Areas", icon: Map },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/resources", label: "Resources", icon: Globe },
  { href: "/contacts", label: "Contacts", icon: Users },
] as const;

const systemNavItems = [
  { href: "/knowledge", label: "Knowledge Hub", icon: Library },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/my-day", label: "My Day", icon: Sun },
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
};

const trackerSectionMessage = "Trackers return in later restoration batches.";

export { breadcrumbLabels, coreNavItems, systemNavItems, trackerSectionMessage };
