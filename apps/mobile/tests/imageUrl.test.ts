import { resolveImageUrl } from "@/utils/imageUrl";

const API = "http://192.168.1.20:4100/api";

describe("resolveImageUrl", () => {
  it("returns null when there is no image", () => {
    expect(resolveImageUrl(null, API)).toBeNull();
    expect(resolveImageUrl(undefined, API)).toBeNull();
    expect(resolveImageUrl("", API)).toBeNull();
  });

  it("leaves external CDN images untouched", () => {
    expect(resolveImageUrl("https://assets.tcgdex.net/en/base/base1/4/high.webp", API)).toBe(
      "https://assets.tcgdex.net/en/base/base1/4/high.webp",
    );
    expect(resolveImageUrl("https://cards.scryfall.io/large/front/0/9/x.jpg?1", API)).toBe(
      "https://cards.scryfall.io/large/front/0/9/x.jpg?1",
    );
  });

  it("re-points re-hosted /assets images at the API host this app talks to", () => {
    // The DB stores http://localhost:4100/... — unreachable from a phone.
    expect(resolveImageUrl("http://localhost:4100/assets/yugioh/cards/46986414.jpg", API)).toBe(
      "http://192.168.1.20:4100/assets/yugioh/cards/46986414.jpg",
    );
  });

  it("works with the Android emulator host and https APIs", () => {
    expect(resolveImageUrl("http://localhost:4100/assets/yugioh/cards/1.jpg", "http://10.0.2.2:4100/api")).toBe(
      "http://10.0.2.2:4100/assets/yugioh/cards/1.jpg",
    );
    expect(resolveImageUrl("http://localhost:4100/assets/a.jpg", "https://api.cardscan.app/api")).toBe(
      "https://api.cardscan.app/assets/a.jpg",
    );
  });
});
