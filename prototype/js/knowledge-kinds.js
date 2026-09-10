/* ============================================================================
   HabitCrafts — knowledge-kinds.js
   WHAT KIND OF THING DID SOMEONE JUST UPLOAD?

   The Bindery's first version assumed one answer: a prose non-fiction book.
   Everything downstream inherited it — extraction produced lessons with a
   standfirst and three paragraphs, checks produced multiple choice, and the
   bridge produced one behaviour change.

   That shape is wrong for most of what people will bring. A Japanese class
   deck has no argument to summarise. It has patterns that transform, words to
   hold, and a few exceptions that need far more repetition than their share.
   A book about delegation has the opposite problem: nothing to memorise at
   all, and everything depending on whether you did it with a real person on a
   real Tuesday.

   So the kind selects three things, and nothing else:

     extracts   what extraction is looking for
     exercises  what a check is allowed to be
     cadence    what shape of habit the bridge proposes

   THE RULE THIS FILE EXISTS TO ENFORCE
   A view may ask what a kind AFFORDS. It may not branch on the kind's id.
   `affords(k, 'produce')` survives a fifth kind; `if (k.id === 'language')`
   does not, and by the third screen there are nine of them and nobody can add
   a kind safely.

   SCOPE, DELIBERATELY SMALL
   Four kinds and a custom path. This is not a taxonomy of learning and should
   not become one — the list earns its place only if each entry changes what
   gets built. If two kinds ever produce the same practice, they are one kind.
   ========================================================================= */

/* --------------------------------------------------------------------------
   THE EXERCISE VOCABULARY
   A closed set. Every kind draws its checks from here, so no screen invents an
   exercise type privately.
-------------------------------------------------------------------------- */

export const EXERCISES = {
  produce:     { id: 'produce',     label: 'Produce',       hint: 'Say or write the form yourself. No options given.' },
  transform:   { id: 'transform',   label: 'Transform',     hint: 'Apply the pattern to a new input.' },
  discern:     { id: 'discern',     label: 'Discern',       hint: 'Choose between two forms that are easy to confuse.' },
  describe:    { id: 'describe',    label: 'Describe',      hint: 'Make a sentence about a picture.' },
  recall:      { id: 'recall',      label: 'Recall',        hint: 'Retrieve the item from memory.' },
  apply:       { id: 'apply',       label: 'Apply',         hint: 'Use it once, against your own situation.' },
  rehearse:    { id: 'rehearse',    label: 'Rehearse',      hint: 'Run the move before you need it.' },
  notice:      { id: 'notice',      label: 'Notice',        hint: 'Spot it happening in your day and write down where.' },
};

/* --------------------------------------------------------------------------
   THE KINDS
-------------------------------------------------------------------------- */

