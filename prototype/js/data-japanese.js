/* ============================================================================
   HabitCrafts — data-japanese.js
   THE PILOT CORPUS. みんなの日本語 第1課, decomposed.

   This is a REAL decomposition of a real upload — Mark's Lesson 1 slide deck,
   14 pages, February 2025. It is here rather than in data-practices.js because
   it is the first corpus of a different KIND (language practice), and the whole
   point of the pilot is that a different kind produces a different shape.
   Putting it in the prose file would have hidden exactly that.

   WHAT THE UPLOAD ACTUALLY WAS, because it shaped the pipeline:
   a 14-page scanned slide deck with a 519-character text layer. The text layer
   is not the content — it is the teacher's annotation track over slide images
   ("Country + じん JIN ＝nationality"). Extraction that read only the text
   layer would have produced a plausible, wrong practice. The pages are images
   and have to be read as images.

   PROVENANCE. Every rule, item and irregular below carries the page it came
   from, and quotes it verbatim. Same rule as the prose corpus: a check whose
   answer is not locatable in the source must not exist. [#5] [#8]
   ========================================================================= */

/* --------------------------------------------------------------------------
   THE SOURCE
-------------------------------------------------------------------------- */

export const source = {
  id: 'src-minna-1',
  title: 'みんなの日本語 第1課',
  subtitle: 'Minna no Nihongo, Lesson 1',
  author: 'Class deck',
  kind: 'pdf',
  filename: '_みん日_第1課.pdf',
  pages: 14,
  addedAt: '2026-09-08',
  rightsConfirmed: true,

  /* How a source is FOUND again, months later, when the flow that made it is a
     distant memory. A filename is not a label - _みん日_第1課.pdf tells you
     nothing at a glance unless you already know. Date says when it entered;
     subject and unit say what it is; topics say what is inside it. */
  subject: 'Japanese',
  unit: 'Lesson 1',
  topics: ['Identity sentence', 'Negatives', 'Questions', 'Affiliation', 'Age counter'],
  blurb: 'A 14-page class slide deck: the identity sentence, its negative and question forms, affiliation, "also", and the age counter.',

  /* What extraction had to cope with. Surfaced in the UI because it is the
     honest reason this took a moment, and because it is the failure mode a
     reviewer should know about. */
  ingest: {
    textLayerChars: 519,
    textLayerIs: 'annotation over slide images, not the content',
    pagesAreImages: true,
    note: 'Read as images. A text-layer-only extraction would have produced a confident, wrong practice.',
  },
};

/* --------------------------------------------------------------------------
   DETECTION — what the classifier said, and on what evidence.
   Shown to the person, not applied silently.
-------------------------------------------------------------------------- */

export const detected = {
  id: 'language',
  confidence: 'high',
  evidence: [
    'Title matches a numbered lesson unit (第1課)',
    '22 mapping marks (→ and ＝) across the deck. A drill sheet, not prose',
    'A closed term list with a counter series (1 to 10)',
    'Slides pair a picture with a sentence, which is a describe-the-image drill',
  ],
  rejected: [
    { id: 'ideas', because: 'There is no claim to be persuaded of. Nothing to summarise.' },
    { id: 'skill', because: 'Nothing here needs another person to practise against.' },
  ],
};

/* --------------------------------------------------------------------------
   CLARIFYING QUESTIONS

   THE RULE: a clarifying question must change the output. If the practice is
   identical whichever way it is answered, it is a survey question and it is
   costing the person the one thing they have least of at upload time, which is
   patience. Each question below says what it changes, and `affects` names the
   part of the corpus it rewrites.

   These are asked AFTER extraction, not before. Before, they are hypothetical;
   after, the person is answering about material they can see.
-------------------------------------------------------------------------- */

