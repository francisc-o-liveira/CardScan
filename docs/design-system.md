# CardScan design system and screen specification

Written for the CardScan engineering and design team.

This document describes the redesigned product: the visual system, the information
architecture, and a per-screen specification. It also records, explicitly, which parts of
the design are live and which are waiting on API work.

---

## 1. The problem this redesign solves

The previous build had the product backwards.

Nine of eleven screens were placeholders reading "coming soon", while the one genuinely
substantial asset — an imported catalog of Pokémon and Magic cards with real artwork — was
not reachable from anywhere in the UI. Desktop navigation consisted of eight game-specific
mega-menus with no link to Home, Collection or Scan. The dashboard opened with four tiles
reading `0`, `0`, `€0.00`, `0`.

A new user's first impression was of an empty database with a navigation bar.

The redesign inverts that:

| Before | After |
| --- | --- |
| 8 game mega-menus as primary desktop nav | 4 destinations + a game **filter** inside Collection and Discover |
| Catalog unreachable | Catalog is the content of Home, Discover, Search and Scan |
| Dashboard of zeroes | Hero that states what the product does and one primary action |
| "Coming soon" with no alternative | Every unbuilt feature names a working path to the same goal |
| Placeholder metrics | No invented data anywhere |

The measure the whole design optimises for: **how quickly a new user understands the
product and reaches a real card.**

---

## 2. Design principles

1. **Clarity over decoration.** Every screen has exactly one primary action.
2. **The cards are the hero.** Artwork gets the space; metadata is compact and secondary.
3. **Honesty over theatre.** No fabricated counts, prices or fake scan results. An unbuilt
   feature says so and offers the nearest thing that works.
4. **One product, eight games.** Game colour appears in badges, chips and active states
   only — never as a whole-UI reskin.
5. **Progressive disclosure.** Three facts on a card tile; everything else on the detail
   screen.
6. **Same mental model on both platforms.** Mobile and desktop differ in density, not in
   structure.

---

## 3. Visual system

### 3.1 Colour

Tokens live in [`packages/config/src/theme.ts`](../packages/config/src/theme.ts) and are
consumed by web through `tailwind.config.ts` + `globals.css`, and by mobile through
`apps/mobile/theme.ts`. Neither client hardcodes hex.

**Dark (default)**

| Role | Token | Value |
| --- | --- | --- |
| Page background | `base100` | `#0A0A0D` |
| Resting surface | `base200` | `#121318` |
| Raised surface | `base300` | `#1B1D24` |
| Hairline border | `border` | `#262932` |
| Emphasised border | `borderStrong` | `#393E4D` |
| Text | `baseContent` | `#F2F3F7` |
| Secondary text | `baseContentMuted` | `#98A0B0` |
| Tertiary text | `baseContentFaint` | `#6A7180` |
| Primary | `primary` | `#5B6CFF` |
| Value / monetary | `accent` | `#2DD4A7` |
| Success / Warning / Error | | `#34D399` / `#FBBF24` / `#FB7185` |

A light theme is defined at full parity and selectable in Settings. Dark is the default
because card artwork reads better against it.

**Game accents** are an evenly spaced hue ramp rather than attempts at each publisher's
real brand colour — those can't be licensed, and a designed family reads as one product
where eight borrowed palettes would not. Colour is always paired with the game's name and
icon, so it never carries meaning alone.

| Game | Hue |
| --- | --- |
| Pokémon | `#FFC61E` |
| Magic | `#F2751A` |
| One Piece | `#FF4D4D` |
| Lorcana | `#EC4899` |
| Yu-Gi-Oh! | `#8B5CF6` |
| Star Wars | `#3B82F6` |
| Digimon | `#22D3EE` |
| Flesh & Blood | `#10B981` |

### 3.2 Typography

Five steps. A short scale is what keeps hierarchy readable rather than merely varied.

| Step | Size | Use |
| --- | --- | --- |
| `display` | 36px | Collection total on Home |
| `title` | 26px | Page titles |
| `section` | 19px | Section headings |
| `body` | 15px | Body copy, controls |
| `meta` | 13px | Card metadata, captions |

The stack is defined once as `--font-sans` in `globals.css`. It must stay defined there:
an undefined custom property inside a `font-family` list invalidates the entire
declaration and silently drops the page to the browser's serif default.

### 3.3 Spacing, radius, elevation

4px rhythm (`4 / 8 / 12 / 16 / 24 / 32 / 48`). Radii: `sm 8` · `md 12` · `lg 16` ·
`xl 22` · `full`. Card artwork uses `0.65rem`.

Depth in dark UI comes from light, not from heavy shadows: every raised surface carries a
1px hairline plus `--surface-sheen`, an `inset 0 1px 0 rgba(255,255,255,0.045)` top
highlight. Drop shadows are reserved for genuinely floating things — cards, sheets,
popovers.

