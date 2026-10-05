# AGENTS.md

This repository implements iTantra (SIH26173). The single source of truth for the build is
`../ITANTRA_AGENT_PLAN.md` (kept one level up in the SIH workspace, and summarised here).

## Agent contract (Section 0 of the plan, restated)

1. Stop and report, never guess. Missing facts go into `OPEN_QUESTIONS.md`.
2. Verify versions and APIs from current docs, not memory. Record results in `DECISIONS.md`.
3. Native owns the truth; the web layer renders it. Audio capture, speech, transport, crypto,
   the outbox and the database live in Kotlin inside a foreground service.
4. No cloud, no runtime internet, no analytics.
5. Every number in UI/README/slides comes from a measurement file. Placeholders say `sample data`.
6. Do not claim what is not implemented and tested. See plan Section 15.
7. Keep the wire format frozen once Gate 3 passes.
8. Small, verifiable steps with evidence pasted into `TASKS.md`.
9. Licences are data: every model records its licence class; non-commercial shows a banner.
10. On a native crash, reproduce on desktop before changing model files.

## Where things are

- `packages/protocol-ts` — TypeScript port of the wire protocol (runs, tested with vitest).
- `packages/bridge` — Capacitor bridge contract, zod schemas, `MockBridge`, `CapacitorBridge`.
- `packages/vectors` — golden test vectors shared by Kotlin and TypeScript.
- `apps/web` — Next.js static UI: field app `(field)` and lab dashboard `(lab)`.
- `apps/android` — Capacitor Android project and Kotlin engine modules.
- `tools/bench` — Python measurement harness producing `results/*.csv`.
- `docs/` — protocol, packs, metrics, licences, demo, official PS compliance.

## Commands

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter web build          # static export to apps/web/out
python3 tools/bench/bench.py size
./gradlew test                   # from apps/android, requires a JDK + Android SDK
```