export const questions = [
  {
    /* "Kana" is the umbrella term for both syllabaries, and it is the wrong
       word to put in front of a learner: it names a category rather than the
       thing on the card, and it cannot be acted on without already knowing
       which script is which. This deck is 36 distinct hiragana characters to
       16 katakana — hiragana carries the grammar and vocabulary, katakana
       appears only for foreign names (ミラー, キム, ソフィア, ドイツ).

       Splitting the question by script is not just clearer wording, it is a
       better question: a Lesson 1 learner usually reads hiragana and is still
       slow on katakana, so romaji on the names alone is a real answer that the
       umbrella version could not express. */
    id: 'q-script',
    ask: 'Should cards show romaji?',
    why: 'Your deck is mostly hiragana, with katakana for the foreign names. Romaji makes the first week easier and the third week slower.',
    affects: 'Every card face',
    options: [
      { id: 'none', label: 'No romaji',
        consequence: 'Hiragana and katakana only. Harder now, faster later.' },
      { id: 'katakana-only', label: 'On katakana only',
        consequence: 'Romaji under the foreign names (ミラーさん, ドイツ) and nothing else. That is the usual gap at this stage.', default: true },
      { id: 'all', label: 'On everything',
        consequence: 'Romaji under every Japanese line, hiragana included.' },
      { id: 'romaji-only', label: 'Romaji instead',
        consequence: 'No Japanese script at all. Speaking practice only. Reading will not develop.' },
    ],
  },
  {
    id: 'q-goal',
    ask: 'Are you trying to say these, or also to write them?',
    why: 'Production drills and writing drills are different exercises. Generating both doubles the daily load.',
    affects: 'Which exercise types appear',
    options: [
      { id: 'speak', label: 'Say them', consequence: 'Produce and transform drills only.', default: true },
      { id: 'both', label: 'Say and write', consequence: 'Adds writing prompts. Roughly doubles each session.' },
    ],
  },
  {
    id: 'q-known',
    ask: 'Which of these do you already know?',
    why: 'Anything you tick is dropped from drilling and kept only for review. This is the single biggest lever on session length.',
    affects: 'The item list',
    kind: 'multi',
    options: [
      { id: 'i-san', label: 'さん (Mr./Ms.)' },
      { id: 'i-nihonjin', label: 'にほんじん (Japanese person)' },
      { id: 'i-sensei', label: 'せんせい (teacher)' },
      { id: 'i-ginkouin', label: 'ぎんこういん (bank employee)' },
      { id: 'i-shain', label: 'しゃいん (company employee)' },
    ],
  },
  {
    id: 'q-irregulars',
    ask: 'The age counter has three forms that break the pattern. Drill them separately?',
    why: 'いっさい, はっさい and じゅっさい are where this lesson is actually lost. Treated as ordinary items they get one seventh of the repetitions they need.',
    affects: 'Whether the irregulars get their own daily slot',
    options: [
      { id: 'separate', label: 'Yes, their own slot', consequence: 'A short irregular drill every session until they stop being missed.', default: true },
      { id: 'mixed', label: 'No, mix them in', consequence: 'They appear at the same rate as everything else.' },
    ],
  },
  {
    id: 'q-cadence',
    ask: 'Do you have a class, and when?',
    why: 'A practice that lands the day after class is revision. One that lands the day before is preparation. They are not the same product.',
    affects: 'When the habit is scheduled',
    options: [
      { id: 'self',    label: 'No class',        consequence: 'Even load across the week. Nothing to prepare for or revise.', default: true },
      { id: 'class-1', label: 'Once a week',     consequence: 'Heavier the day before, light the day after.' },
      { id: 'class-2', label: 'Twice a week',    consequence: 'Two short prep days and two light revision days. The gap between classes is where the drill goes.' },
      { id: 'class-3', label: 'Three or more',   consequence: 'Revision only. The class is already carrying the new material.' },
      { id: 'class-daily', label: 'Daily / intensive', consequence: 'Consolidation only, kept under five minutes. You do not need more input.' },
    ],
  },
  {
    /* Asked last, with the schedule, because it is the question that sizes
       everything else. It is not a preference — it is the budget the generator
       has to fit, and generating fifteen minutes for someone with five is how
       a practice gets abandoned in week two. */
    id: 'q-duration',
    ask: 'How long do you want to practise each day?',
    why: 'This is a budget, not a target. Everything above is cut to fit it: fewer cards per session, not a longer backlog.',
    affects: 'How much of the corpus appears in any one session',
    options: [
      /* Below the shortest lesson (3 min) on purpose. At two minutes you get
         the exceptions drill and a couple of exercises — not a lesson. The
         eval enforces that this is still a real unit of work rather than a
         budget nothing fits into. */
      { id: 'm2',  label: '2 minutes',  consequence: 'The exceptions drill and two exercises. No new lesson. Survives a bad day, which is the point.' },
      { id: 'm5',  label: '5 minutes',  consequence: 'One lesson plus the exceptions drill.', default: true },
      { id: 'm10', label: '10 minutes', consequence: 'Two lessons, or one lesson with picture drills.' },
      { id: 'm15', label: '15 minutes', consequence: 'The full set. Realistic only if this is your main study time.' },
    ],
  },
];

