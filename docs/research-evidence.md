# Evidence appendix

**Why this file exists.** The research behind `research-plan.md` ran as five parallel agent
studies and was condensed into a 1,044-line digest held in a session scratchpad. **That
scratchpad was cleaned and the digest is gone.** The plan it produced survived because it was
committed; the citation trail did not. This file reconstructs the load-bearing numbers and
their sources so any decision in the plan, the tickets or the outreach material can be
re-justified without re-running the research.

It is an appendix, not the digest. It carries the claims that decisions rest on, not
everything that was found.

**Labels:** VERIFIED = read on a primary or official source · REPORTED = secondhand ·
VENDOR = the vendor's own claim · INFERENCE = reasoning, not a cited fact.

---

## 1. AI-moderated interviews — the finding that decided E1

**The convergent result: AI probing adds volume, not new content.**

- **Barari et al. 2025**, arXiv:2504.13908, **N = 1,800** quota-sampled to US ACS margins.
  AI probing raised total words, unique words and Shannon entropy **but did not raise KL
  divergence or lexical diversity** — i.e. no evidence that new information entered the
  sample. Also: **81% of respondents confirmed the chatbot's coding of their own answer while
  only 72% of independent human codings agreed** (respondents acquiesce to the AI); dropouts
  roughly doubled under confirmation probing. REPORTED (preprint).
  https://arxiv.org/abs/2504.13908
- **Cuevas Villalba et al. 2025**, *Proc. ACM Hum.-Comput. Interact.* 9(2), **N = 399**.
  A **rule-based** chatbot matched LLM chatbots on engagement — much of the apparent "AI
  effect" is the form→chat interface change. Verbatim: responses *"rarely capture
  participants' specific motives or personalized examples, and thus perform poorly with
  respect to richness… a cautionary tale."* Also **low inter-rater reliability between LLMs
  and humans** on quality, which undermines any vendor metric produced by LLM-as-judge.
  Participants preferred a human interviewer in every condition. PEER-REVIEWED.
  https://doi.org/10.1145/3710947 · https://arxiv.org/abs/2309.10187
- **Kuric et al. 2024**, *Int. J. Human–Computer Interaction*, N = 60. GPT-4 real-time
  follow-ups *"effectively elaborated details about existing findings"* but **"revealed fewer
  new usability issues"** than a static pre-written follow-up list. PEER-REVIEWED (note: two
  authors affiliated with UXtweak, a vendor).
  https://doi.org/10.1080/10447318.2024.2427978
- **Wuttke et al. 2025**, LaTeCH-CLfL (ACL), N = 11 — tiny, but the only true head-to-head.
  **88% of "failed to follow up on a surprising or unclear answer" violations were the AI's**;
  **67% of "took a position on whether the answer was right" violations were the AI's**,
  typically flattering — documented sycophancy in a controlled study. Participants found the
  AI interview less interesting (2.5 vs 3.9). PEER-REVIEWED (workshop).
  https://aclanthology.org/2025.latechclfl-1.17/

**Synthesis, and the basis for Decision 2 in the plan: AI is a depth recorder, not a depth
generator.**

**Where AI does win — against a survey, not a human:**

- **Xiao et al. 2020**, *TOCHI* 27(3) Art. 15, N = 582. **Completion 54% vs 24.2%** for
  Qualtrics (2.2×); informativeness +39%; gibberish/bogus responses **2.48% vs 9.00%**;
  personal-information disclosure **32.62% vs 15.67%**. **But response rate was LOWER —
  84.6% vs 91.2%** — with a 30% abandon-on-sight rate early in fielding. PEER-REVIEWED.
  https://doi.org/10.1145/3381804
- **Chopra & Haaland**, CESifo WP 10666, N = 381. **>95% voluntarily answered every question**
  of a 30-minute unincentivised text interview with no fatigue gradient; **~5× unique themes
  vs a single open-ended survey question**; saturation at N ≈ 25; near-zero hallucinations
  across 18,000 hand-coded items. **Critical caveat: never benchmarked against a human
  interviewer.** REPORTED (working paper).
  https://www.ifo.de/DocDL/cesifo1_wp10666.pdf

**The only real human benchmark:** **Geiecke & Jaravel**, accepted at *Review of Economic
Studies*. 20 transcripts blind-graded twice by Harvard/LSE sociology PhD students on 1–5 where
**3 = "average human expert"**. **Mean 2.95; no transcript scored 5.** Their conclusion: *"the
AI-led interviews never match the best human experts."* REPORTED (working paper).
https://poid.lse.ac.uk/textonly/publications/downloads/poidwp120.pdf

