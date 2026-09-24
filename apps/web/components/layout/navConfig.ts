import {
  Home,
  Layers,
  ScanLine,
  Compass,
  Crown,
  UserRound,
  Heart,
  History,
  Settings,
  HelpCircle,
  Swords,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * The five destinations that define the product's mental model. Identical on
 * mobile (bottom bar) and desktop (top bar) so nothing has to be relearned
 * between the two.
 *
 * Everything else — wishlist, decks, scan history, help — is reachable from
 * Profile. A feature existing is not a reason to spend a nav slot on it.
 */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/profile", label: "Profile", icon: UserRound },
];

/** Desktop top bar omits Profile — the avatar menu covers it. */
export const DESKTOP_NAV = PRIMARY_NAV.filter((item) => item.href !== "/profile");

/** Secondary destinations, surfaced from the Profile screen and avatar menu. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/premium", label: "Premium", icon: Crown },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/decks", label: "Decks", icon: Swords },
  { href: "/scan-history", label: "Scan History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
];

/** Treats `/cards/123` as part of Discover so the nav highlight stays put. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/discover") {
    return pathname.startsWith("/discover") || pathname.startsWith("/cards");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
