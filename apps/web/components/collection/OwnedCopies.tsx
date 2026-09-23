"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { CARD_CONDITIONS, CARD_CONDITION_LABELS, LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "@cardscan/config";
import type { CardCondition, CardLanguage, CollectionEntry, CollectionItem } from "@cardscan/types";
import { useRemoveCollectionItem, useUpdateCollectionItem } from "@/hooks/useCollection";

const selectClass =
  "min-h-9 rounded-lg border border-hairline bg-base-100 px-2.5 text-meta text-base-content focus:border-primary focus:outline-none";
const stepClass =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-muted transition-colors duration-fast hover:bg-base-300 hover:text-base-content disabled:opacity-40";

function CopyRow({ item }: { item: CollectionItem }) {
  const update = useUpdateCollectionItem();
  const remove = useRemoveCollectionItem();
  const busy = update.isPending || remove.isPending;
  const change = (input: { quantity?: number; condition?: CardCondition; language?: CardLanguage }) =>
    update.mutate({ itemId: item.id, ...input });

  return (
    <li className="flex flex-wrap items-center gap-2.5 py-3">
      <div className="flex items-center gap-1.5" aria-label="Quantity">
        <button
          type="button"
          className={stepClass}
          disabled={busy}
          onClick={() => change({ quantity: item.quantity - 1 })}
          aria-label={item.quantity === 1 ? "Remove this copy" : "One fewer copy"}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <span className="w-8 text-center text-body font-semibold tabular-nums">{item.quantity}</span>
        <button
          type="button"
          className={stepClass}
          disabled={busy}
          onClick={() => change({ quantity: item.quantity + 1 })}
          aria-label="One more copy"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <select
        className={selectClass}
        value={item.condition}
        disabled={busy}
        onChange={(event) => change({ condition: event.target.value as CardCondition })}
        aria-label="Condition"
      >
        {CARD_CONDITIONS.map((value) => (
          <option key={value} value={value}>
            {CARD_CONDITION_LABELS[value]}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={item.language}
        disabled={busy}
        onChange={(event) => change({ language: event.target.value as CardLanguage })}
        aria-label="Language"
      >
        {SUPPORTED_LANGUAGES.map((value) => (
          <option key={value} value={value}>
            {LANGUAGE_LABELS[value]}
          </option>
        ))}
      </select>

      <button
        type="button"
        className={`${stepClass} ml-auto hover:!text-error`}
        disabled={busy}
        onClick={() => remove.mutate(item.id)}
        aria-label="Remove these copies"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}

/**
 * The copies of a card the user owns, one row per condition and language. Moving a row to a condition
 * and language the card already has merges the two (the API does that); 0 copies removes the row.
 */
export function OwnedCopies({ entry }: { entry: CollectionEntry }) {
  return (
    <section className="mt-9" aria-labelledby="owned-copies">
      <h2 id="owned-copies" className="text-section font-semibold">
        In your collection · {entry.quantity}
      </h2>
      <ul className="mt-1 max-w-lg divide-y divide-[color:var(--border-hairline)]">
        {entry.items.map((item) => (
          <CopyRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
