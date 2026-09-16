# What a good extracted lesson looks like

**Version:** 0.1 · **Date:** 2026-09-14
**Reads:** `authorization-and-taxonomy.md` §B, `extraction-prompt-language.md`, `../scripts/evals.mjs`
**Answers:** "what are we aiming at, and how would we know we missed?"

Established from the corpus rather than from argument. Nine documents from
`Desktop/Japanese` were classified before any of this was written, because a standard
written from filenames would have been wrong in three specific ways that the classification
run caught.

---

## 1. Was there an existing standard to use? Partly.

**Yes for difficulty and for the words themselves.** These are published, free, and should
not be re-derived:

| Resource | Gives |
|---|---|
| jmdict-simplified (JMdict, KANJIDIC2; MIT JSON) | real readings, senses, kanji jōyō grade |
| kuromoji.js | tokenisation and readings in Node |
| Token Miss Rate, arXiv 2506.04072 | `tokens_above_level / total_tokens`, correlates with human judgement at rho 0.78 |
| jReadability (Lee and Hasebe) | six-level difficulty for L2 readers, from a public formula |
| JLPT N5 to N1, JF Standard Can-do (A1 to C2) | level anchors and the language for an objective |

**No for faithfulness.** Nothing published says whether an extraction is true to *this*
deck rather than to a model's memory of みんなの日本語. That is checks 2 to 6 of §B3 and it
had to be established here.

**And the textbook's own taxonomy does not fit this corpus.** みんなの日本語 publishes a unit
structure (文型・語彙・例文・会話・練習A/B/C・問題) and it was the obvious frame. Classified
against it, **three of nine documents contain none of those sections at all**, and the rest
contain only 語彙 and sometimes 文型. Mark's material is teacher-made slide decks and
third-party worksheets, not textbook extracts. A standard built on the textbook's sections
would have been checking for things that are not there.

---

## 2. The taxonomy that does fit: what a document affords

Classification returns a triple, and the triple is the taxonomy. Nine documents, three
groups:

| Type | rules | items | exercises | In the corpus |
|---|---|---|---|---|
| **class-slide-deck** | yes | yes | almost never | 第1課, 第3課, 第13課, Verb_Group |
| **vocabulary-sheet** | **no** | yes | no | L6-roma, L26-roma, Counting-object, Travel_Phrases |
| **grammar-reference** | yes | yes | no | L1_L13_まとめ |

**The load-bearing number: eight of nine documents afford no exercises.** Only 第3課 does.
So in this product, almost every drill a learner ever sees is generated, not extracted. That
is not a defect. It is the central fact the standard has to be built around.

**Why the triple is an eval and not metadata.** `evals.mjs` §2 already says an *empty*
bucket is the cheapest signal detection went wrong. The inverse is sharper: a *full* bucket
in a document that affords nothing to fill it means the contents were invented. A vocabulary
sheet has no grammar section. If rules come back from one, they came from the model's
knowledge of Japanese rather than from the upload. That is §B3 check 2, made mechanical,
free, and impossible to argue with.

---

## 3. Extracted and generated are different things

This is the standard's spine, and the corpus forced it.

`_みん日_第1課.pdf` affords no exercises. The pilot corpus built from it contains sixteen,
each carrying a `page`, and §1 asserts every one of those pages exists. The harness was
certifying provenance for content the deck does not contain.

|  | **Extracted** | **Generated** |
|---|---|---|
| What | rules, items, properNouns, irregulars | lessons, exercises, habitSuggestions, questions |
| Grounding | **direct**: page plus verbatim quote | **transitive**: names the rule or item it drills |
| Carries | `page`, `quote` | `derivedFrom`, never a `page` |
| May contain | only what is on the page | only material that was extracted |
| Tested by | quote appears on cited page (`evals/ground.mjs`) | closed-world vocabulary (`evals.mjs` §10) |
| Fails when | the quote is not on that page: **invention** | it uses a word nothing taught: **a gap** |

A `page` on generated content makes authored material look sourced, which is the one thing
the grounding rule exists to prevent. Both tests already exist. Only the naming was missing.

---

## 4. The standard, as things a lesson must satisfy

Each is a check that runs, and each is here because something failed, not because it sounded
wise. The section numbers are `scripts/evals.mjs`.

**Grounded.** Every extracted card quotes its page verbatim, typos included. The deck writes
`Kimsan wa SUMSUNG no shain desu`; the card quotes it that way. Matching is exact after NFKC
and never fuzzy, because a fuzzy match forgives the typo and, in forgiving it, loses the
ability to detect a quote that was never there. *Verified: 14 of 14 on the cited page.*

**Taught before asked.** Every word in an answer is one the practice introduced. §10. This
found `やまだ` demanded in five places and `わたし` in three, taught in neither case, in a
corpus that had been hand-made and reviewed.

