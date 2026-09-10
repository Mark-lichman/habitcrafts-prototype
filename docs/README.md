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

## Go to market — who we sell to and how we find out

| File | Size | What it is |
|---|---|---|
| [`icp-catalog.md`](icp-catalog.md) | 202 lines | **Start here for anything segment-related.** §1 is seven reusable tests for whether something is an ICP candidate at all. Then the five streams, the qualification filters, two recorded rejections, and the PMF gates. |
| [`research-plan.md`](research-plan.md) | 758 lines | The 15-minute discovery interview programme. §4 question bank, §6 the paste-ready AI moderator system prompt, §8 the scoring rubric, §9 kill criteria. |
| [`research-evidence.md`](research-evidence.md) | 271 lines | The citations behind every number in the two files above. §6 states what was lost when the original research digest went with a cleaned scratchpad. |

**Named prospects are not in this repository.** The outreach tracker and the per-company
judgements live in Google Drive, because this repo is public and assessments of real companies
do not belong in it. `icp-catalog.md` holds the reasoning; the sheet holds the names.

---

## Looking for something specific?

- **Why does the app look like this?** → `design-direction.md`
- **What are the exact colour or motion values?** → `design-research-brief.md`
- **How do I add a route, a view, or a component?** → `../prototype/README-buildnotes.md` §12–13
- **Can we ship this as the real front end?** → `production-path.md` §1
- **Who are we selling to?** → `icp-catalog.md`
- **What do I ask in an interview?** → `research-plan.md` §4
- **Where did that statistic come from?** → `research-evidence.md`
