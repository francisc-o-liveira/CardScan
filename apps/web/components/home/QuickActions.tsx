import Link from "next/link";
import { ScanLine, Search, Layers, Compass, type LucideIcon } from "lucide-react";

interface QuickAction {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

/**
 * Four verbs, in the order a collector reaches for them. Icon plus label
 * always — an icon on its own makes the user guess.
 */
const ACTIONS: QuickAction[] = [
  { href: "/scan", label: "Scan cards", hint: "Identify with your camera", icon: ScanLine },
  { href: "/search", label: "Search cards", hint: "By name, set or number", icon: Search },
  { href: "/collection", label: "My collection", hint: "Everything you own", icon: Layers },
  { href: "/discover", label: "Discover", hint: "Browse sets and games", icon: Compass },
];

export function QuickActions() {
  return (
    <nav aria-label="Quick actions">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ACTIONS.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="group flex h-full min-h-[5.5rem] flex-col justify-between gap-3 rounded-panel border border-hairline bg-base-200 p-4 shadow-sheen transition-colors duration-fast hover:border-strong hover:bg-base-300"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-primary transition-colors duration-fast group-hover:bg-primary group-hover:text-primary-content">
                <action.icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              </span>
              <span>
                <span className="block text-body font-medium text-base-content">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-meta text-faint">{action.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
