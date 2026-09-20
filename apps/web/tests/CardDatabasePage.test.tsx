import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CardDatabasePage from "@/app/(app)/cards/page";
import { api } from "@/services/api";
import { cardsPage, makeCard } from "./factories";

vi.mock("@/services/api", () => ({
  api: { catalog: { listCards: vi.fn(), listSets: vi.fn(), listTcgs: vi.fn() } },
}));

const catalog = vi.mocked(api.catalog);

const tcgs = [
  { id: "t1", slug: "pokemon" as const, name: "Pokémon", isEnabled: true },
  { id: "t2", slug: "magic" as const, name: "Magic: The Gathering", isEnabled: true },
  { id: "t3", slug: "yugioh" as const, name: "Yu-Gi-Oh!", isEnabled: true },
];

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CardDatabasePage />
    </QueryClientProvider>,
  );
};

const lastCardsCall = () => catalog.listCards.mock.calls.at(-1)?.[0];

describe("Card Database page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    catalog.listTcgs.mockResolvedValue(tcgs);
    catalog.listSets.mockResolvedValue([]);
    catalog.listCards.mockResolvedValue(
      cardsPage([makeCard({ id: "a", name: "Charizard" }), makeCard({ id: "b", name: "Pikachu", imageUrl: null })], {
        total: 2,
      }),
    );
  });

  it("shows loading skeletons, then the cards with their images", async () => {
    let resolve!: (value: Awaited<ReturnType<typeof api.catalog.listCards>>) => void;
    catalog.listCards.mockReturnValue(new Promise((r) => (resolve = r)));
    renderPage();

    expect(screen.getByLabelText("Loading cards")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("list", { name: "Cards" })).not.toBeInTheDocument();

    resolve(cardsPage([makeCard({ name: "Charizard" })]));
    const list = await screen.findByRole("list", { name: "Cards" });
    expect(within(list).getByRole("img", { name: "Charizard" })).toHaveAttribute("src", "https://img.test/charizard.webp");
    expect(screen.queryByLabelText("Loading cards")).not.toBeInTheDocument();
  });

  it("requests the first page of 24 cards with no filters and shows the total", async () => {
    renderPage();
    await screen.findByRole("list", { name: "Cards" });
    expect(lastCardsCall()).toEqual({ tcg: undefined, setId: undefined, query: undefined, page: 1, limit: 24 });
    expect(screen.getByText("2 cards")).toBeInTheDocument();
  });

  it("renders a placeholder for cards that have no image", async () => {
    renderPage();
    await screen.findByRole("list", { name: "Cards" });
    expect(screen.getAllByTestId("card-image")).toHaveLength(1);
    expect(screen.getAllByTestId("card-image-fallback")).toHaveLength(1);
  });

  it("debounces the search box, then queries by name from page 1", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("list", { name: "Cards" });
    catalog.listCards.mockClear();

    await user.type(screen.getByLabelText("Search cards"), "lotus");
    expect(catalog.listCards).not.toHaveBeenCalledWith(expect.objectContaining({ query: "lotus" }));

    await waitFor(() => expect(lastCardsCall()).toMatchObject({ query: "lotus", page: 1 }));
    // Typing 5 characters must not fire 5 requests.
    expect(catalog.listCards.mock.calls.filter(([params]) => params.query).length).toBe(1);
  });

  it("filters by TCG, then offers that TCG's sets", async () => {
    const user = userEvent.setup();
    catalog.listSets.mockResolvedValue([
      { id: "s1", tcgId: "t2", code: "lea", name: "Limited Edition Alpha", releaseDate: null, totalCards: null, symbolUrl: null, tcg: { id: "t2", slug: "magic", name: "Magic: The Gathering" } },
    ]);
    renderPage();
    await screen.findByRole("list", { name: "Cards" });
    await screen.findByRole("option", { name: "Magic: The Gathering" });

    const setSelect = screen.getByLabelText("Filter by set");
    expect(setSelect).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Filter by TCG"), "magic");
    await waitFor(() => expect(lastCardsCall()).toMatchObject({ tcg: "magic" }));
    expect(catalog.listSets).toHaveBeenCalledWith("magic");
    expect(setSelect).toBeEnabled();

    await user.selectOptions(setSelect, await screen.findByRole("option", { name: "Limited Edition Alpha" }));
    await waitFor(() => expect(lastCardsCall()).toMatchObject({ tcg: "magic", setId: "s1", page: 1 }));
  });

  it("clears the set filter when the TCG changes", async () => {
    const user = userEvent.setup();
    catalog.listSets.mockResolvedValue([
      { id: "s1", tcgId: "t2", code: "lea", name: "Alpha", releaseDate: null, totalCards: null, symbolUrl: null, tcg: { id: "t2", slug: "magic", name: "Magic" } },
    ]);
    renderPage();
    await screen.findByRole("option", { name: "Magic: The Gathering" });
    await user.selectOptions(screen.getByLabelText("Filter by TCG"), "magic");
    await user.selectOptions(screen.getByLabelText("Filter by set"), await screen.findByRole("option", { name: "Alpha" }));
    await user.selectOptions(screen.getByLabelText("Filter by TCG"), "pokemon");
    await waitFor(() => expect(lastCardsCall()).toMatchObject({ tcg: "pokemon", setId: undefined }));
  });

  it("paginates with Previous/Next and disables them at the ends", async () => {
    const user = userEvent.setup();
    catalog.listCards.mockResolvedValue(cardsPage([makeCard()], { page: 1, total: 100, totalPages: 5 }));
    renderPage();
    await screen.findByText("Page 1 of 5");

    const previous = screen.getByRole("button", { name: /previous/i });
    const next = screen.getByRole("button", { name: /next/i });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    catalog.listCards.mockResolvedValue(cardsPage([makeCard()], { page: 2, total: 100, totalPages: 5 }));
    await user.click(next);
    await waitFor(() => expect(lastCardsCall()).toMatchObject({ page: 2 }));
    await screen.findByText("Page 2 of 5");
    expect(screen.getByRole("button", { name: /previous/i })).toBeEnabled();
  });

  it("disables Next on the last page", async () => {
    catalog.listCards.mockResolvedValue(cardsPage([makeCard()], { page: 5, total: 100, totalPages: 5 }));
    renderPage();
    await screen.findByText("Page 5 of 5");
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("returns to page 1 when the search changes", async () => {
    const user = userEvent.setup();
    catalog.listCards.mockResolvedValue(cardsPage([makeCard()], { page: 1, total: 100, totalPages: 5 }));
    renderPage();
    await screen.findByText("Page 1 of 5");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(lastCardsCall()).toMatchObject({ page: 2 }));

    await user.type(screen.getByLabelText("Search cards"), "x");
    await waitFor(() => expect(lastCardsCall()).toMatchObject({ query: "x", page: 1 }));
  });

  it("shows an empty state when nothing matches", async () => {
    catalog.listCards.mockResolvedValue(cardsPage([], { total: 0 }));
    renderPage();
    expect(await screen.findByText("No cards found")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
  });

  it("shows an error with a working retry when loading fails", async () => {
    const user = userEvent.setup();
    catalog.listCards.mockRejectedValueOnce(new Error("Network Error"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load cards/i);
    expect(screen.getByRole("alert")).toHaveTextContent("Network Error");

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByRole("list", { name: "Cards" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lists every TCG in the filter, including Yu-Gi-Oh!", async () => {
    renderPage();
    expect(await screen.findByRole("option", { name: "Yu-Gi-Oh!" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pokémon" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Magic: The Gathering" })).toBeInTheDocument();
  });
});