/* --------------------------------------------------------------------------
   EXTRACTION — the three buckets the `memorisation` kind declares.

   RULES: a pattern with a transformation. Each carries the frame, a worked
   example from the deck, and the page it is on.
-------------------------------------------------------------------------- */

export const rules = [
  {
    key: 'r-identity',
    name: 'X is Y',
    frame: 'N1 は N2 です',
    romaji: 'N1 wa N2 desu',
    gloss: 'States that N1 is N2. は marks the topic; です closes the sentence.',
    example: { ja: 'やまださん は にほんじん です', romaji: 'Yamada-san wa nihonjin desu', en: 'Ms. Yamada is Japanese.' },
    page: 3,
    quote: 'X = Y  Ms. Yamada = N1 wa N2 desu',
  },
  {
    key: 'r-negative',
    name: 'X is not Y',
    frame: 'N1 は N2 じゃ ありません',
    romaji: 'N1 wa N2 ja arimasen',
    gloss: 'The negative of です. Replaces です entirely. It is not added to it.',
    example: { ja: 'やまださん は にほんじん じゃ ありません', romaji: 'Yamada-san wa nihonjin ja arimasen', en: 'Ms. Yamada is not Japanese.' },
    page: 5,
    quote: 'やまださん は にほんじんじゃ ありません',
    trap: 'The commonest error is keeping です: ✗ にほんじん じゃ ありません です.',
  },
  {
    key: 'r-question',
    name: 'Is X Y?',
    frame: 'N1 は N2 ですか',
    romaji: 'N1 wa N2 desu ka',
    gloss: 'Add か to the end. Word order does not change. Nothing moves.',
    example: { ja: 'やまださん は にほんじん ですか', romaji: 'Yamada-san wa nihonjin desu ka', en: 'Is Ms. Yamada Japanese?' },
    page: 9,
    quote: 'ヤマダさん は にほんじん ですか。',
  },
  {
    key: 'r-nationality',
    name: 'Country makes nationality',
    frame: 'Country + じん',
    romaji: 'Country + jin',
    gloss: 'Attach じん to a country name to make the person.',
    example: { ja: 'にほん + じん → にほんじん', romaji: 'Nihon + jin → nihonjin', en: 'Japan → Japanese person' },
    page: 1,
    quote: 'Country + じん JIN ＝nationality',
  },
  {
    key: 'r-affiliation',
    name: 'Which one it belongs to',
    frame: 'N1 の N2',
    romaji: 'N1 no N2',
    gloss: 'の links two nouns: the first narrows the second. Company の employee.',
    example: { ja: 'キムさん は SAMSUNG の しゃいん です', romaji: 'Kim-san wa SAMSUNG no shain desu', en: 'Mr. Kim is a SAMSUNG employee.' },
    page: 11,
    quote: 'Kimsan wa SUMSUNG no shain desu',
  },
  {
    key: 'r-also',
    name: 'Also',
    frame: 'N1 も N2 です',
    romaji: 'N1 mo N2 desu',
    gloss: 'も REPLACES は. It does not sit next to it.',
    example: { ja: 'ソフィアさん も せんせい です', romaji: 'Sofia-san mo sensei desu', en: 'Ms. Sofia is a teacher too.' },
    page: 12,
    quote: 'も（mo）:also  Watashi wa sensei desu  Sofiasan mo sensei desu',
    trap: 'は disappears when も arrives: ✗ ソフィアさん は も せんせい です.',
  },
  {
    key: 'r-age',
    name: 'Saying an age',
    frame: 'Number + さい',
    romaji: 'Number + sai',
    gloss: 'Attach さい to the number. Three of the first ten change sound. See the irregulars.',
    example: { ja: 'カイ は さんさい です', romaji: 'Kai wa san-sai desu', en: 'Kai is three years old.' },
    page: 14,
    quote: 'kai wa san sai desu  Year old',
  },
];

/* ITEMS: things to hold in memory. No transformation, just the pair.

   `script` is load-bearing rather than decorative — the romaji question offers
   "on katakana only", and without knowing which script a term is written in
   there is no way to honour that answer. Every item in this lesson happens to
   be hiragana; the katakana in the deck is all proper nouns, below. */
