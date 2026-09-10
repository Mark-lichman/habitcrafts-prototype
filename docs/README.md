# Docs index

GitHub renders this automatically when you open the `docs/` folder, so this is the page you land
on rather than a bare file list.

Three groups. If you are looking for something and do not know which file it is in, the fastest
route is not this page at all: **press `t` anywhere in the repo on GitHub** and type part of the
name. That opens the file finder and jumps straight there.

---

## Design — what the app looks like and how it behaves

| File | Size | What it is |
|---|---|---|
| [`design-direction.md`](design-direction.md) | 407 lines | **Read this first.** The point of view: paper and springs, the five signature moments, screen-by-screen direction. Decides things; overrules the brief in five marked places. |
| [`design-research-brief.md`](design-research-brief.md) | 1,979 lines | The evidence base. Audit of the shipping design system, exact palette values with computed contrast ratios, motion tokens, breakpoints, Flutter-web checklist. Reference, not a read-through. |

The build contract that turns these into code is **[`../prototype/README-buildnotes.md`](../prototype/README-buildnotes.md)** — token naming, component classes, JS hooks, and §12–13 on the app architecture.

---

## Architecture — how the code is meant to work

| File | Size | What it is |
|---|---|---|
| [`production-path.md`](production-path.md) | 178 lines | Whether this prototype can become the real front end. §1 holds the Flutter fork decision; §5 holds the review rules that keep the claim true. |
| [`authorization-and-taxonomy.md`](authorization-and-taxonomy.md) | 273 lines | The authorization model and the extraction taxonomy for uploads. |

---

## Go to market — not in this repository

ICP catalogue, the interview research plan and the evidence appendix live in **Google Drive**, not
here. This repository is public, and segment reasoning, kill criteria and competitive reads are not
things to publish.

Look for the three documents prefixed **`HabitCrafts GTM —`**:

1. **ICP Catalogue** — seven reusable tests for whether something is an ICP candidate, the five
   outreach streams, the qualification filters, two recorded rejections, and the PMF gates.
2. **Research Plan** — the 15-minute discovery interview programme: question bank, the paste-ready
   AI moderator system prompt, the scoring rubric, kill criteria.
3. **Evidence Appendix** — the citations behind every number in the two above.

The outreach tracker is the sheet **Design Partner Pipeline v2 (5 streams)**.

## Looking for something specific?

- **Why does the app look like this?** → `design-direction.md`
- **What are the exact colour or motion values?** → `design-research-brief.md`
- **How do I add a route, a view, or a component?** → `../prototype/README-buildnotes.md` §12–13
- **Can we ship this as the real front end?** → `production-path.md` §1
- **Who are we selling to?** → Drive: *GTM — 1. ICP Catalogue*
- **What do I ask in an interview?** → Drive: *GTM — 2. Research Plan* §4
- **Where did that statistic come from?** → Drive: *GTM — 3. Evidence Appendix*
