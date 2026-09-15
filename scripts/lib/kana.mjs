/* ============================================================================
   HabitCrafts — scripts/lib/kana.mjs
   KANA IN, HEPBURN OUT. ONE DEFINITION, SO THE CHECKS CANNOT DISAGREE.

   Why this exists: "is this reading correct?" looks like a question for a
   judge, and for kana it is not. A kana string determines its own reading, so
   a transliterator turns a domain-truth question into an assertion that costs
   nothing and never needs a network. That is the cheapest possible win in a
   Japanese practice, and it is why this file comes before any judge.

   THE SCHEME IS MODIFIED HEPBURN WITH MACRONS, AND IT IS DECLARED ONCE HERE.
   Two schemes in one deck is worse than either scheme: a learner types what
   they read, so `ginkouin` and `ginkōin` cannot both be on screen.

     long o   おう / おお  -> ō          (ぎんこういん -> ginkōin)
     long u   うう         -> ū
     long a   ああ / ー    -> ā          (ミラー -> Mirā)
     ei       えい         -> ei, NOT ē  (せんせい -> sensei)
     ii       いい         -> ii
     sokuon   っ           doubles the next consonant (はっさい -> hassai)
     ん                    -> n, and n' before a vowel or y

   WHAT IT DELIBERATELY DOES NOT DO
   - Kanji. A kanji has no reading without a dictionary, so `hasKanji()` is
     exported and every caller must skip rather than guess. Lesson 1 is
     pre-kanji; lesson 12 will not be, and a transliterator that quietly
     returned rubbish for kanji would be a false green at exactly that point.
   - Morpheme boundaries. おう merges to ō unconditionally, which is right
     inside a word and wrong across a seam (おもう is omou, not omō). Beginner
     material does not contain the counterexamples; intermediate material will,
     and the fix then is a boundary marker in the data, not a cleverer regex.

   THE PARTICLE RULE DEPENDS ON THE SPACING CONVENTION.
   は is `ha` inside a word (はっさい) and `wa` as a topic particle
   (やまださん は にほんじん です). Nothing in the characters distinguishes
   them. This corpus writes learner-spaced Japanese, so a standalone は is a
   particle and that is what is used here. If the spacing convention ever
   changes, this rule breaks, which is precisely why the convention is itself
   asserted rather than assumed.

   No dependencies, same as everything else here.
   ========================================================================= */

/* --------------------------------------------------------------------------
   TABLES. Hiragana only — katakana is folded onto hiragana first, so there is
   one table rather than two that can drift apart.
-------------------------------------------------------------------------- */

const DIGRAPHS = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho', しぇ: 'she',
  じゃ: 'ja',  じゅ: 'ju',  じょ: 'jo',  じぇ: 'je',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', ちぇ: 'che',
  ぢゃ: 'ja',  ぢゅ: 'ju',  ぢょ: 'jo',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  /* Foreign-sound digraphs. Written in katakana in practice, but the katakana
     fold puts them here, so here is where they live. */
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo',
  てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo',
};

const MONOGRAPHS = {
  あ: 'a',  い: 'i',  う: 'u',  え: 'e',  お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'wi', ゑ: 'we', を: 'o',
  ゔ: 'vu',
  /* Small vowels standing alone, which happens in names the digraph table
     does not cover. */
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
  ゃ: 'ya', ゅ: 'yu', ょ: 'yo',
};

const MACRON = { a: 'ā', i: 'ii', u: 'ū', e: 'ē', o: 'ō' };

/* --------------------------------------------------------------------------
   CHARACTER CLASSES
-------------------------------------------------------------------------- */

const RE_HIRAGANA = /[ぁ-ゖ]/;
const RE_KATAKANA = /[ァ-ヺー]/;
const RE_KANJI = /[㐀-䶿一-鿿豈-﫿]/;

export const hasKanji = (s) => RE_KANJI.test(String(s));
export const hasHiragana = (s) => RE_HIRAGANA.test(String(s));
export const hasKatakana = (s) => RE_KATAKANA.test(String(s));

/** Every Japanese character in the string is one script, or there are none. */
export function scriptOf(s) {
  const hira = hasHiragana(s);
  const kata = hasKatakana(s);
  if (hasKanji(s)) return 'kanji';
  if (hira && kata) return 'mixed';
  if (hira) return 'hiragana';
  if (kata) return 'katakana';
  return 'none';
}