**Practitioner evidence — NN/g's first-hand test** (Marvin and UserFlix, 10 research leaders
across 8 countries). Only 3 of 10 found the conversation natural; **interview length ranged
13–56 minutes with no ability to hit a target duration**; *"they follow the script, not the
insight"*; sycophancy noticed by participants (*"if we see a person act like this we say okay,
sociopath"*); participants withheld information over data-handling uncertainty. **Explicit
do-not-use list: deep domain knowledge · early/generative discovery · per-participant paths ·
screen-sharing or task demonstration.** VERIFIED (independent).
https://www.nngroup.com/articles/ai-interviewers/

**Why E1 is human-moderated — the disclosure mechanism reverses.** **Lucas et al. 2014**,
*Computers in Human Behavior* 37:94–100 (~873 citations): believing you are talking to a
computer produced lower fear of self-disclosure and lower impression management. **The
mechanism is reduced fear of being JUDGED** — which helps for shame-laden disclosure and does
not transfer to status-laden disclosure. **Kim et al. 2022**, *Journal of Service Research*,
identifies the split: avoiding negative judgment favours AI; seeking social reward favours
humans. **Liu et al. 2023**, *JCMC* 28(4) zmad028, N = 134: under AI evaluation, applicants
showed **lower social presence, higher uncertainty and shorter answers**.
**EVIDENCE GAP, stated by the field's own review (Tirumala et al., COLM 2025, arXiv:2509.01814):
*"Current literature does not yet explore"* whether AI interviewers can build rapport — and no
study exists at all on AI interviewers with experts about their own work.**

---

## 2. Interview methodology

- **Saturation: Hennink & Kaiser 2022**, *Social Science & Medicine* 292:114523. Systematic
  review of empirical saturation tests found saturation at **9–17 interviews**, in studies with
  homogeneous populations and narrow objectives. **Code saturation ~9; meaning saturation
  ~16–24.** PEER-REVIEWED.
  https://www.sciencedirect.com/science/article/pii/S0277953621008558
- **Structure improves validity (analogy from selection, not discovery):** Sackett et al. 2022
  corrected re-analysis gives **.42 structured vs .19 unstructured** predictive validity — the
  correction widened the gap.
