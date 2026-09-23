import { act, fireEvent, render, screen } from "@testing-library/react";
import { IMAGE_MAX_RETRIES, IMAGE_RETRY_DELAY_MS } from "@/hooks/useImageRetry";
import { describe, expect, it, vi } from "vitest";
import { CardTile } from "@/components/cards/CardTile";
import { makeCard } from "./factories";

describe("<CardTile />", () => {
  it("shows the card image with the card name as alt text, lazy-loaded", () => {
    render(<CardTile card={makeCard()} />);
    const image = screen.getByRole("img", { name: "Charizard" });
    expect(image).toHaveAttribute("src", "https://img.test/charizard.webp");
    expect(image).toHaveAttribute("loading", "lazy");
  });

  it("shows name, set, collector number and rarity", () => {
    render(<CardTile card={makeCard()} />);
    expect(screen.getByText("Charizard")).toBeInTheDocument();
    expect(screen.getByText("Base Set · 4")).toBeInTheDocument();
    expect(screen.getByText("Rare Holo")).toBeInTheDocument();
  });

  it("can hide the set and rarity lines", () => {
    render(<CardTile card={makeCard()} showSet={false} showRarity={false} />);
    expect(screen.queryByText("Base Set · 4")).not.toBeInTheDocument();
    expect(screen.queryByText("Rare Holo")).not.toBeInTheDocument();
  });

  it("omits the rarity line when the card has no rarity", () => {
    render(<CardTile card={makeCard({ rarity: null })} />);
    expect(screen.queryByText("Rare Holo")).not.toBeInTheDocument();
  });

  it("renders a labelled placeholder instead of a broken image when there is no imageUrl", () => {
    render(<CardTile card={makeCard({ imageUrl: null })} />);
    expect(screen.queryByRole("img", { name: "Charizard" })).not.toBeInTheDocument();
    expect(screen.getByTestId("card-image-fallback")).toHaveTextContent("No image available");
  });

  it("retries a failed image before falling back to the placeholder", () => {
    vi.useFakeTimers();
    render(<CardTile card={makeCard()} />);
    for (let retry = 0; retry < IMAGE_MAX_RETRIES; retry++) {
      fireEvent.error(screen.getByRole("img", { name: "Charizard" }));
      expect(screen.queryByTestId("card-image-fallback")).not.toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(IMAGE_RETRY_DELAY_MS);
      });
    }
    fireEvent.error(screen.getByRole("img", { name: "Charizard" }));
    expect(screen.queryByTestId("card-image")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-image-fallback")).toBeInTheDocument();
    expect(screen.getByText("Charizard")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("shows the owned quantity when provided, including zero", () => {
    const { rerender } = render(<CardTile card={makeCard()} quantity={3} />);
    expect(screen.getByText("x3")).toBeInTheDocument();
    rerender(<CardTile card={makeCard()} quantity={0} />);
    expect(screen.getByText("x0")).toBeInTheDocument();
  });

  it("is a button only when clickable", () => {
    const onClick = vi.fn();
    const { rerender } = render(<CardTile card={makeCard()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<CardTile card={makeCard()} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
