import { fireEvent, render, screen } from "@testing-library/react-native";
import { CardTile } from "@/components/CardTile";
import { makeCard } from "./factories";

describe("<CardTile />", () => {
  it("renders the card image from its URL", async () => {
    await render(<CardTile card={makeCard()} />);
    const image = screen.getByTestId("card-image");
    expect(image.props.source).toEqual({ uri: "https://img.test/charizard.webp" });
    expect(image.props.accessibilityLabel).toBe("Charizard");
  });

  it("shows name, set with number, and rarity", async () => {
    await render(<CardTile card={makeCard()} />);
    expect(screen.getByText("Charizard")).toBeTruthy();
    expect(screen.getByText("Base Set · 4")).toBeTruthy();
    expect(screen.getByText("Rare Holo")).toBeTruthy();
  });

  it("can hide set and rarity, and omits a missing rarity", async () => {
    const { rerender } = await render(<CardTile card={makeCard()} showSet={false} showRarity={false} />);
    expect(screen.queryByText("Base Set · 4")).toBeNull();
    expect(screen.queryByText("Rare Holo")).toBeNull();
    await rerender(<CardTile card={makeCard({ rarity: null })} />);
    expect(screen.queryByText("Rare Holo")).toBeNull();
  });

  it("shows a placeholder instead of a broken image when there is no imageUrl", async () => {
    await render(<CardTile card={makeCard({ imageUrl: null })} />);
    expect(screen.queryByTestId("card-image")).toBeNull();
    expect(screen.getByTestId("card-image-fallback")).toBeTruthy();
    expect(screen.getByText("No image")).toBeTruthy();
  });

  it("falls back to the placeholder when the image fails to load", async () => {
    await render(<CardTile card={makeCard()} />);
    await fireEvent(screen.getByTestId("card-image"), "error");
    expect(screen.queryByTestId("card-image")).toBeNull();
    expect(screen.getByTestId("card-image-fallback")).toBeTruthy();
  });

  it("points re-hosted images at the API host instead of localhost", async () => {
    await render(<CardTile card={makeCard({ imageUrl: "http://localhost:4100/assets/yugioh/cards/1.jpg" })} />);
    expect(screen.getByTestId("card-image").props.source.uri).toMatch(/\/assets\/yugioh\/cards\/1\.jpg$/);
  });

  it("shows the quantity, including zero", async () => {
    const { rerender } = await render(<CardTile card={makeCard()} quantity={3} />);
    expect(screen.getByText("x3")).toBeTruthy();
    await rerender(<CardTile card={makeCard()} quantity={0} />);
    expect(screen.getByText("x0")).toBeTruthy();
  });

  it("is pressable only when given a handler", async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<CardTile card={makeCard()} />);
    await fireEvent.press(screen.getByLabelText("Charizard, Base Set 4"));
    expect(onPress).not.toHaveBeenCalled();
    await rerender(<CardTile card={makeCard()} onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
