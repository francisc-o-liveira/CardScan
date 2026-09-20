import { redirect } from "next/navigation";

/**
 * The card browser lives at /search, which does everything this page used to
 * and more (filters, sorting, set scoping). Kept as a redirect so existing
 * links — and the mobile app's Card Database route — still land somewhere.
 */
export default function CardsPage() {
  redirect("/search");
}