### 3.4 Motion

| Token | Duration |
| --- | --- |
| `instant` | 90ms |
| `fast` | 160ms |
| `base` | 220ms |
| `slow` | 320ms |

Motion communicates progress, confirmation, hierarchy or feedback. Nothing animates for
decoration. Named animations: `fade-in-up`, `sheet-up`, `scan-sweep`, `pop-in`, plus the
skeleton sweep. All of it collapses to ~0ms under `prefers-reduced-motion: reduce`.

Skeletons use a sweep, not a pulse — a pulsing block reads as an error state.

### 3.5 Components

Web primitives live in `apps/web/components/ui/`; mobile equivalents in
`apps/mobile/components/`.

| Component | States |
| --- | --- |
| `Button` / `ButtonLink` / `IconButton` | 5 variants × 3 sizes; hover, active, focus, disabled, loading |
| `TextField` | default, focus, error, with hint |
| `SearchField` | default, focus, loading, clearable |
| `GameSwitcher` | idle, selected, "soon" for games without a catalog |
| `FilterChip` / `ToggleChip` | selected, removable |
| `Badge` / `GameBadge` | 5 tones, 2 sizes |
| `Sheet` | bottom sheet ≤ md, right panel ≥ md; focus trap, Escape, scroll lock |
| `Toast` | success, error, info |
| `Skeleton` family | text, tile, full grid |
| `EmptyState` | page and inline tones, primary + secondary action |
| `ErrorState` | retry + alternative route |
| `Pagination` | prev/next with position |
| `CardTile` / `CardGrid` / `CardRail` / `CardImage` / `CardLightbox` | loading, loaded, missing-image |

There is one button system, one card tile, one empty state. Call sites pick a variant
rather than hand-rolling classes.

---

## 4. Information architecture

Five destinations, identical on both platforms:

```
Home · Collection · Scan · Discover · Profile
```

- **Mobile** — bottom bar, Scan centred and raised.
- **Desktop** — top bar with the first four plus search and an avatar menu; Profile lives
  in that menu.

Secondary destinations (Wishlist, Decks, Scan History, Settings, Help) are reached from
Profile. A feature existing is not a reason to spend a navigation slot on it.

Game switching is a **filter inside** Collection, Discover, Search and Scan — never a
separate navigation tree. The eight mega-menus are gone.

### Route map

| Route | Screen | Notes |
| --- | --- | --- |
| `/home` | Home | `/dashboard` redirects here |
| `/collection` | Collection | |
| `/scan` | Scan / identify | |
| `/discover` | Discover | |
| `/sets/[id]` | Set detail | |
| `/cards/[id]` | Card detail | `/cards` redirects to `/discover` |
| `/search` | Search | ⌘K from anywhere |
| `/profile` | Profile | |
| `/settings` | Settings | |
| `/welcome` | Onboarding | 3 screens, once per browser |
| `/login`, `/register` | Auth | |

---

## 5. Screen specification

Each screen is specified as: purpose · user goal · layout · navigation · primary CTA ·
secondary actions · components · empty · loading · error · mobile · desktop · interactions.

### 5.1 Onboarding — `/welcome`

- **Purpose** — state what the product is in under fifteen seconds.
- **User goal** — find out whether this app does what they need.
- **Layout** — three full-screen slides: visual, headline, one sentence, progress dots,
  one button.
- **Navigation** — Skip is present on every slide; dots are tappable.
- **Primary CTA** — "Continue", then "Find your first card" on slide 3.
- **Secondary** — "Explore the app", "Skip".
- **Components** — `ScanFrame`, `Button`, `Logo`.
- **Empty / loading / error** — none; no data is fetched.
- **Mobile** — single column, buttons pinned to the bottom third.
- **Desktop** — same layout centred at `max-w-md`; onboarding does not need the width.
- **Interactions** — slides cross-fade with `fade-in-up`. Seen-state is stored in
  `localStorage`; a blocked-storage read is treated as "seen" so nobody gets trapped in a
  loop. Shown after registration, and on first sign-in in a new browser.

### 5.2 Home — `/home`

- **Purpose** — answer "what is this and what do I do next?".
- **User goal** — get oriented and reach a card.
- **Layout** — hero → four quick actions → two real card rails → games grid → an honest
  note about scanning.
- **Navigation** — entry point; everything links outward.
- **Primary CTA** — **Scan a card**.
- **Secondary** — Explore cards / View collection, four quick-action tiles.
- **Components** — `CollectionHero`, `QuickActions`, `CardRail`, `GamesGrid`,
  `SectionHeader`.
- **Empty** — the hero has a dedicated empty-collection state: a headline and an
  invitation, never `0 / 0 / €0.00`.
