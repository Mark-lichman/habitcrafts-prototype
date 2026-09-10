# Authorization and extraction taxonomy

**Version:** 0.1 DRAFT · **Date:** 2026-09-08
**Reads:** `production-path.md` §4.4, `prototype/js/store.js`, `prototype/js/data-practices.js`, `scripts/smoke.mjs`
**Answers:** "who is allowed to see what, and what counts as a habit?"

Two rule sets, one document, because they are the same failure if left unwritten.
Evercred's most expensive defects came from a permission model that lived only in
implementers' heads: the same cross-org leak shipped seven times because nothing
anywhere said what keys a tenant. The extraction taxonomy is the identical risk on
the content side. Both are cheap now and expensive at year two.

Nothing here is built yet. This is the specification that invariants and evals get
written against, not a description of current behaviour.

---

## Part A: the authorization model

### A1. Roles

| Role | Is | Owns |
|---|---|---|
| **Creator** | The author whose material becomes a Practice (E1) | Sources, Practices, the cards inside them |
| **Learner** | The person who enrols and builds habits (E1/E3) | Their enrolment, their habits, their check-in history |
| **Operator** | A community that licenses a Creator's Practice (E2) | Spaces, and a *grant* over a Practice, never the Practice |
| **Anonymous** | Anyone holding a URL | Nothing |

`Advisor` is not a role. Tamra Wright is an advisor to the business, not a
principal in the system.

### A2. Objects, owners and tenancy keys

The tenancy key is the field that answers "whose is this?" and it is the only
field authorization may branch on.

| Object | Owner | Tenancy key |
|---|---|---|
| `Source` | Creator | `creatorId` |
| `Practice` | Creator | `creatorId`, **stored on the Practice itself** |
| Lesson / card / `checks[]` | Creator | via `practiceId` |
| `sourceRef.quote` | Creator | via `practiceId`, and see A5.3 |
| `Enrolment` | Learner | `learnerId` |
| `Habit` (incl. `why`, `history`) | Learner | `learnerId` |
| `Space` | Operator | `operatorId` |

**Three fields that look like tenancy keys and are not.** This is the Evercred
`recipientId` lesson transplanted before it costs anything:

- **`code`** is a bearer credential, not an identity. See A5.1.
- **`author`** is a display string. Two creators may share a name.
- **`sourceId`** identifies provenance, not ownership. Deriving a Practice's owner
  by joining through its Source is the join that gets dropped in a refactor.
  `Practice.creatorId` is denormalised deliberately, and A6 asserts the two agree.

Make `CreatorId` and `LearnerId` branded types. `recipientId` was mistaken for a
tenant key seven times at Evercred because the type system permitted the mistake.
A branded type makes the wrong thing uncompilable, and it is the cheapest item in
this document.

### A3. Grants

Read as: the actor may perform the action **only if** the condition holds.
Everything absent from this table is denied.

| Actor | Action | Condition |
|---|---|---|
| Creator | create/read/update/delete a Source | `source.creatorId === actor` |
| Creator | bind a Source into a Practice | owns the Source, and `rightsConfirmed` |
| Creator | read/edit/regenerate/remove a card | owns the Practice |
| Creator | publish a Practice | owns it **and** `readyToPublish()` |
| Creator | read `studioStats` / `ptrSeries` | owns it **and** cohort floor met (A5.2) |
| Creator | read an individual Enrolment row | **never** |
| Creator | read any Habit, `why`, or check-in history | **never** |
| Learner | read a published Practice's cards | holds an Enrolment for it |
| Learner | read `sourceRef` | holds an Enrolment, subject to A5.3 |
| Learner | create a Habit from a lesson | holds an Enrolment |
| Learner | read/edit/archive a Habit | `habit.learnerId === actor` |
| Learner | read a draft Practice | **never** |
| Operator | read a licensed Practice's cards | an active grant from the Creator |
| Operator | edit or republish a licensed Practice | **never** (see Q3) |
| Operator | read member habits | **never** |
| Anonymous | anything | **never** |

### A4. Defaults