export const KINDS = {
  /* ---------------------------------------------------------------------
     LANGUAGE. Mark's whole Japanese folder is this one kind — vocabulary,
     grammar patterns, and making sentences from pictures. It does not split
     further, and trying to split it was the first thing this file got wrong.
     --------------------------------------------------------------------- */
  language: {
    id: 'language',
    label: 'Language practice',
    blurb: 'Words to hold, patterns that transform, and sentences made from pictures.',
    examples: 'Class decks · textbook units · vocabulary lists · grammar notes',
    extracts: ['patterns', 'vocabulary', 'exceptions'],
    exercises: ['produce', 'transform', 'discern', 'describe', 'recall'],
    cadence: { shape: 'daily-short', blurb: 'Short and daily. Patterns decay without contact, and the exceptions decay fastest.' },
    /* Exceptions get their own bucket because they are what actually gets
       missed, and mixed in with everything else they receive a fraction of
       the repetitions they need. */
    emphasises: 'exceptions',
  },

  /* ---------------------------------------------------------------------
     SKILL. "Effective delegation." Nothing to memorise; everything depends
     on whether you did it with a real person.
     --------------------------------------------------------------------- */
  skill: {
    id: 'skill',
    label: 'A skill to practise',
    blurb: 'Moves you have to make with real people before they are yours.',
    examples: 'Effective delegation · giving feedback · running a meeting · negotiation',
    extracts: ['moves', 'situations', 'failure-modes'],
    exercises: ['rehearse', 'apply', 'notice'],
    cadence: { shape: 'one-rep-in-context', blurb: 'One rep, in a real situation, when the situation next occurs.' },
    emphasises: 'failure-modes',
  },

  /* ---------------------------------------------------------------------
     IDEAS. "Mastering marketing." A claim to be understood and used, not a
     system to be drilled. This is what the Bindery already assumed.
     --------------------------------------------------------------------- */
  ideas: {
    id: 'ideas',
    label: 'Ideas to apply',
    blurb: 'A way of seeing something, useful only once it has changed a decision.',
    examples: 'Mastering marketing · strategy books · essays · talks',
    extracts: ['claims', 'evidence'],
    exercises: ['apply', 'notice', 'recall'],
    cadence: { shape: 'one-behaviour', blurb: 'One behaviour, repeated. There is nothing here to drill.' },
    emphasises: null,
  },

  /* ---------------------------------------------------------------------
     OWN. The escape hatch, and not a lesser path. Someone who already knows
     what they want to be reminded of should not have to upload a document to
     say so — and their own words will beat generated ones.
     --------------------------------------------------------------------- */
  own: {
    id: 'own',
    label: 'Lessons I write myself',
    blurb: 'You already know what you want to be reminded of. Write it; skip the extraction.',
    examples: 'Notes to self · things learned the hard way · a coach’s advice',
    extracts: ['lessons'],
    exercises: ['notice', 'apply'],
    cadence: { shape: 'as-written', blurb: 'You set the rhythm, because you know when it matters.' },
    emphasises: null,
    /* No source, so no extraction step and no clarifying questions about
       material. The flow is shorter by two screens. */
    skipsExtraction: true,
  },
};

export const KIND_IDS = Object.keys(KINDS);

export function kind(id) {
  return KINDS[id] || KINDS.ideas;
}

/** Does this kind afford this exercise? Ask this, never the id. */
export function affords(kindId, exerciseId) {
  return kind(kindId).exercises.includes(exerciseId);
}

/* --------------------------------------------------------------------------
   DETECTION
   A guess with its reasoning attached. Crude on purpose: in production this is
   a model call, and what the fixture is demonstrating is that the CONFIRM step
   exists and shows its evidence — not that the heuristic is any good.
-------------------------------------------------------------------------- */

const SIGNALS = [
  {
    id: 'language',
    test: /kana|hiragana|katakana|第\s*\d+\s*課|lesson\s*\d+|conjugat|particle|vocabul|counter|grammar/i,
    say: (m) => `Lesson-unit structure and a term list (“${m}”)`,
  },
  {
    id: 'skill',
    test: /delegat|feedback|coaching|negotiat|one[- ]on[- ]one|manag(ing|ement)|leadership/i,
    say: (m) => `A practice done with other people (“${m}”)`,
  },
];

export function detect(text, meta) {
  const hay = [meta && meta.title, meta && meta.filename, text].filter(Boolean).join(' ');
  const evidence = [];
  let id = 'ideas';

  for (const s of SIGNALS) {
    const m = hay.match(s.test);
    if (m) { id = s.id; evidence.push(s.say(m[0])); break; }
  }

  /* Mostly short lines joined by arrows or equals signs is a drill sheet,
     whatever it is about. Cheap, and it is what caught the Japanese deck. */
  const arrows = (hay.match(/[→＝=]/g) || []).length;
  if (arrows >= 5) {
    id = 'language';
    evidence.push(`${arrows} mapping marks (→ or ＝). A drill sheet rather than prose`);
  }

  if (!evidence.length) evidence.push('Continuous prose with no drill or step structure');
  return { id, confidence: evidence.length > 1 ? 'high' : 'low', evidence };
}