- **Loading** — card rails render skeleton tiles at the real tile size.
- **Error** — a failed rail collapses; the rest of the page still works.
- **Mobile** — rails scroll horizontally with snap; quick actions are 2×2.
- **Desktop** — quick actions become a 4-across row; rails gain visible items.
- **Interactions** — tiles lift 4px on hover (motion-safe only).

> Once `/collection` exists, the hero's populated branch already renders the total and the
> per-game breakdown; only the data source changes.

### 5.3 Scan — `/scan`

- **Purpose** — get a card identified.
- **User goal** — "what is this card, and can I record it?".
- **Layout** — viewfinder, then "Find it by name" with live results.
- **Navigation** — centre tab on mobile, top nav on desktop.
- **Primary CTA** — capture (when live); today, the search field, given equal weight.
- **Secondary** — game filter.
- **Components** — `ScanFrame`, `SearchField`, `GameSwitcher`, result rows, `EmptyState`,
  `ErrorState`.
- **Empty** — "Start typing to search 130,000+ cards."
- **Loading** — four skeleton result rows.
- **Error** — "We couldn't identify that card" + Try again.
- **Mobile** — full-width viewfinder, thumb-reachable field.
- **Desktop** — same, constrained to `max-w-3xl`; a wide scanner helps nobody.
- **Interactions** — 280ms debounce; `scan-sweep` runs in the frame.

**Future / Requires Backend Support — the camera flow.** When `/scans` and a recognition
model exist:

```
Tap Scan → camera opens immediately → "Position your card inside the frame"
  → auto-detect → Scan Result
     ├─ Card found:  artwork · name · game · set · confidence
     │                 [Add to collection]  [Not this card]
     │                 → "✓ Charizard added" → viewfinder re-arms
     └─ Not found:   "We couldn't identify that card"
                       "Try better lighting, or the card fully inside the frame."
                       [Try again]  [Enter manually]
```

Batch scanning stays on one screen — `scan → confirm → scan` — and never routes back
through Collection between cards. "Not this card" opens the candidate list and writes the
correction to `RecognitionFeedback`.

### 5.4 Collection — `/collection`

- **Purpose** — everything the user owns.
- **User goal** — find, check, and manage their cards.
- **Layout (populated)** — title + count → search + Filters → game switcher → active
  filter chips → card grid.
- **Layout (empty)** — title → one empty state. No search bar or filter chrome over
  nothing.
- **Primary CTA** — **Scan your first card** when empty; the search field when populated.
- **Secondary** — Browse the catalog, Filters, Clear all.
- **Components** — `SearchField`, `GameSwitcher`, `Sheet`, `FilterChip`, `ToggleChip`,
  `CardGrid`, `EmptyState`.
- **Empty** — states what's missing, why it matters, and two things to do next.
- **Loading** — skeleton grid.
- **Error** — `ErrorState` with retry.
- **Mobile** — filters open as a bottom sheet; 2-column grid.
- **Desktop** — the same sheet enters from the right; up to 6 columns.
- **Interactions** — the sheet edits a **draft**; "Show results" commits, so filtering
  never thrashes the grid mid-edit. Active filters are always visible and always
  removable.

> **Future / Requires Backend Support.** No `/collection` routes exist. The screen is
> permanently in its empty state today.

### 5.5 Card detail — `/cards/[id]`

- **Purpose** — everything known about one card.
- **User goal** — confirm identity, see the artwork, decide whether to record it.
- **Layout** — artwork left (sticky on desktop), facts right, related set below.
- **Primary CTA** — **Add to collection**.
- **Secondary** — Wishlist, Share, set link, enlarge.
- **Components** — `CardImage`, `CardLightbox`, `GameBadge`, `Badge`, `Button`,
  `DetailRow`, `CardRail`, `ErrorState`.
- **Empty** — not applicable; a missing card is an error.
- **Loading** — skeleton in the real two-column shape.
- **Error** — "We couldn't load that card" + Retry + Search for a card.
- **Mobile** — single column, artwork capped at 18rem so the facts stay above the fold.
- **Desktop** — two columns, artwork sticky while the detail column scrolls.
- **Interactions** — tapping the artwork opens a full-screen lightbox (Escape or tap to
  dismiss). Share uses the native sheet where available, clipboard + toast otherwise.

> **Future / Requires Backend Support.** Add to collection and Wishlist render disabled
> with a one-line reason rather than hidden — the path has to be obvious now, and it needs
> only the endpoint. Market value comes from TCGplayer: the headline market price under the
> title, a per-finish table (market/low/mid/high) and a price-history chart; a card TCGplayer
> doesn't price says so instead of showing a number.

### 5.6 Search — `/search`

- **Purpose** — reach a specific card fast.
- **User goal** — "I know what I'm looking for".
- **Layout** — large field → game switcher → results grid → pagination.
- **Primary CTA** — the field itself, autofocused.
- **Components** — `SearchField`, `GameSwitcher`, `CardGrid`, `Pagination`, `EmptyState`,
  `ErrorState`.
