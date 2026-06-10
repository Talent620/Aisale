import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Megaphone,
  Sparkles,
  LibraryBig,
  CheckSquare,
  BadgeCheck,
  BarChart3,
  Bot,
  Settings,
  Magnet,
  Radar,
  PhoneCall,
  Share2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Praca",
    items: [
      { label: "Kokpit", href: "/dashboard", icon: LayoutDashboard },
      { label: "Leady", href: "/leads", icon: Users },
      { label: "Lejek", href: "/pipeline", icon: KanbanSquare },
      { label: "Telefony", href: "/calls", icon: PhoneCall },
      { label: "Zadania", href: "/tasks", icon: CheckSquare },
    ],
  },
  {
    heading: "Pozyskiwanie",
    items: [
      { label: "Szukaj firm", href: "/prospecting", icon: Radar },
      { label: "Autopilot", href: "/acquisition", icon: Magnet },
      { label: "Social Studio", href: "/social", icon: Share2 },
      { label: "Kampanie", href: "/campaigns", icon: Megaphone },
      { label: "Generator", href: "/generator", icon: Sparkles },
      { label: "Szablony", href: "/templates", icon: LibraryBig },
      { label: "Akceptacje", href: "/approvals", icon: BadgeCheck },
    ],
  },
  {
    heading: "Analiza",
    items: [
      { label: "Analityka", href: "/analytics", icon: BarChart3 },
      { label: "Copilot AI", href: "/copilot", icon: Bot },
      { label: "Ustawienia", href: "/settings", icon: Settings },
    ],
  },
];

export const NAV_FLAT: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