export const items = [
  { key: 'i-san',       ja: 'さん',         romaji: 'san',        en: 'Mr. / Ms. (never used about yourself)', script: 'hiragana', page: 2,  quote: 'Name + さん san ＝Mr. Ms.' },
  { key: 'i-nihonjin',  ja: 'にほんじん',   romaji: 'nihonjin',   en: 'Japanese person',                       script: 'hiragana', page: 1,  quote: 'Country + じん JIN ＝nationality' },
  { key: 'i-sensei',    ja: 'せんせい',     romaji: 'sensei',     en: 'teacher',                               script: 'hiragana', page: 12, quote: 'Watashi wa sensei desu' },
  { key: 'i-ginkouin',  ja: 'ぎんこういん', romaji: 'ginkōin',    en: 'bank employee',                         script: 'hiragana', page: 7,  quote: 'ミラーさん は ぎんこういんじゃ ありません' },
  { key: 'i-shain',     ja: 'しゃいん',     romaji: 'shain',      en: 'company employee',                      script: 'hiragana', page: 11, quote: 'Kimsan wa SUMSUNG no shain desu' },
];

/* The katakana in this deck, which is entirely proper nouns. Separated because
   it is what "romaji on katakana only" actually targets, and because a learner
   at Lesson 1 typically reads hiragana comfortably and is still slow here. */
export const katakanaTerms = [
  { key: 'k-mira',   ja: 'ミラーさん',   romaji: 'Mirā-san',   en: 'Mr. Miller',  script: 'katakana', page: 7 },
  { key: 'k-kim',    ja: 'キムさん',     romaji: 'Kim-san',    en: 'Mr. Kim',     script: 'katakana', page: 11 },
  { key: 'k-sofia',  ja: 'ソフィアさん', romaji: 'Sofia-san',  en: 'Ms. Sofia',   script: 'katakana', page: 12 },
  { key: 'k-kai',    ja: 'カイ',         romaji: 'Kai',        en: 'Kai',         script: 'katakana', page: 14 },
  { key: 'k-doitsu', ja: 'ドイツ',       romaji: 'Doitsu',     en: 'Germany',     script: 'katakana', page: 1 },
];

/* IRREGULARS: the expensive part. Their own bucket because the kind declares
   `emphasises: 'irregulars'`, and a generator that treats them as ordinary
   items under-drills them by construction. */
export const irregulars = [
  { key: 'x-1',  n: 1,  ja: 'いっさい',   romaji: 'issai',    expected: 'いちさい', note: 'いち loses its ち and doubles the s.', script: 'hiragana', page: 13 },
  { key: 'x-8',  n: 8,  ja: 'はっさい',   romaji: 'hassai',   expected: 'はちさい', note: 'はち loses its ち and doubles the s.', script: 'hiragana', page: 13 },
  { key: 'x-10', n: 10, ja: 'じゅっさい', romaji: 'jussai',   expected: 'じゅうさい', note: 'じゅう shortens before さい.',        script: 'hiragana', page: 13 },
];

/* The seven that behave, kept so a drill can mix them in and so the learner
   can see that the irregulars really are only three. */
export const regularAges = [
  { n: 2, ja: 'にさい' }, { n: 3, ja: 'さんさい' }, { n: 4, ja: 'よんさい' },
  { n: 5, ja: 'ごさい' }, { n: 6, ja: 'ろくさい' }, { n: 7, ja: 'ななさい' },
  { n: 9, ja: 'きゅうさい' },
];

/* --------------------------------------------------------------------------
   THE LESSON SEQUENCE

   Ordered by dependency, not by deck order. The deck introduces nationality
   (p1) before the sentence that uses it (p3); a learner needs the frame first
   and the vocabulary as it is needed. Extraction reorders; provenance keeps
   every piece pointing back at its own page.

   Each lesson carries its exercises drawn ONLY from what the kind affords:
   produce, transform, discern, recall.
-------------------------------------------------------------------------- */

