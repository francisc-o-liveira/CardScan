# Contributing

- Run `pnpm typecheck` and `pnpm lint` before committing.
- Don't duplicate types or validation rules between `apps/*` — add them to `packages/types` or `packages/validation` instead and import from there.
- Prefer small, focused changes over rewriting working modules. See the phase breakdown in the [README](../README.md#roadmap) — avoid building ahead of the current phase.
