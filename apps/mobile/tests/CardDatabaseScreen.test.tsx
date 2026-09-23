import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { CardDatabaseScreen } from "@/screens/Cards/CardDatabaseScreen";
import { router } from "expo-router";
import { api } from "@/services/api";
import { cardsPage, makeCard } from "./factories";

jest.mock("expo-router", () => ({ router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() } }));
jest.mock("@/services/api", () => ({
  api: { catalog: { listCards: jest.fn(), listSets: jest.fn(), listTcgs: jest.fn() } },
}));

const catalog = jest.mocked(api.catalog);

const tcgs = [
  { id: "t1", slug: "pokemon" as const, name: "Pokémon", isEnabled: true },
  { id: "t2", slug: "magic" as const, name: "Magic: The Gathering", isEnabled: true },
  { id: "t3", slug: "yugioh" as const, name: "Yu-Gi-Oh!", isEnabled: true },
];

const magicSet = {
  id: "s1",
  tcgId: "t2",
  code: "lea",
  name: "Limited Edition Alpha",
  releaseDate: null,
  totalCards: null,
  symbolUrl: null,
  tcg: { id: "t2", slug: "magic" as const, name: "Magic: The Gathering", isEnabled: true },
};

const renderScreen = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CardDatabaseScreen />
    </QueryClientProvider>,
  );
};

const lastCall = () => catalog.listCards.mock.calls.at(-1)?.[0];