export const lessons = [
  {
    key: 'jl-1',
    n: 1,
    title: 'The sentence that says what something is',
    minutes: 4,
    rules: ['r-identity', 'r-nationality'],
    items: ['i-san', 'i-nihonjin'],
    standfirst: 'One frame carries most of Lesson 1. Everything else this week is a change to its ending.',
    body: [
      'は marks what the sentence is about, and です closes it. Between them goes what that thing is. That is the whole frame, and the next three lessons are all modifications of its ending rather than new sentences.',
      'さん attaches to other people and never to yourself. This is the first rule in the deck that is about politeness rather than grammar, and it is the one a beginner breaks in their first real conversation.',
    ],
    exercises: [
      { type: 'produce',   prompt: 'Say: "Ms. Yamada is Japanese."', answer: 'やまださん は にほんじん です', romaji: 'Yamada-san wa nihonjin desu', page: 3 },
      { type: 'transform', prompt: 'ドイツ (Germany) → the word for a German person', answer: 'ドイツじん', romaji: 'doitsu-jin', page: 1 },
      { type: 'discern',   prompt: 'Introducing yourself, which is right?', options: ['わたし は ミラーさん です', 'わたし は ミラー です'], answer: 1, because: 'さん is never used about yourself.', page: 2 },
    ],
    habitSuggestion: {
      behavior: 'Say three X-は-Y sentences out loud about people I know',
      prompt: 'After I sit down with my morning coffee',
      celebration: 'Say "いいね" out loud',
      why: 'The frame only becomes automatic by being spoken, not by being recognised.',
    },
  },
  {
    key: 'jl-2',
    n: 2,
    title: 'Saying no',
    minutes: 3,
    rules: ['r-negative'],
    items: ['i-ginkouin'],
    standfirst: 'じゃ ありません replaces です. It is not added to it.',
    body: [
      'The negative swaps the ending rather than extending it. Learners who have met English tag negation reliably produce じゃ ありません です for about a week, because it feels like something is missing without です on the end.',
      'Nothing else in the sentence moves. Topic, は, and the noun all stay exactly where they were.',
    ],
    exercises: [
      { type: 'transform', prompt: 'Make negative: ミラーさん は ぎんこういん です', answer: 'ミラーさん は ぎんこういん じゃ ありません', romaji: 'Mirā-san wa ginkōin ja arimasen', page: 7 },
      { type: 'discern',   prompt: 'Which is correct?', options: ['にほんじん じゃ ありません です', 'にほんじん じゃ ありません'], answer: 1, because: 'じゃ ありません replaces です; it does not follow it.', page: 5 },
      { type: 'produce',   prompt: 'Say: "I am not a bank employee."', answer: 'わたし は ぎんこういん じゃ ありません', romaji: 'watashi wa ginkōin ja arimasen', page: 7 },
    ],
    habitSuggestion: {
      behavior: 'Turn one true sentence about my day into its negative',
      prompt: 'After I put my phone on the charger at night',
      celebration: 'Note the one that felt automatic',
      why: 'The negative is a swap, and swaps are learned by doing them, not by reading them.',
    },
  },
  {
    key: 'jl-3',
    n: 3,
    title: 'Asking',
    minutes: 3,
    rules: ['r-question'],
    items: [],
    standfirst: 'か on the end. Nothing else changes, and that is the surprising part.',
    body: [
      'English reorders to ask a question. Japanese does not: the statement stays intact and か is added. There is no inversion to remember and no auxiliary to find.',
      'Because nothing moves, the question form is the cheapest thing in Lesson 1 to make automatic, which makes it the fastest route to an actual exchange with somebody.',
    ],
    exercises: [
      { type: 'transform', prompt: 'Make a question: やまださん は にほんじん です', answer: 'やまださん は にほんじん ですか', romaji: 'Yamada-san wa nihonjin desu ka', page: 9 },
      { type: 'produce',   prompt: 'Ask: "Are you a teacher?"', answer: 'せんせい ですか', romaji: 'sensei desu ka', page: 9 },
    ],
    habitSuggestion: {
      behavior: 'Ask one ですか question out loud, then answer it myself',
      prompt: 'After I finish my last meeting of the day',
      celebration: 'Answer it in both the yes and the no form',
      why: 'Questions are the fastest of these forms to make automatic, and the first one that gets used with a person.',
    },
  },
  {
    key: 'jl-4',
    n: 4,
    title: 'Which one it belongs to, and "me too"',
    minutes: 4,
    rules: ['r-affiliation', 'r-also'],
    items: ['i-shain', 'i-sensei'],
    standfirst: 'の narrows a noun. も replaces は. It does not join it.',
    body: [
      'の puts one noun in front of another to narrow it: the company, then the employee. Once it is there, any noun can be specified by another noun, which is a large amount of new expressive range for one character.',
      'も is the first particle that displaces another. Learners keep は and add も, producing さん は も, because in English "too" is an addition rather than a substitution.',
    ],
    exercises: [
      { type: 'produce',   prompt: 'Say: "Mr. Kim is a SAMSUNG employee."', answer: 'キムさん は SAMSUNG の しゃいん です', romaji: 'Kim-san wa SAMSUNG no shain desu', page: 11 },
      /* The picture drill the deck is actually built on: slide 11 is a photo
         of Mr. Kim with no sentence under it. The image is the prompt. */
      { type: 'describe',  prompt: 'Slide 11: describe this person in one sentence.', image: 'p11', answer: 'キムさん は SAMSUNG の しゃいん です', romaji: 'Kim-san wa SAMSUNG no shain desu', page: 11 },
      { type: 'discern',   prompt: 'Ms. Sofia is a teacher as well. Which is right?', options: ['ソフィアさん は も せんせい です', 'ソフィアさん も せんせい です'], answer: 1, because: 'も takes the place of は.', page: 12 },
      { type: 'transform', prompt: 'わたし は せんせい です → say that Sofia is one too', answer: 'ソフィアさん も せんせい です', romaji: 'Sofia-san mo sensei desu', page: 12 },
    ],
    habitSuggestion: {
      behavior: 'Describe two people with の, then link them with も',
      prompt: 'After I clear my lunch plate',
      celebration: 'Say both sentences again without pausing',
      why: 'も is a substitution, and substitutions only stick once the wrong version has been felt to be wrong.',
    },
  },
  {
    key: 'jl-5',
    n: 5,
    title: 'Ages, and the three that break',
    minutes: 5,
    rules: ['r-age'],
    items: [],
    irregulars: ['x-1', 'x-8', 'x-10'],
    standfirst: 'Seven of the first ten behave. Three do not, and those three are the lesson.',
    body: [
      'さい attaches to the number and the sentence is otherwise the identity frame from Lesson 1. Nothing new is happening structurally.',
      'The cost is in three sounds. 1, 8 and 10 change: いっさい, はっさい, じゅっさい. Each is a consonant doubling where the number loses its own ending, and they are the forms that get missed months later, long after the pattern itself is secure.',
    ],
    exercises: [
      { type: 'produce',   prompt: 'Say: "Kai is three years old."', answer: 'カイ は さんさい です', romaji: 'Kai wa san-sai desu', page: 14 },
      { type: 'recall',    prompt: 'How do you say eight years old?', answer: 'はっさい', romaji: 'hassai', page: 13 },
      { type: 'discern',   prompt: 'Which is the real form for 10?', options: ['じゅうさい', 'じゅっさい'], answer: 1, because: 'じゅう shortens to じゅっ before さい.', page: 13 },
      { type: 'recall',    prompt: 'Which three of 1 to 10 are irregular?', answer: '1, 8 and 10', page: 13 },
    ],
    habitSuggestion: {
      behavior: 'Say the ages of three people I know, including one irregular',
      prompt: 'After I brush my teeth at night',
      celebration: 'Say the three irregulars once more as a set',
      why: 'The irregulars are the part that decays. They need contact more often than the rule does.',
    },
  },
];

