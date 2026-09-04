/* ============================================================================
   HabitCrafts — data-practices.js
   FIXTURES FOR THE KNOWLEDGE LAYER: sources, Practices, enrolments, Spaces.

   Kept out of data.js so the habit layer's fixtures stay readable and so this
   whole file can be deleted in one move when a real backend arrives. Nothing
   here is imported by a view — persistence.js seeds the store from it and the
   store is the only thing views talk to.

   ------------------------------------------------------------------------
   WHY THE SOURCES ARE INVENTED BOOKS
   ------------------------------------------------------------------------
   The business case behind E1 is written against a real book (see issue #2).
   The prototype is not, and deliberately so.

   Every generated lesson in this app carries a provenance line pointing at a
   chapter, a page and a verbatim passage. In a simulation those passages are
   written by us. Attaching invented quotations to a real author's name — in a
   public repo, on a public Pages deployment — is precisely the failure mode
   issue #8 exists to prevent, and it would be a strange thing to do in the
   very feature whose whole purpose is provenance.

   So the fixtures use stand-ins of the same shape: a behavioural business book
   for E1, an institute's practitioner canon for E2, a pasted article for E3.
   The screens are identical either way; only the trust exposure differs.
   ========================================================================= */

/* --------------------------------------------------------------------------
   A DETERMINISTIC LITTLE RANDOM
   Same numbers on every reload, which is what makes a cohort chart worth
   looking at twice. Same technique data.js uses for habit histories.
-------------------------------------------------------------------------- */