- **Empty (pre-search)** — six concrete suggestions (Charizard, Black Lotus, …) plus a
  line on what's searchable. Never a blank screen.
- **Empty (no results)** — quotes the query back, suggests a partial name, and offers
  "Search all games" when a game filter is narrowing things.
- **Loading** — skeleton grid; previous results stay on screen while paging
  (`keepPreviousData`).
- **Error** — "Search didn't come back" + Retry.
- **Mobile** — 2 columns; the field is the first thing focused.
- **Desktop** — up to 6 columns; ⌘K reaches it from any screen.
- **Interactions** — 280ms debounce, minimum 2 characters, URL kept in sync via `replace`
  so results are shareable without flooding history.

### 5.7 Discover — `/discover`

- **Purpose** — browsing for people who don't have a specific card in mind.
- **Layout** — game switcher → "Recently released" rail → all sets, filterable.
- **Primary CTA** — pick a set.
- **Components** — `GameSwitcher`, `SectionHeader`, `CardRail`, `SetTile`, `SearchField`.
- **Empty** — a game without an imported catalog says so rather than showing an empty grid.
- **Loading** — 9 set-tile skeletons.
- **Error** — `ErrorState` with retry.
- **Mobile** — single-column set list.
- **Desktop** — 2–3 column set grid.
- **Interactions** — set filtering is client-side (one game returns ≤ ~1k sets in one
  response), so it's instant.

### 5.8 Set detail — `/sets/[id]`

Set identity header (symbol, game badge, code, release date, card count), an in-set search,
then the card grid at 60 per page. `GET /sets/:id` returns the whole set in one response,
so search and paging are client-side and instant.

### 5.9 Profile — `/profile`

Identity card, three collection stats, a list of secondary destinations, log out. The stats
read zero with a one-line explanation — invented figures would be worse than honest ones.

### 5.10 Settings — `/settings`

Grouped rows: Appearance (theme), Account, **Not available yet**, About. The unbuilt
settings are named individually with what each will do, rather than hidden behind a vague
"more coming".

---

## 6. Accessibility

- Every interactive element is ≥ 44px on its smallest axis (`min-h-11`, `min-h-touch`,
  `MIN_TOUCH`).
- One focus treatment app-wide: a 2px primary outline at 2px offset, via `:focus-visible`.
- Colour never carries meaning alone — game accents are always paired with a name and icon;
  the active nav tab thickens its icon stroke as well as changing colour.
- `Sheet` and `CardLightbox` trap focus, close on Escape, lock background scroll, and
  restore focus to the trigger.
- Form errors use `role="alert"` and `aria-invalid`, wired to the input via
  `aria-describedby`.
- Icon-only controls carry an `aria-label`; decorative icons are `aria-hidden`.
- Live regions announce result counts and pagination position.
- A skip link precedes the header.
- All motion collapses under `prefers-reduced-motion`.

---

## 7. What is real, and what is not

**Live today** — auth; `GET /tcgs`, `/sets`, `/sets/:id`, `/cards`, `/cards/:id`. Every
card, set, image and count the UI shows comes from these.

**Future / Requires Backend Support** — each is marked in code with that phrase:

| Feature | Blocked on | UI today |
| --- | --- | --- |
| Collection | `/collection` routes | Empty state with two working alternatives |
| Wishlist | `/wishlist` routes | Empty state; button disabled with a reason |
| Scanning | `/scans` + recognition model | Viewfinder in coming-soon state; name search works |
| Decks | `/decks` routes | Empty state |
| Collection stats | `/collection` | Zeroes with an explanation |

`apps/web/lib/features.ts` centralises these as `CAPABILITIES`, derived from
`FEATURE_FLAGS`. Flipping a flag is the only change each screen needs.

The six remaining games are listed everywhere but marked "coming soon" and are not
clickable into empty grids — `TCG_CATALOG_STATUS` in `packages/config` drives that, so
adding a catalog is a one-line change.

---

## 8. First-time user test

| Question | Answer |
| --- | --- |
| Understand the app in 5 seconds? | Hero headline + Scan button, above the fold |
| Find scanning immediately? | Centre raised tab on mobile; top nav + Home hero on desktop |
| Understand "Collection"? | Named in nav; empty state explains it in one sentence |
| Switch between games? | One switcher, same control on every browse screen |
| Find a card? | ⌘K, header search, Scan screen, or Discover |
| Add a card? | Path is visible and labelled; disabled with a stated reason until the API lands |
| Know if a card is owned? | `CardTile` has an owned badge — needs the collection endpoint |
| Navigate back without confusion? | Back affordance on every detail screen; nav state persists |
| Recover from an error? | Every error names a cause and offers at least one action |
