---
name: sync-knowledge-vault
description: Audits and updates App/Knowledge (the Obsidian vault) so it reflects the real, current state of the Champion AI codebase — component docs, endpoints, DB schema, prompts, ADR index, and the Reference/ mirrors of the root/component CLAUDE.md + ARCHITECTURE.md files. Run this whenever the vault might be stale (after a feature/bugfix session, before handing the project to a local LLM, or when explicitly asked to "update/sync/audit the knowledge base").
---

# Sync Knowledge Vault

Champion AI keeps two layers of documentation:

1. **Source of truth for Claude Code itself**: `CLAUDE.md` (root), `ARCHITECTURE.md` (root),
   `App/API/CLAUDE.md`, `App/Mobile/CLAUDE.md`, `App/procesamiento/CLAUDE.md`. These are hand-maintained,
   checked into the repo, and load automatically into Claude Code's context.
2. **`App/Knowledge/` (the vault)**: a synthesized, cross-linked Obsidian knowledge base meant to be
   consumed by *any* AI system indexing this repo — including local LLMs that only ever see
   `App/Knowledge/`, never the files in (1). If (1) changes and the vault doesn't, local models get
   stale or missing information. This skill's job is to detect and close that gap, end to end.

Do not guess at what changed — verify every claim against the actual code/SQL/git state before writing
it into a doc. This is the same standard the project's CLAUDE.md holds for code: root-cause, not patch.

## Step 0 — Establish the diff surface

```bash
git -C /home/saiko/Projects/Champion-AI log --oneline -15
git -C /home/saiko/Projects/Champion-AI status --short
```

Note the most recent commits/changelog entries under `App/Knowledge/Changelog/` — anything after the
vault's last "Última actualización" stamp is in scope.

## Step 1 — Sync the Reference/ mirrors (verbatim copies)

`App/Knowledge/Reference/` holds byte-for-byte current copies of the 5 source-of-truth files, so a
vault-only reader has everything a Claude Code session has. Mapping:

| Source (ground truth) | Mirror (inside vault) |
|---|---|
| `Champion-AI/CLAUDE.md` | `App/Knowledge/Reference/CLAUDE.md` |
| `Champion-AI/ARCHITECTURE.md` | `App/Knowledge/Reference/ARCHITECTURE.md` |
| `App/API/CLAUDE.md` | `App/Knowledge/Reference/API-CLAUDE.md` |
| `App/Mobile/CLAUDE.md` | `App/Knowledge/Reference/Mobile-CLAUDE.md` |
| `App/procesamiento/CLAUDE.md` | `App/Knowledge/Reference/procesamiento-CLAUDE.md` |

For each pair: `diff` them. If they differ, overwrite the mirror with the current source content
verbatim (Read the source, Write the mirror — do not paraphrase). Keep a one-line frontmatter-style
note at the very top of each mirror:

```
> Espejo verbatim de `{ruta original}`. Sincronizado automáticamente por la skill
> `sync-knowledge-vault` — no editar a mano, editar la fuente y re-ejecutar la skill.
```

If `App/Knowledge/Reference/` doesn't exist yet, create it and all 5 mirrors, then add it to the
folder index in `App/Knowledge/README.md` and to the cross-reference table in `00_PROJECT_OVERVIEW.md`.

## Step 2 — Sync prompts

Compare every file in `App/procesamiento/prompts/*.md` against `App/Knowledge/Prompts/*.md` (same
filename). For any diff or missing file in the vault copy, overwrite/create it verbatim from the
source. These are literal prompt files sent to gpt-5-mini — treat them like code, not narrative to
rewrite.

## Step 3 — Verify Architecture/*.md against real code

For each file below, re-derive its claims from the actual current source and correct drift (don't
just add — remove claims that are no longer true, e.g. a route that was removed, a component that no
longer exists):

- `App/Knowledge/Architecture/overview.md`, `backend-api.md` ← grep `App/API/src/routes/*.js` for the
  full current endpoint list (method + path + auth), cross-check against `App/API/CLAUDE.md`.
- `App/Knowledge/Architecture/azure-function.md` ← `App/procesamiento/function_app.py`,
  `orchestrators/`, `activities/` for the current pipeline step sequence.
- `App/Knowledge/Architecture/azure-services.md` ← config/env var names actually referenced in
  `App/API/src/services/azure_storage_service.js` and `App/procesamiento/shared/services/`.

## Step 4 — Verify Database/*.md against real schema

```bash
ls "App/SQL/Stored Procedures" "App/SQL/Functions" "App/SQL/Migrations"
```

Cross-check `tables.md`, `views.md`, `stored-procedures.md`, `functions.md`, `job-states.md` against
the actual `.sql` files — every SP/function/table that exists in SQL must appear in the docs and vice
versa. Pay attention to tables referenced by application code but not present under `SQL/Migrations`
(e.g. `download_locks` as of 2026-08) — flag these to the user as a possible untracked-migration gap
rather than silently documenting them as if they were normal.

## Step 5 — Verify TECHNICAL_STACK_AND_SERVICES.md

- Mobile section (2.x): diff the `screens/`, `components/`, `hooks/` folder listing and
  `App/Mobile/package.json` dependencies against what's documented — add new components/screens
  (e.g. `KnowledgeWorkspaceScreen`, `AudioPlayer`, `MindMapScreen`, `RichMarkdown`, `MathView`), remove
  retired ones (e.g. `NoteDetailScreen` as the active viewer), update the dependency table.
- API section (6.x endpoint table): must match Step 3's re-derived endpoint list exactly, including
  any endpoints added outside `/AIServices/Speechv2` (e.g. `/jobs/{id}/download`, `/jobs/{id}/stream`).
- Backend/Function sections: same cross-check as Step 3/4 findings.

## Step 6 — Verify the master indices

- `App/Knowledge/00_PROJECT_OVERVIEW.md` §5 "Estado actual de las features" — every feature's status
  must match `App/Knowledge/Roadmap/MILESTONES.md` and `App/Knowledge/Bugs/known-issues.md` (source of
  truth for closed/open state).
- `App/Knowledge/README.md` — every file under `App/Knowledge/ADR/ADR-*.md` must have a corresponding
  `[[ADR-0NN-slug]]` line in the ADR index. Run `ls App/Knowledge/ADR/` and diff against the index by
  eye — do not trust the existing index's completeness.
- Both files: update the "Última actualización" / date stamp to today's date, with a one-line summary
  of what changed in that pass.

## Step 7 — Roadmap cross-check (usually already current, verify don't assume)

`App/Knowledge/Roadmap/{ROADMAP,EPICS,BACKLOG,MILESTONES,SPRINT_PLANNING}.md` and
`App/Knowledge/Bugs/known-issues.md` should already be maintained by the feature-work sessions
themselves (see `App/Knowledge/Changelog/`) — spot-check that the latest changelog's claims made it
into these files, but don't rewrite them wholesale unless you find an actual discrepancy.

## Step 8 — Report

Summarize, grouped by file, exactly what changed and why (one line each) — not a restatement of this
checklist. Explicitly call out anything you found suspicious but did NOT fix (e.g. schema drift,
undocumented tables) so the user can decide.

## Notes for future runs

- This is meant to be safe to run repeatedly — most steps are idempotent diffs (no-op if nothing
  changed upstream).
- Never invent content to fill a gap — if a piece of ground truth is genuinely undocumented in the
  source code/SQL itself (not just in the vault), say so in the report instead of guessing.
- Treat this the same way the project's root `CLAUDE.md` treats code changes: fix the actual
  documented claim at its root, don't patch around it with a caveat note.