function lcg(seedString) {
  let s = 0;
  for (let i = 0; i < seedString.length; i++) s = (s * 31 + seedString.charCodeAt(i)) >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  const p = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* --------------------------------------------------------------------------
   SOURCES
   What a person brought to the Bindery. `pages` and `chapters` exist so the
   provenance line has something real to point at within the fixture.
-------------------------------------------------------------------------- */

export const sources = [
  {
    id: 'src-longgame',
    title: 'The Long Game',
    author: 'R. Halloran',
    kind: 'pdf',
    pages: 246,
    blurb: 'A book about building things that outlast the quarter they were started in.',
    addedAt: isoDaysAgo(21),
    rightsConfirmed: true,
    /* Which canned lesson set the Bindery produces from this source. */
    corpus: 'longgame',
  },
  {
    id: 'src-northbeam',
    title: 'Outcome-Led Discovery — the practitioner canon',
    author: 'Northbeam Institute',
    kind: 'library',
    pages: 118,
    blurb: 'The method members are certified in, and then mostly stop using.',
    addedAt: isoDaysAgo(9),
    rightsConfirmed: true,
    corpus: 'northbeam',
  },
];

/* --------------------------------------------------------------------------
   THE CANNED CORPORA
   What "conversion" produces. In production this is a model call; here it is
   two hand-written sets, so the screens can be reviewed without anyone
   pretending the generation quality is the thing under test. (E1 fakes the
   conversion for its first cohort for the same reason — issue #2.)

   Every lesson carries:
     sourceRef      the provenance line's content: chapter, page, verbatim quote
     checks         recall checks (output 1b) — each with its OWN sourceRef,
                    because a check whose answer is not locatable in the source
                    must not exist [#5]
     habitSuggestion  the bridge (the only output that reaches the habit layer)
-------------------------------------------------------------------------- */

const CORPORA = {
  longgame: {
    weeks: [
      {
        n: 1,
        title: 'Stop optimising the quarter',
        lessons: [
          {
            key: 'lg-1',
            title: 'Name the thing that compounds',
            minutes: 4,
            standfirst: 'Most work resets to zero every quarter. Find the part that does not.',
            body: [
              'Almost everything on your list this week will be worth nothing in a year. That is not a criticism of the list — most work is maintenance, and maintenance is how the lights stay on. But somewhere in the same week there is usually one thing that accumulates: a relationship, a piece of writing, a system that will still be paying out long after you have forgotten building it.',
              'The trouble is that the compounding thing never looks urgent. It has no deadline, nobody is waiting on it, and it will still be there tomorrow. So it loses, every day, to things that are merely loud.',
              'The fix is not discipline. It is naming it. Once the compounding thing has a name you can put it somewhere in the day, and a thing with a place in the day stops competing with the noise.',
            ],
            sourceRef: {
              chapter: 'Ch. 2 — The quarterly reset',
              page: 41,
              quote: 'Ask of any task: if I did this every week for three years, what would exist at the end? For most of your week the honest answer is nothing, and that is fine — but not for all of it.',
            },
            checks: [
              {
                q: 'What test does the chapter offer for whether work compounds?',
                options: [
                  'Whether anyone is waiting on it',
                  'What would exist if you did it weekly for three years',
                  'Whether it fits in the current quarter',
                ],
                answer: 1,
                sourceRef: { chapter: 'Ch. 2', page: 41 },
              },
            ],
            habitSuggestion: {
              behavior: 'Spend ten minutes on the one thing that compounds',
              prompt: 'After I close my laptop lid at the end of the day',
              celebration: 'Say "that one counted" out loud',
              why: 'Most work resets to zero every quarter. Find the part that does not.',
            },
          },
          {
            key: 'lg-2',
            title: 'The meeting that should have been a decision',
            minutes: 3,
            standfirst: 'A recurring meeting is usually a decision nobody wanted to make.',
            body: [
              'Look at any calendar that has been running for two years and you will find meetings that exist because a decision was deferred once and the deferral got a recurrence rule.',
              'They are cheap to create and almost impossible to kill, because killing one requires someone to make the decision that was avoided in the first place — and now with an audience.',
              'The practice is small: pick one recurring meeting a week and write down, in a sentence, the decision it is standing in for. You do not have to make the decision. Writing it down is usually enough to make the meeting look strange.',
            ],
            sourceRef: {
              chapter: 'Ch. 3 — Deferred decisions accrue interest',
              page: 63,
              quote: 'Every standing meeting is a monument to a decision somebody once declined to make.',
            },
            checks: [
              {
                q: 'According to the chapter, what does a recurring meeting usually stand in for?',
                options: [
                  'A decision that was deferred',
                  'A missing document',
                  'An underperforming team',
                ],
                answer: 0,
                sourceRef: { chapter: 'Ch. 3', page: 63 },
              },
            ],
            habitSuggestion: {
              behavior: 'Write down the decision one recurring meeting is avoiding',
              prompt: 'After my first coffee on Monday',
              celebration: 'Cross it off with a flourish',
              why: 'A recurring meeting is usually a decision nobody wanted to make.',
            },
          },
          {
            key: 'lg-3',
            title: 'Ship the boring version',
            minutes: 4,
            standfirst: 'The elaborate version is usually a way of not finding out.',
            body: [
              'There is a version of almost every project that could be finished this week. It is not the good version. It is smaller, plainer, and slightly embarrassing, and it has one enormous advantage: it produces information.',
              'The elaborate version produces no information until it is done, which is why it is so comfortable to work on. You can spend a quarter on it without ever learning that the idea was wrong.',
              'This is the same argument the habit literature makes about starting small, arriving from the other direction. Small is not a compromise on ambition. It is the fastest route to knowing whether the ambition was pointed at anything.',
            ],
            sourceRef: {
              chapter: 'Ch. 5 — Information, not output',
              page: 98,
              quote: 'The elaborate version is comfortable precisely because it defers the moment you find out.',
            },
            checks: [
              {
                q: 'Why does the chapter prefer the smaller version?',
                options: [
                  'It costs less to build',
                  'It produces information sooner',
                  'It is easier to explain',
                ],
                answer: 1,
                sourceRef: { chapter: 'Ch. 5', page: 98 },
              },
            ],
            habitSuggestion: {
              behavior: 'Ship one small thing before opening my inbox',
              prompt: 'After I sit down at my desk',
              celebration: 'Fist pump',
              why: 'The elaborate version is usually a way of not finding out.',
            },
          },
        ],
      },
      {
        n: 2,
        title: 'Build the thing that keeps working',
        lessons: [
          {
            key: 'lg-4',
            title: 'Write it down where the next person will look',
            minutes: 3,
            standfirst: 'Knowledge that lives in one head is a single point of failure with opinions.',
            body: [
              'The test of whether something is written down is not whether a document exists. It is whether the next person to need it will find it without asking you.',
              'Most teams pass the first test and fail the second, which is why the same four questions arrive in your messages every month.',
              'Ten minutes, once a day, spent moving one answer from your head to the place it will be looked for, changes the shape of a year.',
            ],
            sourceRef: {
              chapter: 'Ch. 7 — The findable answer',
              page: 141,
              quote: 'A document nobody can find is a document nobody wrote.',
            },
            checks: [
              {
                q: 'What is the chapter’s test for whether something is written down?',
                options: [
                  'A document exists',
                  'The next person finds it without asking you',
                  'It has been reviewed',
                ],
                answer: 1,
                sourceRef: { chapter: 'Ch. 7', page: 141 },
              },
            ],
            habitSuggestion: {
              behavior: 'Move one answer out of my head and into the shared doc',
              prompt: 'After my last meeting of the day',
              celebration: 'Say "found it" out loud',
              why: 'Knowledge that lives in one head is a single point of failure with opinions.',
            },
          },
          {
            key: 'lg-5',
            title: 'Protect the hour nobody asked for',
            minutes: 4,
            standfirst: 'Nobody will ever put the important-but-not-urgent hour in your calendar for you.',
            body: [
              'Urgent work arrives with a person attached. Important work arrives with nobody attached, which is why it loses every negotiation it is entered into.',
              'The only reliable defence is to stop negotiating: give it a fixed place, make it the same hour, and let it be unremarkable. An hour you have to decide about every day is an hour you will lose most days.',
              'Note the shape of that argument. It is the anchor rule from habit formation, applied to a calendar rather than a behaviour.',
            ],
            sourceRef: {
              chapter: 'Ch. 8 — The undefended hour',
              page: 166,
              quote: 'Anything you decide about daily, you will eventually decide against.',
            },
            checks: [
              {
                q: 'Why does the chapter argue for a fixed hour rather than a flexible one?',
                options: [
                  'Fixed hours are more productive',
                  'Anything decided about daily gets decided against eventually',
                  'It signals seriousness to colleagues',
                ],
                answer: 1,
                sourceRef: { chapter: 'Ch. 8', page: 166 },
              },
            ],
            habitSuggestion: {
              behavior: 'Keep the 9am hour for the work nobody is chasing',
              prompt: 'After I open my calendar in the morning',
              celebration: 'Close the door and grin',
              why: 'Nobody will ever put the important-but-not-urgent hour in your calendar for you.',
            },
          },
          {
            key: 'lg-6',
            title: 'Leave the campsite readable',
            minutes: 3,
            standfirst: 'Finishing includes leaving a note for whoever arrives next.',
            body: [
              'Work is rarely finished at a clean boundary. It is put down mid-thought, at the end of a day, in the state that made sense to the person holding it.',
              'Two minutes spent writing down where you got to and what you would do next is the cheapest thing in this book. It is also the thing that makes tomorrow morning start at full speed instead of spending twenty minutes reconstructing yesterday.',
            ],
            sourceRef: {
              chapter: 'Ch. 9 — Handover to yourself',
              page: 189,
              quote: 'You are the next person, and you will not remember.',
            },
            checks: [
              {
                q: 'Who does the chapter say the handover note is mostly for?',
                options: ['Your manager', 'The next person on the team', 'You, tomorrow'],
                answer: 2,
                sourceRef: { chapter: 'Ch. 9', page: 189 },
              },
            ],
            habitSuggestion: {
              behavior: 'Write two lines on where I got to and what is next',
              prompt: 'Before I shut the laptop',
              celebration: 'Say "handed over"',
              why: 'Finishing includes leaving a note for whoever arrives next.',
            },
          },
        ],
      },
    ],
  },

  northbeam: {
    weeks: [
      {
        n: 1,
        title: 'Talk about outcomes, not features',
        lessons: [
          {
            key: 'nb-1',
            title: 'A job is stable; a solution is not',
            minutes: 4,
            standfirst: 'The thing people are trying to get done outlives every product built to help them do it.',
            body: [
              'The method starts from a claim that sounds obvious and turns out to be load-bearing: what people are trying to accomplish changes far more slowly than the things they use to accomplish it.',
              'That is what makes the job a stable unit to plan against, and the feature an unstable one. A roadmap of features is a roadmap of guesses about solutions. A roadmap of outcomes is a roadmap of the problem.',
              'The daily version of this is small: once a day, take one thing on your roadmap and write the outcome it is supposed to move. If you cannot, you have found the week’s most useful conversation.',
            ],
            sourceRef: {
              chapter: 'Module 1 — Units of analysis',
              page: 12,
              quote: 'Solutions churn. The job does not. Plan against the part that holds still.',
            },
            checks: [
              {
                q: 'Why is the job treated as the stable unit?',
                options: [
                  'It is easier to measure',
                  'It changes more slowly than the solutions built for it',
                  'It is what customers ask for directly',
                ],
                answer: 1,
                sourceRef: { chapter: 'Module 1', page: 12 },
              },
            ],
            habitSuggestion: {
              behavior: 'Write the outcome one roadmap item is meant to move',
              prompt: 'After my morning stand-up',
              celebration: 'Tick it in the margin',
              why: 'The thing people are trying to get done outlives every product built to help them do it.',
            },
          },
          {
            key: 'nb-2',
            title: 'Ask for the metric, not the adjective',
            minutes: 3,
            standfirst: '"Faster" is a feeling. "Minutes from intake to decision" is a target.',
            body: [
              'Interviews fill up with adjectives — easier, faster, cleaner — and adjectives cannot be prioritised against each other because they have no units.',
              'The discipline is to convert each one, in the room, into a direction and a measure. Not later, in the write-up, when the person is gone and you are guessing.',
              'One conversion a day is enough to change how you listen within a fortnight.',
            ],
            sourceRef: {
              chapter: 'Module 2 — Statement structure',
              page: 34,
              quote: 'Direction, unit, object of control. An adjective is none of those.',
            },
            checks: [
              {
                q: 'What is missing from an adjective like "faster"?',
                options: ['A direction', 'A unit of measure', 'A customer segment'],
                answer: 1,
                sourceRef: { chapter: 'Module 2', page: 34 },
              },
            ],
            habitSuggestion: {
              behavior: 'Convert one adjective from a customer call into a measure',
              prompt: 'Right after any customer conversation',
              celebration: 'Say the metric out loud',
              why: '"Faster" is a feeling. "Minutes from intake to decision" is a target.',
            },
          },
          {
            key: 'nb-3',
            title: 'Underserved is a coordinate, not an opinion',
            minutes: 4,
            standfirst: 'Importance and satisfaction are two axes. Opportunity lives in one corner.',
            body: [
              'The reason the method survives contact with a room full of stakeholders is that it replaces argument with a coordinate: how important is this outcome, and how satisfied are people with it today.',
              'Both numbers come from the same people, on the same scale, which is what makes the corner meaningful — high importance, low satisfaction — rather than two separate opinions being compared by volume.',
              'The practice is to plot one outcome a day. Twenty in a month is a map.',
            ],
            sourceRef: {
              chapter: 'Module 4 — The opportunity corner',
              page: 71,
              quote: 'You are not looking for the loudest complaint. You are looking for the widest gap.',
            },
            checks: [
              {
                q: 'Which combination marks an opportunity?',
                options: [
                  'High importance, high satisfaction',
                  'High importance, low satisfaction',
                  'Low importance, low satisfaction',
                ],
                answer: 1,
                sourceRef: { chapter: 'Module 4', page: 71 },
              },
            ],
            habitSuggestion: {
              behavior: 'Plot one outcome on importance and satisfaction',
              prompt: 'After I close my last call of the day',
              celebration: 'Add it to the wall',
              why: 'Importance and satisfaction are two axes. Opportunity lives in one corner.',
            },
          },
        ],
      },
    ],
  },
};

/* --------------------------------------------------------------------------
   THE CONVERSION
   What the Bindery runs at step 3. In production this is a model call behind
   an API; the signature is the part that matters and it does not change.

   `outputs`  { lessons, checks, habits } — the three toggles [#5]
   `prompt`   the guiding prompt (1c). It must DEMONSTRABLY change the output,
              which is an acceptance criterion on #5 and not a nicety: a prompt
              field that quietly does nothing is worse than no prompt field.
              Here it does three visible things — sets the angle line carried on
              every card, rewrites the suggested habit's cue when it names a
              time of day, and drops weeks past a requested length.
-------------------------------------------------------------------------- */

const ANGLES = [
  { match: /team|manager|lead|report/i, angle: 'Angled for someone who leads a team' },
  { match: /solo|founder|freelanc/i,    angle: 'Angled for someone working alone' },
  { match: /morning|am\b/i,             angle: 'Anchored to the start of the day' },
  { match: /evening|night|pm\b/i,       angle: 'Anchored to the end of the day' },
  { match: /short|brief|quick|10 ?min/i, angle: 'Trimmed to the shortest useful version' },
];

function angleFor(prompt) {
  if (!prompt || !prompt.trim()) return null;
  const hit = ANGLES.find((a) => a.match.test(prompt));
  return hit ? hit.angle : 'Angled by your prompt';
}

function cueFor(prompt, fallback) {
  if (!prompt) return fallback;
  if (/morning|am\b/i.test(prompt)) return 'After I pour my first coffee';
  if (/evening|night|pm\b/i.test(prompt)) return 'After I clear my desk for the day';
  return fallback;
}

/**
 * Turn a source into a draft Practice.
 * Returns the `weeks` array only — the store wraps it with identity, status
 * and ownership, because those are its business and not the converter's.
 */
export function convert(source, outputs, prompt) {
  const corpus = CORPORA[source.corpus] || CORPORA.longgame;
  const angle = angleFor(prompt);
  const wantShort = /short|brief|quick|one week|1 week/i.test(prompt || '');

  const weeks = corpus.weeks
    .slice(0, wantShort ? 1 : corpus.weeks.length)
    .map((w) => ({
      n: w.n,
      title: w.title,
      lessons: w.lessons.map((l) => ({
        id: source.id + '-' + l.key,
        title: l.title,
        minutes: l.minutes,
        standfirst: l.standfirst,
        /* The lesson body only exists if Lessons was asked for. With Lessons
           off you get a Practice of checks and habits — a drill, not a course.
           That is a real product shape, not a degraded one. */
        body: outputs.lessons ? l.body.slice() : [],
        sourceRef: Object.assign({}, l.sourceRef),
        angle,
        checks: outputs.checks ? structuredClone(l.checks) : [],
        habitSuggestion: outputs.habits
          ? Object.assign({}, l.habitSuggestion, {
              prompt: cueFor(prompt, l.habitSuggestion.prompt),
            })
          : null,
        read: false,
        edited: false,
      })),
    }));

  return weeks;
}

/** Titles offered in the Bindery's picker when nothing has been uploaded. */
export const SAMPLE_UPLOADS = [
  {
    title: 'The Long Game',
    author: 'R. Halloran',
    kind: 'pdf',
    pages: 246,
    corpus: 'longgame',
    blurb: 'A behavioural business book — the shape of source E1 is built for.',
  },
  {
    title: 'Outcome-Led Discovery — the practitioner canon',
    author: 'Northbeam Institute',
    kind: 'library',
    pages: 118,
    corpus: 'northbeam',
    blurb: 'A community’s method, licensed by its operator — the E2 shape.',
  },
];

/* --------------------------------------------------------------------------
   THE PUBLISHED PRACTICE
   One already exists so the Studio, the reader and the Spaces cohort have
   something to show before anyone has run the Bindery.
-------------------------------------------------------------------------- */

export const practices = [
  {
    id: 'prc-longgame',
    sourceId: 'src-longgame',
    title: 'The Long Game — the practice',
    author: 'R. Halloran',
    code: 'LONGGAME',
    status: 'published',
    publishedAt: isoDaysAgo(45),
    outputs: { lessons: true, checks: true, habits: true },
    prompt: '',
    plan: 'companion',
    weeks: convert(sources[0], { lessons: true, checks: true, habits: true }, ''),
  },
  {
    id: 'prc-northbeam',
    sourceId: 'src-northbeam',
    title: 'Outcome-Led Discovery — daily practice',
    author: 'Northbeam Institute',
    code: 'NORTHBEAM',
    status: 'published',
    publishedAt: isoDaysAgo(45),
    outputs: { lessons: true, checks: true, habits: true },
    prompt: 'Keep the language for a product manager, one habit per module',
    plan: 'seats',
    weeks: convert(sources[1], { lessons: true, checks: true, habits: true },
                   'Keep the language for a product manager, one habit per module'),
  },
];

/* --------------------------------------------------------------------------
   THE COHORT

   PTR is derived from these rows, never stored — same rule as streaks [#9].
   Each row is one enrolled reader: when they joined, whether the bridge was
   crossed, and when they last checked the resulting habit in. Day-14 retention
   falls out of those three facts, which means the Studio's headline number
   cannot drift from the cohort it describes.

   Generated deterministically so the chart is the same on every reload.
-------------------------------------------------------------------------- */

function makeCohort(practiceId, count, takeRate, seed) {
  const rand = lcg(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    /* Spread over ~6 weeks so the Studio chart has buckets to draw. The two
       most recent weeks stay deliberately un-mature (nobody has reached day 14
       yet) — that gap is the thing the chart is supposed to show rather than
       report as a zero, so the fixture has to actually produce one. */
    const joinedDaysAgo = 2 + Math.floor(rand() * 40);
    const madeHabit = rand() < takeRate + 0.18;   /* more create than keep */
    /* Of those who made one, most but not all are still checking in. */
    const stillGoing = madeHabit && rand() < takeRate / (takeRate + 0.18) + 0.06;
    out.push({
      id: practiceId + '-e' + i,
      practiceId,
      joinedAt: isoDaysAgo(joinedDaysAgo),
      week1Complete: rand() < 0.52,
      habitCreated: madeHabit,
      /* null when they never made one; otherwise how recently they kept it. */
      lastCheckIn: madeHabit ? isoDaysAgo(stillGoing ? Math.floor(rand() * 2) : 9 + Math.floor(rand() * 14)) : null,
    });
  }
  return out;
}

export const enrolments = [
  ...makeCohort('prc-longgame', 184, 0.27, 'longgame-cohort'),
  ...makeCohort('prc-northbeam', 62, 0.34, 'northbeam-cohort'),
];

/* --------------------------------------------------------------------------
   SPACES — E2's joined community container
   `roster: 'csv'` is load-bearing documentation: issue #7 says do not build the
   API, and the fixture should not quietly imply one exists.
-------------------------------------------------------------------------- */

export const spaces = [
  {
    id: 'spc-northbeam',
    name: 'Northbeam Practitioners',
    operator: 'Northbeam Institute',
    practiceId: 'prc-northbeam',
    seats: 62,
    joined: true,
    roster: 'csv',
    plan: 'Pilot · 62 seats · invoiced',
    cohort: [
      { name: 'Priya N.', initial: 'P', tint: 'sage',  practising: 'Plot one outcome on importance and satisfaction', days: 11 },
      { name: 'Tom A.',   initial: 'T', tint: 'amber', practising: 'Convert one adjective into a measure', days: 6 },
      { name: 'Jules R.', initial: 'J', tint: 'clay',  practising: 'Write the outcome one roadmap item moves', days: 19 },
      { name: 'Sam O.',   initial: 'S', tint: 'gold',  practising: 'Plot one outcome on importance and satisfaction', days: 3 },
    ],
  },
  {
    id: 'spc-guild',
    name: 'The Writing Guild',
    operator: 'Guild Press',
    practiceId: null,
    seats: 0,
    joined: false,
    roster: 'csv',
    plan: 'Invited — not joined',
    cohort: [],
  },
];