1. **Deny is the default.** A mutation with no matching row in A3 fails closed.
   Evercred shipped two independent fail-open gates (`verification-credit-gate.ts`
   and delegate switch #7172) because nobody ever wrote this sentence down.
2. **Every mutation takes an actor.** `production-path.md` §4.4 records that
   `store.js` currently trusts its caller, by documented decision. That decision
   was correct for a prototype and is the first thing to reverse for production.
   The signature change is mechanical; doing it late is not.
3. **Authorization is decided once, at the store.** Not at render surfaces. The
   Evercred failure-reason leaks recurred at render surfaces rather than in the
   classifier, which is what happens when each view re-derives a decision. Views
   consume a decision. They never compute one.
4. **A denied read returns empty, not an error.** An error that distinguishes
   "does not exist" from "not yours" is an enumeration oracle over join codes.

### A5. Three defects present in the code today

These are not hypothetical. Each is live in `store.js` as written.

**A5.1 Join codes are guessable.** `codeFor()` derives the code from the title, so
"The Long Game" becomes `LONGGAME`. The title is public on the creator's own
website. Anyone who knows a Practice exists can guess its code and enrol.

The fix is two parts. Codes become random (a word-shaped code is fine, a
*title-derived* one is not), and a code stops being an authorization: it is a
bearer credential that mints an Enrolment, and the **Enrolment** is what A3 checks
thereafter. That separation is what makes a code revocable and rotatable without
ejecting everyone who already joined.

**A5.2 `studioStats` has no cohort floor.** `ptrOf` already refuses to report a
number for an immature cohort and returns `null` rather than a misleading zero.
That instinct is right and is not yet applied to *small* cohorts. With three
enrolments, `enrolled`, `week1` and `habits` describe identifiable individuals to
the creator, and a creator who knows who they sent the code to can read one
person's behaviour off the dashboard. Apply the same `null` discipline below a
floor of k enrolments (Q2).

**A5.3 `sourceRef.quote` carries source text to learners.** `smoke.mjs` asserts
every card has `sourceRef.page` **and** `sourceRef.quote`. That assertion is
correct and load-bearing: the quote is what makes a card verifiable, and
verifiability is the whole grounding eval in Part B.

It is also copyrighted book text. A card visible to a learner makes its quote
visible too, so a Practice is a partial reproduction of the source distributed
under a $99/year subscription. That may be exactly what a creator intends, since
they are the rights holder and they opted in. It should still be a decision the
creator makes explicitly rather than a side effect of provenance. See Q1.

### A6. Invariants to add to `scripts/smoke.mjs`

The existing file already asserts uniqueness of codes, refusal to publish
unreviewed, traceability of every card, and that the paywall never touches the
check-in. These extend it in the same style, and none require a browser.

```
practice.creatorId === sourceById(practice.sourceId).creatorId   // A2
codeFor(title) !== code                                          // A5.1
studioStats(p).enrolled === null  when cohort < k                // A5.2
every learner-visible card satisfies the A5.3 decision           // A5.3
no creator-facing selector returns `why`, `history` or an
  enrolment row with `mine` absent                               // A3
for every (role, object, action) triple: a denial unless A3 lists it
```

That last line is the important one, and it is why the table in A3 is a table.
Enumerate the matrix and assert the whole thing, rather than testing the cases
someone thought to test. Evercred's select-option defect (56 stored values
rendering blank) came from narrowing a list by reasoning instead of counting.

---

## Part B: the extraction taxonomy

`convert(source, outputs, prompt) → weeks` is the seam that survives to
production. What it may emit needs defining before a real model sits behind it,
or every prompt revision silently moves the target.

### B1. The three kinds

**Habit.** One observable behaviour, at one cue, small enough to do on the worst
day. Must be expressible as `behavior` plus `prompt`. If you cannot state the cue,
it is not a habit. Maps to `habitSuggestion`.

**Learning.** A claim from the source that explains why a behaviour works. Cannot
be checked in. Maps to the lesson `body`.

**Check.** A yes/no observation the learner can make about themselves. Not a
habit, because it is not repeated on a schedule. Maps to `checks[]`.

**Restatement.** Adds neither a new behaviour nor a new causal claim relative to a
card already extracted from this source. Not a fourth output. It is the reject
class, and it is the one the model will produce most.