/* --------------------------------------------------------------------------
   THE IRREGULAR DRILL
   Its own object because the kind declares `emphasises: 'irregulars'`, and
   because question q-irregulars can switch it on and off. It is not a lesson —
   it recurs after the lessons are finished.
-------------------------------------------------------------------------- */

export const irregularDrill = {
  key: 'jd-ages',
  title: 'The three that break',
  minutes: 1,
  recurs: 'every session, until missed twice in a row stops happening',
  why: 'Three items against seven regulars means one seventh of the exposure, for the forms that are hardest. Drilling them apart is the whole point of separating irregulars from items.',
  cards: irregulars.map((x) => ({ front: String(x.n), back: x.ja, romaji: x.romaji, trap: x.expected })),
};

/* --------------------------------------------------------------------------
   WHAT THE BRIDGE PROPOSES
   The kind's cadence is `daily-short`, so this is one small daily practice
   rather than one behaviour change — which is what the prose corpus produces.
-------------------------------------------------------------------------- */

export const proposedHabit = {
  behavior: 'Run today’s Japanese practice',
  prompt: 'After I pour my morning coffee',
  celebration: 'Say “できた” out loud',
  why: 'Five lessons and a drill. Rules decay without daily contact, and the irregulars decay fastest.',
  minutes: 5,
  days: [1, 2, 3, 4, 5, 6, 0],
};

export default {
  source, detected, questions, rules, items, katakanaTerms, irregulars, regularAges,
  lessons, irregularDrill, proposedHabit,
};