describe("Card Database screen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    catalog.listTcgs.mockResolvedValue(tcgs);
    catalog.listSets.mockResolvedValue([magicSet]);
    catalog.listCards.mockResolvedValue(
      cardsPage([makeCard({ id: "a", name: "Charizard" }), makeCard({ id: "b", name: "Pikachu", imageUrl: null })], {
        total: 2,
      }),
    );
  });

  it("shows a loading indicator, then the cards with their images", async () => {
    let resolve!: (v: ReturnType<typeof cardsPage>) => void;
    catalog.listCards.mockReturnValue(new Promise((r) => (resolve = r)));
    await renderScreen();
    expect(screen.getByTestId("cards-loading")).toBeTruthy();
    expect(screen.queryByTestId("card-list")).toBeNull();

    await act(async () => resolve(cardsPage([makeCard({ name: "Charizard" })])));
    expect(await screen.findByTestId("card-list")).toBeTruthy();
    expect(screen.getByTestId("card-image").props.source).toEqual({ uri: "https://img.test/charizard.webp" });
    expect(screen.queryByTestId("cards-loading")).toBeNull();
  });

  it("requests the first page of 30 with no filters and shows the total", async () => {
    await renderScreen();
    await screen.findByTestId("card-list");
    expect(lastCall()).toEqual({ tcg: undefined, setId: undefined, query: undefined, limit: 30, page: 1 });
    expect(screen.getByTestId("card-total")).toHaveTextContent("2 cards");
  });

  it("renders a placeholder for cards without an image", async () => {
    await renderScreen();
    await screen.findByTestId("card-list");
    expect(screen.getAllByTestId("card-image")).toHaveLength(1);
    expect(screen.getAllByTestId("card-image-fallback")).toHaveLength(1);
  });

  it("debounces the search box and queries by name", async () => {
    await renderScreen();
    await screen.findByTestId("card-list");
    catalog.listCards.mockClear();

    const input = screen.getByLabelText("Search cards");
    await fireEvent.changeText(input, "l");
    await fireEvent.changeText(input, "lo");
    await fireEvent.changeText(input, "lotus");
    expect(catalog.listCards).not.toHaveBeenCalledWith(expect.objectContaining({ query: "lotus" }));

    await waitFor(() => expect(lastCall()).toMatchObject({ query: "lotus", page: 1 }));
    expect(catalog.listCards.mock.calls.filter(([p]) => p.query).length).toBe(1);
  });

  it("filters by TCG using the chips", async () => {
    await renderScreen();
    await screen.findByTestId("card-list");
    expect(screen.queryByLabelText("Filter by set")).toBeNull();

    await fireEvent.press(await screen.findByLabelText("Magic"));
    await waitFor(() => expect(lastCall()).toMatchObject({ tcg: "magic", page: 1 }));
    expect(catalog.listSets).toHaveBeenCalledWith("magic");
    expect(screen.getByLabelText("Filter by set")).toBeTruthy();
  });

  it("filters by set through the picker, and can search sets", async () => {
    await renderScreen();
    await screen.findByTestId("card-list");
    await fireEvent.press(await screen.findByLabelText("Magic"));
    await fireEvent.press(await screen.findByLabelText("Filter by set"));

    await fireEvent.changeText(screen.getByLabelText("Search sets"), "zzz");
    expect(screen.queryByText("Limited Edition Alpha")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Search sets"), "alpha");
    await fireEvent.press(await screen.findByText("Limited Edition Alpha"));

    await waitFor(() => expect(lastCall()).toMatchObject({ tcg: "magic", setId: "s1" }));
  });

  it("clears the set filter when the TCG changes", async () => {
    await renderScreen();
    await screen.findByTestId("card-list");
    await fireEvent.press(await screen.findByLabelText("Magic"));
    await fireEvent.press(await screen.findByLabelText("Filter by set"));
    await fireEvent.press(await screen.findByText("Limited Edition Alpha"));
    await waitFor(() => expect(lastCall()).toMatchObject({ setId: "s1" }));

    await fireEvent.press(screen.getByLabelText("Pokémon"));
    await waitFor(() => expect(lastCall()).toMatchObject({ tcg: "pokemon", setId: undefined }));
  });

  it("loads the next page when scrolling to the end (infinite scroll) and appends the cards", async () => {
    catalog.listCards.mockImplementation(async ({ page }) =>
      page === 1
        ? cardsPage([makeCard({ id: "a", name: "First Page Card" })], { page: 1, total: 2, totalPages: 2 })
        : cardsPage([makeCard({ id: "b", name: "Second Page Card" })], { page: 2, total: 2, totalPages: 2 }),
    );
    await renderScreen();
    await screen.findByText("First Page Card");
    expect(screen.queryByText("Second Page Card")).toBeNull();

    await fireEvent(screen.getByTestId("card-list"), "endReached");
    expect(await screen.findByText("Second Page Card")).toBeTruthy();
    expect(screen.getByText("First Page Card")).toBeTruthy();
    expect(lastCall()).toMatchObject({ page: 2 });
  });

  it("does not request more once the last page is loaded", async () => {
    await renderScreen();
    await screen.findByTestId("card-list");
    catalog.listCards.mockClear();
    await fireEvent(screen.getByTestId("card-list"), "endReached");
    expect(catalog.listCards).not.toHaveBeenCalled();
  });

  it("shows an empty state when nothing matches", async () => {
    catalog.listCards.mockResolvedValue(cardsPage([], { total: 0 }));
    await renderScreen();
    expect(await screen.findByText("No cards found")).toBeTruthy();
  });

  it("shows an error with a working retry", async () => {
    catalog.listCards.mockRejectedValueOnce(new Error("Network Error"));
    await renderScreen();
    expect(await screen.findByText(/Couldn.t load cards/)).toBeTruthy();
    expect(screen.getByText(/Network Error/)).toBeTruthy();

    await fireEvent.press(screen.getByText("Try again"));
    expect(await screen.findByTestId("card-list")).toBeTruthy();
    expect(screen.queryByText(/Couldn.t load cards/)).toBeNull();
  });

  it("goes back when there is history, and to Home when there is not (reload / deep link)", async () => {
    await renderScreen();
    await screen.findByTestId("card-list");

    jest.mocked(router.canGoBack).mockReturnValue(true);
    await fireEvent.press(screen.getByLabelText("Go back"));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();

    jest.mocked(router.canGoBack).mockReturnValue(false);
    await fireEvent.press(screen.getByLabelText("Go back"));
    expect(router.replace).toHaveBeenCalledWith("/(tabs)");
  });

  it("lists every supported game, even those the API has no catalog for yet", async () => {
    // The mocked API only knows Pokémon and Magic; the filter still offers all eight, like the web app.
    await renderScreen();
    for (const label of ["All TCGs", "Pokémon", "Magic", "Yu-Gi-Oh!", "Lorcana", "One Piece", "Digimon", "Star Wars", "Flesh & Blood"]) {
      expect(await screen.findByLabelText(label)).toBeTruthy();
    }
  });
});
