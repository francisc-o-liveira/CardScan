import {
  LayoutDashboard,
  ScanLine,
  Layers,
  Heart,
  Swords,
  Database,
  History,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan Card", icon: ScanLine },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/decks", label: "Decks", icon: Swords },
  { href: "/cards", label: "Card Database", icon: Database },
  { href: "/scan-history", label: "Scan History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/settings", label: "Profile", icon: Settings },
];