/** Katakana folded onto hiragana. ー is left alone; it is handled as length. */
export function toHiragana(s) {
  return String(s).replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/* --------------------------------------------------------------------------
   THE TRANSLITERATOR

   Two passes. The first turns kana into pieces that each remember their own
   vowel; the second merges vowel runs into macrons. Doing length in a second
   pass is what lets ー and おう share one rule instead of two.
-------------------------------------------------------------------------- */

function transliterateWord(word) {
  const src = toHiragana(word);
  const pieces = [];           /* { text, vowel, bare } */
  let sokuon = false;
  let i = 0;

  const push = (text, opts = {}) => {
    if (sokuon) {
      /* A doubled consonant. Before ch, Hepburn writes t rather than c. */
      const first = text[0];
      text = (text.startsWith('ch') ? 't' : first) + text;
      sokuon = false;
    }
    pieces.push({ text, vowel: opts.vowel ?? text.slice(-1), bare: !!opts.bare });
  };

  while (i < src.length) {
    const two = src.slice(i, i + 2);
    const one = src[i];

    if (one === 'っ') { sokuon = true; i += 1; continue; }

    if (one === 'ー') {
      /* Length mark. Lengthen whatever vowel came last. */
      const prev = pieces[pieces.length - 1];
      if (prev && MACRON[prev.vowel]) {
        prev.text = prev.text.slice(0, -1) + MACRON[prev.vowel];
        prev.vowel = prev.vowel === 'i' ? 'i' : prev.vowel;
        prev.lengthened = true;
      }
      i += 1; continue;
    }

    if (one === 'ん') {
      /* n' before a vowel or y, so しんよう does not read as shi-nyo-u. */
      const next = src[i + 1] || '';
      const ambiguous = /[あいうえおやゆよ]/.test(next);
      pieces.push({ text: ambiguous ? "n'" : 'n', vowel: null });
      i += 1; continue;
    }

    if (DIGRAPHS[two]) { push(DIGRAPHS[two]); i += 2; continue; }
    if (MONOGRAPHS[one]) {
      push(MONOGRAPHS[one], { bare: /[あいうえお]/.test(one) });
      i += 1; continue;
    }

    /* Not kana. Latin, digits, punctuation, kanji: passed through untouched so
       a mixed string still produces something a human can read in a failure
       message. Callers that care about kanji ask hasKanji() first. */
    pieces.push({ text: one, vowel: null, passthrough: true });
    i += 1;
  }

  /* Pass two: a bare vowel following a syllable that ends in the vowel it
     lengthens becomes a macron. えい and いい are excluded by the table. */
  const out = [];
  for (const p of pieces) {
    const prev = out[out.length - 1];
    if (p.bare && prev && !prev.lengthened && prev.vowel && !prev.passthrough) {
      const v = prev.vowel;
      const lengthens = (v === 'o' && (p.text === 'u' || p.text === 'o'))
        || (v === 'u' && p.text === 'u')
        || (v === 'a' && p.text === 'a')
        || (v === 'e' && p.text === 'e');
      if (lengthens) {
        prev.text = prev.text.slice(0, -1) + MACRON[v];
        prev.lengthened = true;
        continue;
      }
    }
    out.push(p);
  }

  return out.map((p) => p.text).join('');
}

/**
 * Kana to modified Hepburn. Non-kana passes through unchanged.
 * Standalone は / へ are read as the particles they are; see the header.
 */
export function toRomaji(s) {
  return String(s)
    .split(/(\s+)/)
    .map((tok) => {
      if (/^\s*$/.test(tok)) return tok;
      if (tok === 'は') return 'wa';
      if (tok === 'へ') return 'e';
      return transliterateWord(tok);
    })
    .join('');
}

/* --------------------------------------------------------------------------
   NORMALISATION

   One definition, used by every comparison, so two checks can never disagree
   about whether a trailing 。 matters. Macrons are NOT folded away: the scheme
   is the thing being asserted, so ginkouin must not quietly equal ginkōin.
-------------------------------------------------------------------------- */

/** For comparing two romaji strings. Case, spacing and hyphenation are style. */
export function normaliseRomaji(s) {
  return String(s)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\-‐‑–—'’.·]/g, '');
}

/** For comparing two Japanese strings. Spacing is a display convention. */
export function normaliseJa(s) {
  return String(s)
    .normalize('NFKC')
    .replace(/[\s　]/g, '')
    .replace(/[。．]$/, '');
}

/**
 * Does `romaji` match what `ja` actually reads?
 *
 * `spelled` is a map of kana to declared romanisation, for names that romanise
 * to their source spelling rather than to their reading (キム is Kim, not
 * kimu). It has to apply to SUBSTRINGS, not only to whole terms: declaring it
 * on キムさん and then failing every sentence that contains キムさん would make
 * the exemption useless at exactly the point it is needed. Substituting before
 * transliteration is what makes the declaration inherit.
 *
 * Returns { applicable, expected, got } so a caller can distinguish "wrong"
 * from "cannot be checked", which are different verdicts and must not merge.
 */
export function romajiAgrees(ja, romaji, spelled = new Map()) {
  if (hasKanji(ja)) return { applicable: false, why: 'contains kanji' };
  let src = String(ja);
  /* Longest first, so ミラーさん wins over さん. */
  for (const key of [...spelled.keys()].sort((a, b) => b.length - a.length)) {
    src = src.split(key).join(` ${spelled.get(key)} `);
  }
  const expected = toRomaji(src).replace(/\s+/g, ' ').trim();
  return {
    applicable: true,
    ok: normaliseRomaji(expected) === normaliseRomaji(romaji),
    expected,
    got: String(romaji),
  };
}
