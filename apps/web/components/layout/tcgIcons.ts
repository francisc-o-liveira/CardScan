import {
  Zap,
  Wand2,
  Eye,
  Sparkles,
  Anchor,
  Cpu,
  Rocket,
  Droplet,
  type LucideIcon,
} from "lucide-react";
import type { TcgSlug } from "@cardscan/types";

/** Themed icon per TCG, used where a real licensed logo isn't available. */
export const TCG_ICONS: Record<TcgSlug, LucideIcon> = {
  pokemon: Zap,
  magic: Wand2,
  yugioh: Eye,
  lorcana: Sparkles,
  onepiece: Anchor,
  digimon: Cpu,
  starwars: Rocket,
  fab: Droplet,
};
