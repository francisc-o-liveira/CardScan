import { describe, expect, it } from "vitest";
import { EMBEDDING_DIM } from "../../src/recognition/embedder";
import { RecognitionIndex } from "../../src/recognition/indexStore";

const cards = [
  { id: "a", name: "A", number: "1", tcg: "magic", setId: "s" },
  { id: "b", name: "B", number: "1", tcg: "yugioh", setId: "s" },
];

/** Two cards whose vectors both point along the first axis, so only the game can tell them apart. */
const index = () => {
  const vectors = new Int8Array(cards.length * EMBEDDING_DIM);
  cards.forEach((_, i) => (vectors[i * EMBEDDING_DIM] = 127));
  return new RecognitionIndex(cards, vectors, new Float32Array(cards.length).fill(1 / 127));
};

const query = () => {
  const vector = new Float32Array(EMBEDDING_DIM);
  vector[0] = 1;
  return vector;
};

describe("recognition index search", () => {
  it("looks among every game by default", () => {
    expect(index().search(query(), 5).map((hit) => cards[hit.index]!.id).sort()).toEqual(["a", "b"]);
  });

  it("looks only among the cards of the chosen game", () => {
    expect(index().search(query(), 5, undefined, "yugioh").map((hit) => cards[hit.index]!.id)).toEqual(["b"]);
  });
});