### B2. Granularity is calibrated, not described

The six seeded habits in `data.js` are the gold standard, because they already
encode the taste this product is built on:

> "Ten push-ups" / "After I put the kettle on"
> "Floss one tooth" / "After I brush my teeth"

Right grain: one action, one cue, impossible to talk yourself out of. "Exercise
daily" is wrong grain and would fail checks 3 and 4 below. Use these six as the
calibration set when validating a judge, and add to the set rather than rewriting
the definition when a disagreement surfaces.

### B3. The rubric, as discrete binary checks

Current practice is to decompose a rubric into independent binary checks rather
than ask for one holistic verdict, and to score pass/fail rather than 1 to 5.
Moving from a three-point scale to binary raises agreement with human labels by
roughly twenty points. A card passes only if all seven pass.

| # | Check | Fails when |
|---|---|---|
| 1 | **Grounded** | `sourceRef.page` missing, or the quote does not appear in the source |
| 2 | **Attributed** | The claim is the model's world knowledge, not this author's |
| 3 | **Actionable** | Names no single observable behaviour |
| 4 | **Cued** | No prompt or trigger |
| 5 | **Minimal** | Not doable on the worst day |
| 6 | **Distinct** | Restates another card in the same Practice |
| 7 | **In scope** | Derived from a different source than the one bound |

**Check 2 is the one that has already burned us.** Granola, on this exact task
shape of extraction over uploaded content, handed the moderator's line to a
participant and invented a credential that did not exist. A creator publishing a
Practice under their own name, containing advice they never gave, is the worst
failure this product can have. Check 1 is what makes check 2 mechanically
detectable rather than a matter of taste.

### B4. What the evals are

Split by machinery. Schema validity is a test. Grounding is an eval.

| Check | Kind | Where |
|---|---|---|
| Output matches the card schema | Test | `smoke.mjs` |
| Parse produced usable text | Test | ingestion, verdict kept **separate** from extraction |
| Quote appears verbatim in source | Test | deterministic string search, no judge needed |
| Checks 2 to 6 above | Eval | judge, validated against hand labels first |
| Run-to-run variance on one source | Eval | same source N times, measure set drift |

The judge itself gets validated against your labels before its verdicts are
trusted, using the hand-curated set of roughly 20 to 30 varied uploads. An
unmeasured judge grading an unmeasured extractor teaches nothing while feeling
like progress.

---

## What would break the claim

Review rules, in the style of `production-path.md` §5.

- **A mutation in `store.js` that does not take an actor.** The moment one exists,
  A4.2 is gone and authorization has moved back into the callers.
- **A view branching on a role.** Views consume decisions. See A4.3.
- **Authorization branching on `code`, `author` or `sourceId`.** See A2.
- **A creator-facing selector that returns an enrolment row.** See A3.
- **A second definition of what a habit is.** There is one, B1, and the judge
  prompt, the Bindery UI copy and the taxonomy must all cite it. Two definitions
  is how the eval target starts moving underneath the numbers.
- **A card reaching a learner without a `sourceRef`.** Already asserted; keep it.

---

## Open questions

Genuinely forks, not things to decide by default.

**Q1. Quote exposure.** Do learners see `sourceRef.quote`, a page citation only, or
a quote under a length cap the creator opts into per Practice? Grounding wants the
quote. Rights want the citation. The creator owns the material and may simply
choose, but the product needs a default and the default is a rights posture.

**Q2. Cohort floor.** What k suppresses `studioStats`? Five is conventional.
Lower is friendlier to a creator's first cohort of twelve free partners, which is
precisely the population where individuals are most identifiable.

**Q3. Does an Operator inherit or copy?** If E2 grants an Operator rights *over*
the Creator's Practice, that is a delegation model, and Evercred's delegate lane
is the record of how that goes when the switch defaults open. If an Operator
instead gets a licensed *copy*, edits diverge and the Creator loses the ability to
correct a card everywhere. E2's riskiest assumption is licensing, and this is the
architectural half of it.

**Q4. Habit export.** May a learner export habits with the originating lesson text
attached? That is Practice content leaving the subscription boundary, and it is
also the thing a learner most reasonably expects to be able to keep.