**Read correctly.** Kana determines its own reading, so the reading is a test, not an
opinion. One romanisation scheme, modified Hepburn with macrons, declared once in
`scripts/lib/kana.mjs`. A name that romanises to its source spelling rather than its reading
(キム is Kim, not kimu) declares that per term, so a genuinely wrong reading cannot hide in
the exemption. §9.

**Wrong for a written-down reason.** Every distractor traces to a `trap` on a rule or item,
or an `expected` on an irregular. §11. A distractor exploiting an error nobody recorded
teaches nothing and makes the exercise easier, which is worse than omitting it.

**Ordered by dependency.** No lesson leans on a pattern a later lesson introduces. §4.
Extraction reorders (第1課 introduces nationality on page 1 and the sentence that uses it on
page 3), and reordering is only safe if something checks it.

**Emphasis where the cost is.** Where a kind declares `emphasises`, those forms get their
own recurring drill and appear in real exercises. §2. Three irregulars mixed among seven
regulars get one seventh of the contact, for the forms that decay fastest.

**Sized to a budget.** The smallest offered session fits some real unit of work. §7.

**Sayable to a learner.** Name the script, never "kana". §6b.

---

## 4b. What the second and third corpora changed

The standard above was written from one hand-made corpus. Running real extraction over three
more uploads moved it, and recording how is the point of keeping this file.

**Six checks failed on the first generated corpus, and half of them were the checks.** Three
assumed every language document is a class deck: a vocabulary sheet was asked for grammar it
does not contain, for an exceptions drill with no exceptions to drill, and had its discern
answer *index* read as a word ("0 reads 0"). The affordance triple in §2 exists because of
that, and so does its inverse: a full bucket the document cannot fill is the model inventing.

**One was a real bug in the transliterator.** ビール is `bīru`. Long i written with the
katakana length mark is `ī`; long i written いい is `ii`. One table was doing both jobs, and it
called the model wrong when the model was right. A check that fails a correct answer does more
damage than no check, because it trains you to stop reading the failures.

**Extraction is two calls, and the constraint that forced it was a gift.** The combined schema
was rejected as too large to compile. The split that fixed it is the split §3 already wanted:
extract from the pages, then generate from the extracted cards **with the document out of
context**. "Generated content may only use extracted material" stopped being a rule in a prompt
and became a fact about what the model can see.

**Two rules moved from memory into the suite**, because a rule held in memory lasts as long as
the memory. No em or en dash in anything a learner reads: 58 were removed from this repository
by hand, and the first generated corpus put one back in a shelf title. And a title is a name,
not a summary: that same corpus came back called "koko / soko / asoko — kochira series, floors,
dochira, ~no~, numbers and ikura", which is what `topics` is for.

**One finding was in the hand-made pilot, which had been reviewed.** Slide 11 writes SUMSUNG,
the deck's own typo, and the exercises quietly taught the correct SAMSUNG. Correcting a brand
name for a learner is right. Doing it undeclared has the shape of an invention, because the
corpus asserted Latin text the source does not contain. It is declared now, with the quote
keeping the typo so grounding stays exact.

## 5. What is deliberately not in the standard

**No confidence scores and no self-assessment.** A model's view of its own output is not
evidence. `research-plan.md` §8 Decision 5 records the same conclusion on the interview
side: read the transcripts, not the summaries of the transcripts.

**No 1-to-5 scales.** §B3 already settled this; binary raises agreement with human labels by
roughly twenty points, and the hard part is rubric consistency rather than resolution.

**No judge yet.** What is left for one after the checks above is genuinely narrow:
grammaticality of a sentence nobody wrote down, whether an option set covers the answers a
real learner would give, and attribution. A judge arrives when there are validated hand
labels to measure it against, and it arrives reporting true-positive and true-negative rates
separately, because raw agreement is meaningless under class imbalance.

---

## 6. Two open questions this raised

**Q5. Rights on third-party worksheets.** Three documents are Langoal-branded free
downloads, not Mark's material. `data-japanese.js` sets `rightsConfirmed: true`, and §A5.3
already flags that a card's quote carries source text to learners. For a creator's own deck
that is their decision to make. For a third-party worksheet it is not. This does not block
personal use and it does block E1 distribution.

**Q6. Does a picture-only slide have a quote?** Slide 11 of 第1課 is a photograph of Mr. Kim
with no sentence under it, and it is the describe-drill the deck is built on. Grounding
currently wants text. Either such a card cites the page without a quote, which weakens the
test, or it carries a described-image quote, which is model output being matched against
model output. Neither is obviously right.

---

## What would break this

- **A `page` on generated content.** See §3. It is the difference between a citation and a
  costume.
- **A fuzzy quote match.** See §4. It trades the only invention detector for tidier output.
- **A second definition of habit, or of the grain of a rule.** §B1 and §B2 hold those.
- **A check relaxed to make a build green.** A red check for a known defect is the correct
  state. Every red in the first run of §9 to §12 was triaged into "the data is wrong" or
  "the check is wrong" with the reason written next to it, and three of six were the checks.