- **Van Westendorp PSM needs 400 consumer / 200 B2B** for ±5–7%; at 10–20 responses it is
  **"directional only"** (Pritchard's own framing). **Gabor-Granger needs ≥100 per segment** —
  which is why the plan does not run it. REPORTED.
  https://www.5circles.com/van-westendorp-pricing-the-price-sensitivity-meter/
- **Rapid vs thematic analysis:** rapid findings overlapped **79%** of thematic findings while
  thematic overlapped only **63%** of rapid's; rapid was **2.1× faster** in a 2026 replication
  (54 vs ~113 hours). REPORTED.
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6194404/
- **Framework Analysis (matrix method)** — Gale et al., *BMC Medical Research Methodology*
  2013;13:117. Rows = participants, columns = themes. Built for cross-case comparison, which is
  why the plan uses it over reflexive thematic analysis. PEER-REVIEWED.
  https://link.springer.com/article/10.1186/1471-2288-13-117
- **NN/g on question craft** — the six mistakes, and the leading-question rewrites the question
  bank follows. VERIFIED.
  https://www.nngroup.com/articles/interview-questions-mistakes/ ·
  https://www.nngroup.com/articles/critical-incident-technique/
- **Incentives: the dominant effect is SELECTION, not response.** Meta-analysis of **46 RCTs,
  109,648 participants**: money RR 1.25, vouchers RR 1.19, **lottery RR 1.12** — lotteries
  convert worst, which is why the plan pays everyone. REPORTED.
  https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0279128
- **Short sessions do not pro-rate down.** User Interviews data across ~20,000 completed
  projects: **remote sessions under 30 minutes averaged $70**. Participants price in fixed
  setup cost. VERIFIED (vendor primary data).
  https://www.userinterviews.com/blog/research-incentives-report
- **No-shows:** 14,210 moderated studies, **8.6% overall, B2B remote 10.4%** (the worst cell).
  Incentive size correlates at r ≈ −0.80 but explains only ~25% of variance.
  https://measuringu.com/typical-no-show-rate-for-moderated-studies/
- **Reminders:** Cochrane review (Gurol-Urganci et al.), 8 RCTs / 6,615 participants — SMS vs
  none **RR 1.14 (95% CI 1.03–1.26)**; SMS vs phone call indistinguishable but **55–65%
  cheaper**. **No RCT of SMS vs email exists.**
  https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD007458.pub3/full

---

## 3. Outreach and reply-rate benchmarks — the basis for the PMF gates

- **Instantly 2026 Cold Email Benchmark Report** (data Jan–Dec 2025, "billions of
  interactions"): **average reply 3.43%; top 25% ≥5.5%; top 10% ≥10.7%.** 58% of replies come
  from email 1. Top campaigns stay **under 80 words**. VENDOR (large N).
  https://instantly.ai/cold-email-benchmark-report-2026
- **Belkins 2026**, **7.5M cold emails in 2025 → 0.45% overall reply** under a stricter
  methodology. By company size: **0–10 employees 0.72% vs 10,000+ 0.22%** — solo operators
  reply ~3× better. Implies **~6,250 emails per booked appointment** for industrialised
  outreach. VENDOR.
  https://belkins.io/blog/cold-email-response-rates
- **Woodpecker**, 20M+ emails: **campaigns under 50 contacts reply at 5.8% vs 2.1% for
  1,000+**; **advanced personalisation ~17–18% vs 7–9% basic**; 3–5 follow-ups 8.3% vs 4.1%.
  VENDOR.
  https://woodpecker.co/blog/cold-email-statistics/
- **Expandi 2026 LinkedIn**, 13.2M connection requests / 6.7M messages, May 2025–Apr 2026:
  **28.5% connection acceptance, 10.4% post-connection message reply** (~3× cold email);
  connection-note reply fell 3.5% → 2.2% over the year. VENDOR.
  https://expandi.io/blog/linkedin-outreach-benchmarks-2026/
- **The closest measured analogue — podcast guest pitching.** Podchaser 2026: **median
  acceptance 5%, median response 17.5%**, range 1–90%; **68% of producers name AI-generated
  template pitches as the #1 trigger for an immediate no.** REPORTED (self-reported survey).
  https://www.podchaser.com/articles/podcast-insights/podcast-pitching-statistics
- **Podseeker, 8,757 real pitches — reply rate falls with the TARGET's audience size:**
  under 1K listeners **3.9% booking / 11.9% response** · 1K–5K 2.2% / 12.9% · 5K–10K 1.6% /
  13.6% · 10K–50K 0.6% / 10.0% · 50K+ **0.4% / 8.4%**. Sub-1K books at ~10× the rate of 50K+.
  **This is the basis for targeting 1k–10k audiences deliberately.** REPORTED.
  https://www.podseeker.co/blog/how-to-find-out-how-many-listeners-a-podcast-has
- **Association email** (Higher Logic 2025–2026, ~1,500 associations, >2bn emails):
  **33.54% open, 2.68% click**; smaller targeted sends outperform blasts. VERIFIED.
  https://www.higherlogic.com/news/higher-logic-releases-2025-2026-association-email-benchmark-report/

**Why creators should not be paid cash:** authors and coaches **pay booking agencies
$1,500–$4,000/month** for the chance to be interviewed. A $50 incentive competes against a
channel they already buy. REPORTED (promotional source, but the market structure is the
argument).

---

## 4. Segment need and saturation evidence

**Leadership & L&D — the strongest need case on the list.**
- **Under 10% of leadership training transfers to the workplace** (classic research);
  **10–15%** in more recent estimates. REPORTED.
  https://www.aimforbehavior.com/library/only-10-to-15-percent-of-what-people/
- **70% of leadership programmes don't change behaviour**; 40–50% of new leaders fail within
  18 months; only 11–18% of organisations believe programmes deliver sustained results.
  REPORTED.
  https://research.com/careers/leadership-training-statistics
- **75% of organisations see no improvement without follow-up, and only 8% even measure
  impact.** These two together are the commercial argument: HabitCrafts is follow-up plus
  measurement. REPORTED.

**Language tutoring — the verified gap.**
- Preply's own help centre: Scenario Practice is *"currently available to a small group of
  **English learners** who have an active **subscription** with a tutor."* One language out of
  90+, behind a subscription, in beta. VERIFIED.
  https://help.preply.com/en/articles/11813414-scenario-practice-on-preply-extra-speaking-support-between-lessons
- Announced broadly via press release, which is why the category needs no justifying.
  https://www.prnewswire.com/news-releases/preply-announces-new-ai-powered-features-to-guide-the-future-of-personalized-learning-in-a-human--ai-world-302522018.html

**Exam prep — deadline plus a public metric.**
- **JLPT N2 pass rate 35%, N1 28%** (N1 Japan-based 24.3%); **N3 ≈ 600h and N2 ≈ 1,200h from
  zero**; the named reason candidates fail is **poor planning**, i.e. adherence. REPORTED.
  https://media.yolo-japan.com/en/2169/ · https://cotoacademy.com/how-to-study-for-the-jlpt/
- Coto Academy publicly claims its students have a **58% higher pass chance than the global
  average** — prep providers already compete on the number a take-rate metric would feed.
  VENDOR.

**Course creators — the acknowledged completion problem.**
- MOOC completion **3–15%, median ~12%**; self-paced on marketplaces **under 15%**; cohort-based
  with live sessions **50–80%**; **community presence lifts completion 42.6% → 65.5%**. Kajabi
  creators have earned $6bn+ while completion sits at 12–15%. REPORTED.
  https://www.ruzuku.com/learn/articles/course-completion-rates

**Competitive saturation — who already closed the gap.**
- Direct book-to-habit: [Actium](https://apps.apple.com/us/app/actium-books-into-actions/id6760178039)
  ($34.99/yr, solo developer, launched Mar 2026, 7 ratings),
  [Mentorist](https://apps.apple.com/us/app/mentorist-learn-act-achieve/id1262373262),
  [TempleReads](https://apps.apple.com/us/app/templereads/id6739692275).
- **Atoms (James Clear)** — the E1 thesis already executed by one author for one book, built
  with the Tiny venture studio, **$120/year**, turning a $27 book into recurring revenue.
  Simultaneously the best validation and the sharpest threat: a large author's alternative is
  to build their own. REPORTED.
  https://www.builtbyfoundry.io/blog/james-clear-atoms-app-atomic-habits-empire
- **The conversion is commodity.** Mindsmith turns a long PDF into editable interactive modules
  in ~4 minutes; Coursebox generates module structure, lessons and quizzes from documents.
  Neither produces a habit, a bridge, or provenance — which is where the differentiation has to
  live. REPORTED.
- Mindfulness consumer-side is closed (Calm, Headspace, Insight Timer, Waking Up, Ten Percent
  Happier). Fitness coach tooling is closed (TrueCoach, Trainerize, Everfit, PT Distinction,
  Hevy Coach) — and a fitness coach has a programme, not a corpus, which is why that segment
  was dropped on structure rather than competition. MY READ.

---

## 5. Tooling — the short version

- **Specialist AI-moderation platforms are enterprise-priced:** Listen Labs ~$20k base +
  $300–400/interview; Outset ~$20k/seat/yr; Strella $10–25k+/study; Conveo from ~$990/mo to
  ~$45k/yr; Maze's AI Moderator is Enterprise-only. REPORTED (mostly third-party, sales-gated).
- **Affordable and self-serve:** **UserCall** — Lite $89/mo (**12-min cap, disqualifying**),
  **Core $199/mo** (300 credits, 25-min cap), ~$3–9 per interview, with PostHog / Mixpanel / GA
  / Amplitude / Segment integrations and a stated no-training-on-customer-data policy.
  **Respondent** bundles an AI moderator at $40 B2C / $80 B2B per **completed** session and
  charges nothing for no-shows. **User Intuition** publishes $30 per voice interview with a
  $0 starter tier. VERIFIED from pricing pages where noted.
- **Fathom** free tier covers human-moderated calls (unlimited recording and transcription).
- **Avoid Otter** — its published policy trains on de-identified audio **and on transcriptions
  that are not de-identified**, with no described opt-out.
- **Wondering shut down 23 September 2025.** A reminder that annual prepay in this category
  carries vendor-mortality risk.
- **Search results in this category are dominated by vendor-authored "best AI interview
  platform" comparisons.** The genuinely independent sources found were NN/g, Contrary
  Research, MeasuringU, arXiv and Carl Pearson. Treat any "2026 benchmark report" from a vendor
  domain as marketing.

---

## 6. What was in the digest and is not here

Honest list, so nobody assumes this file is complete:

- The full question bank with permitted probes per stem — **this survived, in
  `research-plan.md` §4.**
- The complete rubric with all scales — **survived, §8.**
- The AI moderator system prompt — **survived, §6.**
- Per-vendor feature matrices for eight AI interview platforms, recruiting cost models per
  channel, scheduling-tool pricing comparisons, and the consent/regulatory analysis. **Lost.**
  The consent analysis was deliberately reduced to four operating rules before the plan was
  written, so little of consequence went with it.
- Roughly 60 further citations supporting secondary points. **Lost.** The claims above are the
  ones decisions actually rest on.
