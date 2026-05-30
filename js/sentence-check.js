(function (global) {
  "use strict";

  const MIN_WORDS = 10;

  function countWords(text) {
    return text
      .trim()
      .split(/\s+/)
      .filter(function (w) {
        return w.length > 0;
      }).length;
  }

  /** Common kid typos where LanguageTool picks the wrong word. */
  const BETTER_SPELLING = {
    stary: "stay",
    teh: "the",
    becuase: "because",
  };

  function localTypoIssues(text) {
    const issues = [];
    Object.keys(BETTER_SPELLING).forEach(function (wrong) {
      const re = new RegExp("\\b" + wrong + "\\b", "i");
      const m = re.exec(text);
      if (!m) return;
      const fix = BETTER_SPELLING[wrong];
      issues.push({
        type: "typo",
        topic: "typo:" + wrong,
        message: 'Typo: you wrote "' + m[0] + '" — try "' + fix + '" instead',
        word: m[0],
        suggestion: fix,
        offset: m.index,
      });
    });
    return issues;
  }

  /** Irregular forms for wordpack verbs and common kid vocabulary. */
  const IRREGULAR_VERBS = {
    affect: { third: "affects", past: "affected", ing: "affecting" },
    effect: { third: "effects", past: "effected", ing: "effecting" },
    sustain: { third: "sustains", past: "sustained", ing: "sustaining" },
    trek: { third: "treks", past: "trekked", ing: "trekking" },
    damage: { third: "damages", past: "damaged", ing: "damaging" },
    rescue: { third: "rescues", past: "rescued", ing: "rescuing" },
    survive: { third: "survives", past: "survived", ing: "surviving" },
    bellow: { third: "bellows", past: "bellowed", ing: "bellowing" },
    scare: { third: "scares", past: "scared", ing: "scaring" },
    go: { third: "goes", past: "went", ing: "going" },
    run: { third: "runs", past: "ran", ing: "running" },
    walk: { third: "walks", past: "walked", ing: "walking" },
    play: { third: "plays", past: "played", ing: "playing" },
    do: { third: "does", past: "did", ing: "doing" },
    have: { third: "has", past: "had", ing: "having" },
    say: { third: "says", past: "said", ing: "saying" },
    get: { third: "gets", past: "got", ing: "getting" },
    make: { third: "makes", past: "made", ing: "making" },
    come: { third: "comes", past: "came", ing: "coming" },
    see: { third: "sees", past: "saw", ing: "seeing" },
    eat: { third: "eats", past: "ate", ing: "eating" },
    take: { third: "takes", past: "took", ing: "taking" },
    give: { third: "gives", past: "gave", ing: "giving" },
    write: { third: "writes", past: "wrote", ing: "writing" },
    begin: { third: "begins", past: "began", ing: "beginning" },
    swim: { third: "swims", past: "swam", ing: "swimming" },
    fly: { third: "flies", past: "flew", ing: "flying" },
    keep: { third: "keeps", past: "kept", ing: "keeping" },
    remain: { third: "remains", past: "remained", ing: "remaining" },
    stay: { third: "stays", past: "stayed", ing: "staying" },
    feel: { third: "feels", past: "felt", ing: "feeling" },
    seem: { third: "seems", past: "seemed", ing: "seeming" },
    become: { third: "becomes", past: "became", ing: "becoming" },
  };

  /** Words that are verbs/auxiliaries — not subjects when they appear before a target word. */
  const LINKING_AND_AUX_VERBS =
    /^(keep|kept|remain|remains|remained|stay|stays|stayed|look|looks|looked|seem|seems|seemed|become|becomes|became|feel|feels|felt|get|gets|got|grow|grows|grew|was|were|is|are|am|been|being|have|has|had|do|does|did|will|would|can|could|may|might|must|shall|should|go|goes|went|make|makes|made|let|lets|became|being|scared|afraid)$/i;

  const SUBJECT_STOP_WORDS =
    /^(the|a|an|to|and|or|but|when|if|because|after|before|that|this|which|who|how|what|where|while|as|at|in|on|of|for|with|by|from|into|through|during|then|also|not|very|so|too|just|even|being|of)$/i;

  const PLURAL_SUBJECTS =
    /^(i|you|we|they|people|children|men|women|folks|students|parents|teachers|friends|these|those|us|them)$/i;

  /** Nouns ending in -s that are still singular (avoid false plural flags). */
  const SINGULAR_S_WORDS =
    /^(news|mathematics|physics|politics|economics|class|glass|bus|gas|grass|lens|illness|happiness|stress|darkness|kindness|this|that|unless|across|always|plus|is|us|as|his|its|yes|underground|overground)$/i;

  /** Vocabulary / place words that are not verbs — do not run verb agreement on them. */
  const NOUN_OR_PLACE_LEMMAS =
    /^(underground|overground|indoor|outdoor|earthworm|grasshopper|insect|mammal|understory|city|country|campus|manual|building|material|disaster|flower|flowers|rabbit|dog|knight|weather|climate|trek|resource|survivor|footprint|drought|gust|marine|emergent|ferocious|poisonous|dangerous|destructive|frequent|prone|armoured|stormproof)$/i;

  /** Adjectives often before a noun (not subjects). */
  const DESCRIPTOR_WORDS =
    /^(dark|bright|light|heavy|storm|deep|high|low|new|old|red|black|white|hot|cold|warm|cool|wet|dry|long|short|big|small|natural|large|tiny|young|good|bad|safe|wild|dead|bare|empty|full|rich|poor|hard|soft|fast|slow|loud|quiet|clean|dirty|sharp|dull|thick|thin|wide|narrow|flat|round|straight|curved|rough|smooth|fresh|stale|raw|ripe|raw|sunny|cloudy|rainy|windy|snowy|foggy|clear|murky|dim|pale|bold|faint|strong|weak|fine|coarse|plain|fancy|simple|complex|urban|rural|local|global|public|private|secret|open|closed|hidden|visible|silent|noisy|still|calm|angry|happy|sad|scared|afraid|brave|bold|proud|shy|bold|ferocious|poisonous|marine|dangerous|destructive|prone|emergent|armoured|storm)$/i;

  const NUMBER_WORDS =
    /^(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|\d+)$/i;

  const NON_COUNT_NOUNS =
    /^(money|water|air|food|rice|bread|information|news|homework|work|time|space|music|weather|sunshine|rain|snow|sand|gold|silver|furniture|equipment|luggage|advice|help|fun|luck|peace|love|hate|energy|power|light|darkness|underground)$/i;

  const IRREGULAR_PLURALS = {
    child: "children",
    person: "people",
    man: "men",
    woman: "women",
    mouse: "mice",
    goose: "geese",
    foot: "feet",
    tooth: "teeth",
    fish: "fish",
    sheep: "sheep",
    deer: "deer",
  };

  const STATUS_PARTICIPLES = {
    live: "living",
    sit: "sitting",
    stand: "standing",
    stay: "staying",
    remain: "remaining",
    sleep: "sleeping",
    walk: "walking",
    run: "running",
    play: "playing",
    work: "working",
    hide: "hiding",
    wait: "waiting",
    move: "moving",
  };

  const COMMON_BASE_VERBS = [
    "go",
    "do",
    "have",
    "run",
    "walk",
    "play",
    "like",
    "want",
    "need",
    "help",
    "make",
    "take",
    "come",
    "see",
    "get",
    "give",
    "tell",
    "eat",
    "live",
    "work",
    "look",
    "use",
    "find",
    "keep",
    "begin",
    "show",
    "hear",
    "move",
    "bring",
    "write",
    "sit",
    "stand",
    "learn",
    "watch",
    "stop",
    "speak",
    "read",
    "open",
    "wait",
    "build",
    "stay",
    "send",
    "agree",
    "catch",
    "carry",
    "break",
    "remember",
    "think",
    "feel",
    "leave",
    "call",
    "try",
    "ask",
    "turn",
    "start",
    "hold",
    "keep",
    "remain",
    "stay",
    "feel",
    "seem",
    "look",
    "become",
    "grow",
    "scare",
    "roar",
    "chase",
    "hunt",
    "attack",
    "hide",
    "jump",
    "climb",
    "fight",
    "bite",
    "drink",
  ];

  function isLikelyAdjectiveLemma(lemma) {
    const w = lemma.trim().toLowerCase();
    if (!w || IRREGULAR_VERBS[w]) return false;
    return /(?:ed|ous|ful|less|ive|ant|ent|ic|al|ary|like|proof|ing)$/i.test(w);
  }

  function isLikelyNounOrPlaceLemma(lemma) {
    const w = lemma.trim().toLowerCase();
    if (!w) return false;
    if (NOUN_OR_PLACE_LEMMAS.test(w)) return true;
    if (w.indexOf("-") !== -1) return true;
    if (/ground$/.test(w) && /^(under|over|back|play|camp|school|play)/.test(w)) return true;
    return false;
  }

  function isLikelyDescriptorWord(word) {
    const w = word.toLowerCase();
    return DESCRIPTOR_WORDS.test(w) || isLikelyAdjectiveLemma(w);
  }

  function suggestPluralNoun(noun) {
    const n = noun.toLowerCase();
    if (IRREGULAR_PLURALS[n]) return IRREGULAR_PLURALS[n];
    if (looksPluralSubject(n)) return n;
    if (n.endsWith("y") && !/[aeiou]y$/i.test(n)) return n.slice(0, -1) + "ies";
    if (/(?:s|sh|ch|x|z)$/i.test(n)) return n + "es";
    return n + "s";
  }

  function isLikelyPluralNounLemma(lemma) {
    const w = lemma.trim().toLowerCase();
    if (!w || IRREGULAR_VERBS[w]) return false;
    if (PLURAL_SUBJECTS.test(w)) return true;
    if (SINGULAR_S_WORDS.test(w)) return false;
    if (w.endsWith("s") && w.length > 3 && !/(ss|us|is|as|ness|less|ous)$/i.test(w)) {
      return true;
    }
    return false;
  }

  function isCheckableVerbLemma(lemma) {
    const w = lemma.trim().toLowerCase();
    if (!w || !/^[a-z]+$/.test(w)) return false;
    if (isLikelyAdjectiveLemma(w)) return false;
    if (isLikelyPluralNounLemma(w)) return false;
    if (isLikelyNounOrPlaceLemma(w)) return false;
    return true;
  }

  function isVerbLikeWord(word) {
    return LINKING_AND_AUX_VERBS.test(word) || COMMON_BASE_VERBS.indexOf(word.toLowerCase()) !== -1;
  }

  function stripThirdPersonSuffix(word) {
    const w = word.toLowerCase();
    if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
    if (w.endsWith("es") && w.length > 3) return w.slice(0, -2);
    if (w.endsWith("s") && w.length > 2) return w.slice(0, -1);
    return w;
  }

  function findConjugationByThirdForm(word) {
    const w = word.toLowerCase();
    let base;
    for (base in IRREGULAR_VERBS) {
      if (IRREGULAR_VERBS[base].third === w) {
        return Object.assign({ base: base }, IRREGULAR_VERBS[base]);
      }
    }
    const stem = stripThirdPersonSuffix(w);
    if (!stem || stem === w) return null;
    const conj = getVerbConjugation(stem);
    if (conj && conj.third === w) return conj;
    return null;
  }

  function resolveVerbConjugation(verb) {
    const w = verb.toLowerCase();
    if (IRREGULAR_VERBS[w]) {
      return Object.assign({ base: w }, IRREGULAR_VERBS[w]);
    }
    const fromThird = findConjugationByThirdForm(w);
    if (fromThird) return fromThird;
    return getVerbConjugation(w);
  }

  function isKnownActionVerb(conj) {
    if (!conj || !conj.base) return false;
    const base = conj.base;
    if (IRREGULAR_VERBS[base] || COMMON_BASE_VERBS.indexOf(base) !== -1) return true;
    return false;
  }

  /** Words that must never be treated as verbs by local agreement rules. */
  const NON_VERB_WORDS =
    /^(quite|rather|really|very|just|even|still|already|almost|enough|and|or|but|so|because|if|when|while|though|although|than|then|not|no|yes|also|too|as|at|in|on|of|for|with|by|from|into|through|during|about|over|under|between|after|before|up|down|out|off|hot|cold|warm|cool|harmful|natural|quite|own|ours|mine|yours|theirs|his|hers|its|our|your|their|my|your|his|her|this|that|these|those|every|each|both|all|some|any|many|much|more|most|less|few|several|other|another|such|same|own|own|gas|earth|greenhouse)$/i;

  /** First noun subject in "The/A/An X …" for shared-subject checks. */
  function inferLeadingSingularSubject(text) {
    const m = text.match(/^\s*(?:the|a|an)\s+([A-Za-z]+)\b/i);
    if (!m) return null;
    const subj = m[1];
    if (SUBJECT_STOP_WORDS.test(subj.toLowerCase()) || isVerbLikeWord(subj.toLowerCase())) {
      return null;
    }
    if (!looksSingularSubject(subj.toLowerCase())) return null;
    return subj;
  }

  const PAST_CLAUSE_WORDS =
    /\b(was|were|had|did|been|scared|afraid|killed|hurt|died|went|ran|said|got|made|came|saw|took|gave|felt|kept|remained|stayed|became|thought|found|left|told|heard|brought|began|held|wrote|stood|met|lost|paid|built|sent|fought|won|spent|taught|caught|broke|chose|drove|ate|fell|flew|forgot|grew|hid|knew|led|lay|meant|rode|rose|sang|sat|slept|spoke|stole|swam|tore|wore)\b/i;

  const PRESENT_CLAUSE_WORDS =
    /\b(keeps|goes|walks|runs|remains|stays|seems|looks|feels|becomes|gets|grows|makes|takes|comes|plays|helps|wants|needs|likes|starts|stops|reads|writes|speaks|opens|waits|builds|sends|catches|carries|breaks|agrees|does|has|is|are|am)\b/i;

  function describeClauseTense(clause) {
    const c = clause.toLowerCase();
    const hasPastWord = PAST_CLAUSE_WORDS.test(c) || /\b(was|were|had|did)\b/.test(c);
    const hasPastTime = sentenceSuggestsPast(clause);
    const hasPresentVerb = PRESENT_CLAUSE_WORDS.test(c) && !/\b(was|were|had|did)\b/.test(c);

    if ((hasPastWord || hasPastTime) && hasPresentVerb) return "present";
    if (hasPastWord || hasPastTime) return "past";
    if (hasPresentVerb) return "present";
    return "neutral";
  }

  function findPresentVerbInPastNarrative(text) {
    const re = /\b(?:(?:the|a|an)\s+)?([A-Za-z]+)\s+([A-Za-z]+)\b/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      const subjLower = m[1].toLowerCase();
      const verb = m[2].toLowerCase();
      if (SUBJECT_STOP_WORDS.test(subjLower) || isVerbLikeWord(subjLower)) continue;
      if (!looksSingularSubject(subjLower)) continue;
      const conj = resolveVerbConjugation(verb);
      if (!isKnownActionVerb(conj)) continue;
      if (verb === conj.third || verb === conj.base) {
        return { subj: m[1], verb: verb, past: conj.past, third: conj.third };
      }
    }
    return null;
  }

  /** Mixed tense across and / because / but clauses, or present verb + past clause in one sentence. */
  function localTenseConsistencyIssues(text) {
    const issues = [];
    const seen = {};
    const parts = text.split(/\s+(?:and|but|because)\s+/i);
    const moods = parts.map(describeClauseTense);
    const hasPastClause = moods.indexOf("past") !== -1;
    const hasPresentClause = moods.indexOf("present") !== -1;

    const presentInPast = findPresentVerbInPastNarrative(text);
    const narrativePast =
      sentenceSuggestsPast(text) || /\b(was|were|had|did)\b/i.test(text);

    if (parts.length >= 2 && hasPastClause && hasPresentClause) {
      const hit = presentInPast || findPresentVerbInPastNarrative(parts[moods.indexOf("present")] || parts[0]);
      const fix = hit && hit.past ? hit.past : "kept";
      const wrong = hit ? hit.verb : "keeps";
      pushTenseIssue(issues, seen, {
        type: "tense",
        topic: "tense-consistency-clauses",
        message:
          'Tense: the two parts of your sentence do not match — one part is present tense ("' +
          wrong +
          '") and another is past tense (e.g. "was"). Use the same past tense throughout. Try "' +
          fix +
          '" instead of "' +
          wrong +
          '". Example: "The knight kept armoured after war because he was scared of being killed."',
        word: wrong,
        suggestion: fix,
      });
      return issues;
    }

    if (narrativePast && presentInPast && presentInPast.past) {
      pushTenseIssue(issues, seen, {
        type: "tense",
        topic: "tense-consistency-narrative",
        message:
          'Tense: you wrote present tense ("' +
          presentInPast.verb +
          '") in a past-time sentence (e.g. "after war", "was"). Use past tense: "' +
          presentInPast.past +
          '". Example: "The ' +
          presentInPast.subj.toLowerCase() +
          " " +
          presentInPast.past +
          ' armoured after war because he was scared."',
        word: presentInPast.verb,
        suggestion: presentInPast.past,
      });
    }

    return issues;
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function regularVerbForms(base) {
    let third;
    if (base.endsWith("y") && !/[aeiou]y$/i.test(base)) {
      third = base.slice(0, -1) + "ies";
    } else if (/(?:s|sh|ch|x|z)$/i.test(base)) {
      third = base + "es";
    } else {
      third = base + "s";
    }
    const past = base.endsWith("e") ? base + "d" : base + "ed";
    const ing = base.endsWith("e") ? base.slice(0, -1) + "ing" : base + "ing";
    return { third: third, past: past, ing: ing };
  }

  function getVerbConjugation(lemma) {
    const base = lemma.trim().toLowerCase();
    if (!base || !/^[a-z]+$/.test(base)) return null;
    if (IRREGULAR_VERBS[base]) {
      return Object.assign({ base: base }, IRREGULAR_VERBS[base]);
    }
    return Object.assign({ base: base }, regularVerbForms(base));
  }

  function getWordForms(target) {
    const base = target.trim().toLowerCase();
    if (!base) return [];
    if (isLikelyAdjectiveLemma(base)) {
      return [base];
    }
    const conj = getVerbConjugation(target);
    if (!conj) return [base];
    const forms = [conj.base];
    if (conj.third) forms.push(conj.third);
    if (conj.past) forms.push(conj.past);
    if (conj.ing) forms.push(conj.ing);
    return forms;
  }

  function containsTargetWord(text, target) {
    return getWordForms(target).some(function (form) {
      const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp("\\b" + escaped + "\\b", "i").test(text);
    });
  }

  /** Present-time words → verb should not be past tense only. */
  function sentenceSuggestsPresent(text) {
    const t = text.toLowerCase();
    return (
      /\b(today|now|every day|each day|always|usually|often|normally|currently|every morning|every night|these days)\b/.test(
        t
      ) || /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(t)
    );
  }

  /** Past-time words → verb should be past tense (e.g. affected), not present (affects). */
  function sentenceSuggestsPast(text) {
    const t = text.toLowerCase();
    return (
      /\byesterday\b/.test(t) ||
      /\blast\s+(night|week|month|year|summer|spring|winter|fall|autumn|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(
        t
      ) ||
      /\b\d+\s+(day|week|month|year)s?\s+ago\b/.test(t) ||
      /\b(two|three|four|five|six|seven|eight|nine|ten)\s+(days?|weeks?|months?|years?)\s+ago\b/.test(
        t
      ) ||
      /\bpreviously\b/.test(t) ||
      /\bback\s+then\b/.test(t) ||
      /\bafter\s+(?:the\s+)?(?:war|battle|fight|storm|trip|game|school|rain|accident|fall|injury)\b/.test(t) ||
      /\bduring\s+(?:the\s+)?(?:war|battle|fight|storm|trip|game|school|rain)\b/.test(t) ||
      (/\b(was|were|had|did)\b/.test(t) && !sentenceSuggestsPresent(text))
    );
  }

  function looksPluralSubject(word) {
    const w = word.toLowerCase();
    if (SINGULAR_S_WORDS.test(w)) return false;
    if (PLURAL_SUBJECTS.test(w)) return true;
    if (w.endsWith("s") && w.length > 3 && !/(ss|us|is|as|ness|less|ous)$/i.test(w)) {
      return true;
    }
    return false;
  }

  function looksSingularSubject(word) {
    return !looksPluralSubject(word);
  }

  /** e.g. "buildings in the campus are" — subject is buildings, not campus */
  function hasPluralSubjectBefore(text, matchIndex, matchedSubj) {
    const before = text.slice(0, matchIndex);
    const patterns = [
      new RegExp(
        "\\b([A-Za-z]+)\\s+in\\s+the\\s+" + escapeRegex(matchedSubj.toLowerCase()) + "\\s*$",
        "i"
      ),
      /\b([A-Za-z]+)\s+in\s+the\s+[A-Za-z]+\s*$/i,
      /\b([A-Za-z]+)\s+(?:on|at|of|for|with|by|from|near)\s+the\s+[A-Za-z]+\s*$/i,
    ];
    for (let i = 0; i < patterns.length; i++) {
      const tail = before.match(patterns[i]);
      if (tail && looksPluralSubject(tail[1].toLowerCase())) return true;
    }
    return false;
  }

  function pushTenseIssue(issues, seen, item) {
    const topic = item.topic;
    if (seen[topic]) return;
    seen[topic] = true;
    issues.push(item);
  }

  /** Plural subject + is/was/am/has/does → are/were/have/do */
  function localPluralBeVerbIssues(text) {
    const past = sentenceSuggestsPast(text);
    const issues = [];
    const seen = {};
    const re = /\b([A-Za-z]+)\s+(is|was|am|has|does)\b/gi;
    let m;

    while ((m = re.exec(text)) !== null) {
      const subj = m[1];
      const subjLower = subj.toLowerCase();
      const verb = m[2].toLowerCase();
      if (SUBJECT_STOP_WORDS.test(subjLower) || isVerbLikeWord(subjLower)) continue;
      if (!looksPluralSubject(subjLower)) continue;

      let fix = null;
      if (verb === "is") fix = past ? "were" : "are";
      else if (verb === "was") fix = "were";
      else if (verb === "am") fix = past ? "were" : "are";
      else if (verb === "has") fix = "have";
      else if (verb === "does") fix = "do";
      if (!fix) continue;

      pushTenseIssue(issues, seen, {
        type: "tense",
        topic: "plural-be-" + subjLower + "-" + verb,
        message:
          'Verb agreement: "' +
          subj +
          '" is plural — use "' +
          fix +
          '", not "' +
          verb +
          '". Example: "Too many ' +
          subjLower +
          " " +
          fix +
          ' on the table."',
        word: verb,
        suggestion: fix,
        offset: m.index + subj.length + 1,
      });
    }

    return issues;
  }

  /** Singular subject + are/were/have/do → is/was/has/does (incl. "that the building … are"). */
  function localSingularBeVerbIssues(text) {
    const past = sentenceSuggestsPast(text);
    const issues = [];
    const seen = {};

    function checkMatch(subj, verb, indexSubj, indexVerb) {
      const subjLower = subj.toLowerCase();
      const v = verb.toLowerCase();
      if (SUBJECT_STOP_WORDS.test(subjLower) || isVerbLikeWord(subjLower)) return;
      if (!looksSingularSubject(subjLower)) return;

      let fix = null;
      if (v === "are") fix = past ? "was" : "is";
      else if (v === "were") fix = "was";
      else if (v === "have") fix = "has";
      else if (v === "do") fix = "does";
      if (!fix) return;

      pushTenseIssue(issues, seen, {
        type: "tense",
        topic: "singular-be-" + subjLower + "-" + v,
        message:
          'Verb agreement: "' +
          subj +
          '" is singular — use "' +
          fix +
          '", not "' +
          v +
          '". Example: "The building in the campus ' +
          fix +
          ' made from storm-proof materials."',
        word: verb,
        suggestion: fix,
        offset: indexVerb,
      });
    }

    const adjacent =
      /\b(?:the|a|an|each|every|this|that|my|his|her|its|our|your)\s+([A-Za-z]+)\s+(are|were|have|do)\b/gi;
    let m;
    while ((m = adjacent.exec(text)) !== null) {
      const verbIndex = m.index + m[0].lastIndexOf(m[2]);
      if (hasPluralSubjectBefore(text, verbIndex, m[1])) continue;
      checkMatch(m[1], m[2], m.index, verbIndex);
    }

    const clauseWithPP =
      /\b(?:that|which|who)\s+(?:the|a|an|my|his|her|its|our|your|this|that)?\s*([A-Za-z]+)((?:\s+(?!are\b|were\b|is\b|was\b|am\b|have\b|has\b|do\b|does\b|did\b|been\b|being\b|be\b|made\b|make\b|maked\b)[A-Za-z]+)*)\s+(are|were|have|do)\b/gi;
    while ((m = clauseWithPP.exec(text)) !== null) {
      checkMatch(m[1], m[3], m.index, m.index + m[0].lastIndexOf(m[3]));
    }

    return issues;
  }

  /** five rabbit → five rabbits; six dog → six dogs */
  function localNumberPluralIssues(text) {
    const issues = [];
    const seen = {};
    const re = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|\d+)\s+([A-Za-z]+)\b/gi;
    let m;

    while ((m = re.exec(text)) !== null) {
      const num = m[1];
      const noun = m[2];
      const nounLower = noun.toLowerCase();
      if (!NUMBER_WORDS.test(num)) continue;
      if (NON_COUNT_NOUNS.test(nounLower)) continue;
      if (looksPluralSubject(nounLower)) continue;
      if (isLikelyDescriptorWord(nounLower)) continue;

      const plural = suggestPluralNoun(nounLower);
      if (plural === nounLower) continue;

      const topic = "number-plural-" + num + "-" + nounLower;
      if (seen[topic]) continue;

      pushTenseIssue(issues, seen, {
        type: "grammar",
        topic: topic,
        message:
          'Use a plural noun after a number: "' +
          num +
          " " +
          plural +
          '", not "' +
          num +
          " " +
          nounLower +
          '". Example: "There are five rabbits and six dogs living underground."',
        word: noun,
        suggestion: plural,
        offset: m.index + num.length + 1,
      });
    }

    return issues;
  }

  /** there are … live → there are … living (describes a state, not a second verb). */
  function localThereAreStructureIssues(text) {
    const issues = [];
    const seen = {};
    const re =
      /\bthere\s+(are|were)\s+(.+?)\s+(live|sit|stand|stay|remain|sleep|walk|run|play|work|hide|wait|move)\b/gi;
    let m;

    while ((m = re.exec(text)) !== null) {
      const verb = m[3].toLowerCase();
      const chunk = m[0];
      if (/\b(that|who|which)\s+(live|sit|stand|stay|remain|sleep|walk|run|play|work|hide|wait|move)\b/i.test(chunk)) {
        continue;
      }
      if (/\bto\s+(live|sit|stand|stay|remain|sleep|walk|run|play|work|hide|wait|move)\b/i.test(chunk)) {
        continue;
      }

      const participle = STATUS_PARTICIPLES[verb];
      if (!participle) continue;

      const topic = "there-are-" + verb;
      if (seen[topic]) continue;

      pushTenseIssue(issues, seen, {
        type: "grammar",
        topic: topic,
        message:
          'After "there are …", use "' +
          participle +
          '" (not "' +
          verb +
          '") to describe where something is. Example: "There are five rabbits and six dogs living in the dark underground of the city."',
        word: verb,
        suggestion: participle,
        offset: m.index + chunk.lastIndexOf(verb),
      });
    }

    return issues;
  }

  /** Target vocabulary verb: agreement (present) and tense (past markers). */
  function localTargetVerbIssues(text, targetWord) {
    if (!isCheckableVerbLemma(targetWord)) return [];

    const conj = getVerbConjugation(targetWord);
    if (!conj || !conj.base) return [];

    const past = sentenceSuggestsPast(text);
    const presentHint = sentenceSuggestsPresent(text);
    const issues = [];
    const seen = {};
    const forms = [
      { key: "base", word: conj.base },
      { key: "third", word: conj.third },
      { key: "past", word: conj.past },
    ].filter(function (f) {
      return f.word;
    });

    forms.forEach(function (form) {
      const re = new RegExp("\\b([A-Za-z]+)\\s+" + escapeRegex(form.word) + "\\b", "gi");
      let m;
      while ((m = re.exec(text)) !== null) {
        const subj = m[1];
        const subjLower = subj.toLowerCase();
        if (SUBJECT_STOP_WORDS.test(subjLower) || isVerbLikeWord(subjLower)) continue;
        if (isLikelyDescriptorWord(subjLower)) continue;
        if (isLikelyNounOrPlaceLemma(form.word)) continue;
        let fix = null;
        let label = "Verb agreement";
        let example = "";

        if (past && form.key !== "past") {
          fix = conj.past;
          label = "Verb tense";
          example = "The " + subjLower + " " + conj.past + " armoured after the war.";
        } else if (!past) {
          if (looksSingularSubject(subjLower) && form.key === "base") {
            fix = conj.third;
            example = "The " + subjLower + " " + conj.third + " every day.";
          } else if (looksPluralSubject(subjLower) && form.key === "third") {
            fix = conj.base;
            example = "The " + subjLower + " " + conj.base + " together.";
          } else if (presentHint && looksSingularSubject(subjLower) && form.key === "past") {
            fix = conj.third;
            label = "Verb tense";
            example = "The " + subjLower + " " + conj.third + " today.";
          }
        }

        if (fix && fix.toLowerCase() !== form.word.toLowerCase()) {
          pushTenseIssue(issues, seen, {
            type: "tense",
            topic: "target-verb-" + form.key + "-" + subjLower + "-" + conj.base,
            message:
              label +
              ': after "' +
              subj +
              '" use "' +
              fix +
              '", not "' +
              form.word +
              '". Example: "' +
              example +
              '"',
            word: form.word,
            suggestion: fix,
            offset: m.index + subj.length + 1,
          });
          break;
        }
      }
    });

    return issues;
  }

  /** the knight keep … / a storm damage … — real subject + verb, not the word before an adjective. */
  function localSubjectVerbIssues(text) {
    const past = sentenceSuggestsPast(text);
    const presentHint = sentenceSuggestsPresent(text);
    const issues = [];
    const seen = {};
    const re =
      /\b(?:(?:the|a|an)\s+)?([A-Za-z]+)\s+([A-Za-z]+)\b/gi;
    let m;

    while ((m = re.exec(text)) !== null) {
      const subjLower = m[1].toLowerCase();
      const verb = m[2].toLowerCase();
      const subj = m[1];

      if (SUBJECT_STOP_WORDS.test(subjLower)) continue;
      if (isVerbLikeWord(subjLower)) continue;
      if (NON_VERB_WORDS.test(verb)) continue;
      if (!looksSingularSubject(subjLower)) continue;

      if (STATUS_PARTICIPLES[verb]) {
        const head = text.slice(0, m.index);
        if (/\bthere\s+(are|were)\b/i.test(head)) continue;
      }

      const countedNounPrefix = text.slice(Math.max(0, m.index - 24), m.index + subj.length);
      if (
        new RegExp(
          "\\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|\\d+)\\s+" +
            escapeRegex(subj) +
            "\\s*$",
          "i"
        ).test(countedNounPrefix)
      ) {
        continue;
      }

      const conj = resolveVerbConjugation(verb);
      if (!isKnownActionVerb(conj)) continue;

      if (past && (verb === conj.base || verb === conj.third)) {
        pushTenseIssue(issues, seen, {
          type: "tense",
          topic: "subj-verb-past-" + subjLower + "-" + verb,
          message:
            'Verb tense: after "' +
            subj +
            '" use "' +
            conj.past +
            '", not "' +
            verb +
            '". Example: "The ' +
            subjLower +
            " " +
            conj.past +
            ' armoured after the war."',
          word: verb,
          suggestion: conj.past,
          offset: m.index + m[0].lastIndexOf(verb),
        });
      } else if (!past && verb === conj.base) {
        pushTenseIssue(issues, seen, {
          type: "tense",
          topic: "subj-verb-agree-" + subjLower + "-" + verb,
          message:
            'Verb agreement: after "' +
            subj +
            '" use "' +
            conj.third +
            '", not "' +
            verb +
            '". Example: "The ' +
            subjLower +
            " " +
            conj.third +
            ' the gate every day."',
          word: verb,
          suggestion: conj.third,
          offset: m.index + m[0].lastIndexOf(verb),
        });
      }
    }

    return issues;
  }

  /** Same singular subject after "and": "The monster bellows … and scare …" → scares. */
  function localCoordinatedVerbIssues(text) {
    if (sentenceSuggestsPast(text)) return [];

    const subj = inferLeadingSingularSubject(text);
    if (!subj) return [];

    const issues = [];
    const seen = {};
    const subjLower = subj.toLowerCase();
    const re = /\b(?:and|or)\s+([A-Za-z]+)\b/gi;
    let m;

    while ((m = re.exec(text)) !== null) {
      const verb = m[1].toLowerCase();
      if (LINKING_AND_AUX_VERBS.test(verb)) continue;

      const conj = resolveVerbConjugation(verb);
      if (!isKnownActionVerb(conj)) continue;
      if (verb !== conj.base) continue;

      pushTenseIssue(issues, seen, {
        type: "tense",
        topic: "coord-verb-agree-" + subjLower + "-" + verb,
        message:
          'Verb agreement: "' +
          subj +
          '" is singular — use "' +
          conj.third +
          '", not "' +
          verb +
          '". Example: "The ' +
          subjLower +
          " " +
          conj.third +
          ' away many animals."',
        word: verb,
        suggestion: conj.third,
        offset: m.index + m[0].lastIndexOf(verb),
      });
    }

    return issues;
  }

  /** he / she / it + base verb → needs third-person form (go → goes). */
  function localHeSheItIssues(text) {
    if (sentenceSuggestsPast(text)) return [];

    const issues = [];
    const seen = {};
    const re = /\b(he|she|it)\s+([a-z]+)\b/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      const pronoun = m[1];
      const verb = m[2].toLowerCase();
      if (verb.length < 2) continue;

      const conj = getVerbConjugation(verb);
      const third = conj ? conj.third : null;
      const isCommon = COMMON_BASE_VERBS.indexOf(verb) !== -1;
      if (!third || third === verb) continue;
      if (!isCommon) continue;

      pushTenseIssue(issues, seen, {
        type: "tense",
        topic: "he-she-it-" + verb,
        message:
          'Verb agreement: after "' +
          pronoun +
          '" use "' +
          third +
          '", not "' +
          verb +
          '". Example: "' +
          pronoun +
          " " +
          third +
          ' to school every day."',
        word: verb,
        suggestion: third,
        offset: m.index + pronoun.length + 1,
      });
    }
    return issues;
  }

  /** Past time + present-tense verb (walks, runs, affects) → past form. */
  function localPastTimeVerbIssues(text) {
    if (!sentenceSuggestsPast(text)) return [];

    const issues = [];
    const seen = {};
    const skipVerbs =
      /^(is|was|has|does|as|us|this|his|its|yes|always|needs|goes|pass|class|less|unless|focus|plus|bus|gas|grass|across|perhaps|sometimes)$/i;

    const re = /\b(?:the|a|an|he|she|it|my|his|her|their|our|your|every|each|this|that|[A-Za-z]+)\s+([A-Za-z]+)\b/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const presentVerb = m[1].toLowerCase();
      if (skipVerbs.test(presentVerb)) continue;

      const conj = resolveVerbConjugation(presentVerb);
      if (!isKnownActionVerb(conj) || presentVerb !== conj.third) continue;

      pushTenseIssue(issues, seen, {
        type: "tense",
        topic: "past-time-" + presentVerb,
        message:
          'Verb tense: with past time (e.g. yesterday), use "' +
          conj.past +
          '", not "' +
          presentVerb +
          '". Example: "She ' +
          conj.past +
          ' armoured after the war."',
        word: presentVerb,
        suggestion: conj.past,
        offset: m.index + m[0].lastIndexOf(presentVerb),
      });
    }

    const reBase = /\b(?:the|a|an|he|she|it|my|his|her|their|our|your|every|each|this|that|[A-Za-z]+)\s+(go|run|walk|play|take|make|come|see|get|give|eat|write|begin|swim|fly|keep|remain|stay|feel|seem|become|grow)\b/gi;
    while ((m = reBase.exec(text)) !== null) {
      const verb = m[1].toLowerCase();
      const subjectMatch = m[0].match(/\b([A-Za-z]+)\s+[A-Za-z]+\b/i);
      const subjLower = subjectMatch ? subjectMatch[1].toLowerCase() : "";
      if (
        subjLower &&
        looksSingularSubject(subjLower) &&
        !SUBJECT_STOP_WORDS.test(subjLower) &&
        !isVerbLikeWord(subjLower)
      ) {
        continue;
      }
      const conj = getVerbConjugation(verb);
      if (!conj || !conj.past) continue;
      pushTenseIssue(issues, seen, {
        type: "tense",
        topic: "past-time-base-" + verb,
        message:
          'Verb tense: with past time (e.g. yesterday), use "' +
          conj.past +
          '", not "' +
          verb +
          '". Example: "The dog ' +
          conj.past +
          ' fast yesterday."',
        word: verb,
        suggestion: conj.past,
        offset: m.index + m[0].lastIndexOf(verb),
      });
    }

    return issues;
  }

  function localTenseAndAgreementIssues(text, targetWord) {
    const issues = [];
    const seen = {};
    const consistency = localTenseConsistencyIssues(text);
    consistency.forEach(function (item) {
      pushTenseIssue(issues, seen, item);
    });
    const hasClauseMix = consistency.some(function (item) {
      return item.topic === "tense-consistency-clauses" || item.topic === "tense-consistency-narrative";
    });

    if (!hasClauseMix) {
      localSubjectVerbIssues(text).forEach(function (item) {
        pushTenseIssue(issues, seen, item);
      });
      localCoordinatedVerbIssues(text).forEach(function (item) {
        pushTenseIssue(issues, seen, item);
      });
    }
    localPluralBeVerbIssues(text).forEach(function (item) {
      pushTenseIssue(issues, seen, item);
    });
    localNumberPluralIssues(text).forEach(function (item) {
      pushTenseIssue(issues, seen, item);
    });
    localThereAreStructureIssues(text).forEach(function (item) {
      pushTenseIssue(issues, seen, item);
    });
    localSingularBeVerbIssues(text).forEach(function (item) {
      pushTenseIssue(issues, seen, item);
    });
    localTargetVerbIssues(text, targetWord).forEach(function (item) {
      pushTenseIssue(issues, seen, item);
    });
    localHeSheItIssues(text).forEach(function (item) {
      pushTenseIssue(issues, seen, item);
    });
    if (!hasClauseMix) {
      localPastTimeVerbIssues(text).forEach(function (item) {
        pushTenseIssue(issues, seen, item);
      });
    }
    return issues;
  }

  function isTenseRule(m) {
    const ruleId = ((m.rule && m.rule.id) || "").toUpperCase();
    const category = ((m.rule && m.rule.category && m.rule.category.id) || "").toUpperCase();
    const msg = (m.message || "").toLowerCase();
    return (
      category.indexOf("TENSE") !== -1 ||
      category.indexOf("AGREEMENT") !== -1 ||
      ruleId.indexOf("TENSE") !== -1 ||
      ruleId.indexOf("AGREEMENT") !== -1 ||
      ruleId.indexOf("VERB_FORM") !== -1 ||
      msg.indexOf("tense") !== -1 ||
      msg.indexOf("past tense") !== -1 ||
      msg.indexOf("present tense") !== -1 ||
      msg.indexOf("verb form") !== -1 ||
      msg.indexOf("subject-verb") !== -1 ||
      msg.indexOf("doesn't agree") !== -1 ||
      msg.indexOf("did + base form") !== -1 ||
      msg.indexOf("was/were") !== -1 ||
      msg.indexOf("usually used with") !== -1 ||
      msg.indexOf("third-person") !== -1 ||
      msg.indexOf("third person") !== -1 ||
      ruleId.indexOf("VERB_AGR") !== -1 ||
      ruleId.indexOf("MD_BASEFORM") !== -1
    );
  }

  function isCapitalizationRule(m) {
    const ruleId = ((m.rule && m.rule.id) || "").toUpperCase();
    const category = ((m.rule && m.rule.category && m.rule.category.id) || "").toUpperCase();
    const msg = (m.message || "").toLowerCase();
    return (
      ruleId.indexOf("UPPERCASE") !== -1 ||
      ruleId.indexOf("CAPITAL") !== -1 ||
      category.indexOf("CASING") !== -1 ||
      msg.indexOf("uppercase") !== -1 ||
      msg.indexOf("capital letter") !== -1
    );
  }

  function isEndingPunctuationRule(m) {
    const ruleId = ((m.rule && m.rule.id) || "").toUpperCase();
    const msg = (m.message || "").toLowerCase();
    return (
      ruleId.indexOf("PUNCTUATION") !== -1 ||
      msg.indexOf("end of sentence") !== -1 ||
      msg.indexOf("end with a period") !== -1 ||
      (msg.indexOf("punctuation") !== -1 && msg.indexOf("end") !== -1)
    );
  }

  /** a apple → an apple; an book → a book (with common vowel-sound exceptions). */
  function wordTakesAn(word) {
    const w = word.toLowerCase();
    if (!/^[a-z]+$/.test(w)) return false;
    if (/^honest|^hour|^heir|^honou?r/.test(w)) return true;
    if (/^uni|^useful|^user|^usual|^union|^unicorn|^unit|^ukule|^ufo|^one|^once/.test(w)) {
      return false;
    }
    if (/^euro/.test(w)) return false;
    return /^[aeiou]/.test(w);
  }

  function localArticleIssues(text) {
    const issues = [];
    const seen = {};
    let m;

    const aRe = /\ba\s+([A-Za-z]+)\b/gi;
    while ((m = aRe.exec(text)) !== null) {
      const noun = m[1];
      if (!wordTakesAn(noun)) continue;

      const topic = "article-a-" + noun.toLowerCase();
      if (seen[topic]) continue;
      seen[topic] = true;

      issues.push({
        type: "grammar",
        topic: topic,
        message:
          'Use "an" before this word: "an ' +
          noun.toLowerCase() +
          '", not "a ' +
          noun.toLowerCase() +
          '". Example: "I ate an apple after school today."',
        word: "a " + noun,
        suggestion: "an " + noun,
        offset: m.index,
      });
    }

    const anRe = /\ban\s+([A-Za-z]+)\b/gi;
    while ((m = anRe.exec(text)) !== null) {
      const noun = m[1];
      if (wordTakesAn(noun)) continue;

      const topic = "article-an-" + noun.toLowerCase();
      if (seen[topic]) continue;
      seen[topic] = true;

      issues.push({
        type: "grammar",
        topic: topic,
        message:
          'Use "a" before this word: "a ' +
          noun.toLowerCase() +
          '", not "an ' +
          noun.toLowerCase() +
          '". Example: "I read a book about animals every night."',
        word: "an " + noun,
        suggestion: "a " + noun,
        offset: m.index,
      });
    }

    return issues;
  }

  /** let/make + object + to + verb → drop "to" (bare infinitive). */
  function localCausativeVerbIssues(text) {
    const issues = [];
    const seen = {};
    const recipientAfterTo =
      /^(me|you|him|her|us|them|it|mine|yours|hers|ours|theirs)$/i;
    const re =
      /\b(let|lets|letting|make|makes|making|made)\b(?:\s+(?!to\b)[A-Za-z]+){1,8}\s+to\s+(?!the|a|an|their|his|her|my|our|your|some|any|this|that|those|these|one|school|home|work|me|you|him|her|us|them|it)\b([A-Za-z]+)\b/gi;
    let m;

    while ((m = re.exec(text)) !== null) {
      const causative = m[1].toLowerCase();
      const matchStart = m.index;
      if (
        (causative === "made" || causative === "making") &&
        matchStart > 0 &&
        text[matchStart - 1] === "-"
      ) {
        continue;
      }
      const baseVerb = m[2];
      if (recipientAfterTo.test(baseVerb)) continue;
      const root = causative.indexOf("let") === 0 ? "let" : "make";
      const topic = "causative-to-" + causative + "-" + baseVerb.toLowerCase();
      if (seen[topic]) continue;
      seen[topic] = true;

      issues.push({
        type: "grammar",
        topic: topic,
        message:
          'After "' +
          root +
          '" use the base verb without "to": not "' +
          root +
          " ... to " +
          baseVerb +
          '". Example: "Climate change will ' +
          root +
          " natural disasters " +
          baseVerb +
          ' more frequent."',
        word: "to " + baseVerb,
        suggestion: baseVerb,
        offset: m.index,
      });
    }

    return issues;
  }

  function basicGrammarIssues(text) {
    const issues = [];
    const t = text.trim();
    if (!t) {
      issues.push({ type: "empty", message: "Write a sentence.", topic: "empty" });
      return issues;
    }
    if (!/^[A-Z]/.test(t)) {
      issues.push({
        type: "grammar",
        message: "Start with a capital letter.",
        topic: "capital",
      });
    }
    if (!/[.!?]"?'?$/.test(t)) {
      issues.push({
        type: "grammar",
        message: "End with . ! or ?",
        topic: "ending",
      });
    }
    if (/\s{2,}/.test(t)) {
      issues.push({
        type: "grammar",
        message: "Remove extra spaces.",
        topic: "spaces",
      });
    }
    return issues;
  }

  function validateStructuralLocal(text, targetWord) {
    const issues = [];
    const wc = countWords(text);
    if (wc < MIN_WORDS) {
      issues.push({
        type: "length",
        message: "Use at least " + MIN_WORDS + " words (you have " + wc + ").",
        topic: "length",
      });
    }
    if (!containsTargetWord(text, targetWord)) {
      issues.push({
        type: "word",
        message: 'Use the word "' + targetWord + '" in your sentence.',
        topic: "word",
      });
    }
    basicGrammarIssues(text).forEach(function (item) {
      issues.push(item);
    });
    return {
      ok: issues.length === 0,
      issues: issues,
      wordCount: wc,
    };
  }

  function validateLocal(text, targetWord) {
    const base = validateStructuralLocal(text, targetWord);
    const issues = base.issues.slice();
    localTenseAndAgreementIssues(text, targetWord).forEach(function (item) {
      issues.push(item);
    });
    localTypoIssues(text).forEach(function (item) {
      issues.push(item);
    });
    localCausativeVerbIssues(text).forEach(function (item) {
      issues.push(item);
    });
    localArticleIssues(text).forEach(function (item) {
      issues.push(item);
    });
    return {
      ok: issues.length === 0,
      issues: issues,
      wordCount: base.wordCount,
    };
  }

  function issueFromMatch(m, text, targetWord) {
    const wrong = text.substring(m.offset, m.offset + m.length);
    let suggestion =
      m.replacements && m.replacements.length > 0 ? m.replacements[0].value : "";
    const isTypo = m.rule && m.rule.issueType === "misspelling";

    if (isTypo) {
      if (wrong.toLowerCase() === targetWord.toLowerCase()) {
        return null;
      }
      const better = BETTER_SPELLING[wrong.toLowerCase()];
      if (better) {
        suggestion = better;
      }
      let msg = 'Typo: you wrote "' + wrong + '"';
      if (suggestion) {
        msg += ' — try "' + suggestion + '" instead';
      } else if (m.shortMessage) {
        msg += " — " + m.shortMessage;
      } else {
        msg += " — check the spelling";
      }
      return {
        type: "typo",
        message: msg,
        word: wrong,
        suggestion: suggestion,
        offset: m.offset,
        topic: "typo:" + wrong.toLowerCase(),
      };
    }

    let topic = "grammar:" + ((m.rule && m.rule.id) || m.offset);
    let type = "grammar";
    if (isCapitalizationRule(m)) {
      topic = "capital";
    } else if (isEndingPunctuationRule(m)) {
      topic = "ending";
    } else if (isTenseRule(m)) {
      type = "tense";
      topic = "tense:" + ((m.rule && m.rule.id) || m.offset);
    }

    let msg = (m.message || "Grammar issue").replace(/\.$/, "");
    if (wrong) {
      msg += ' (near "' + wrong + '")';
    }
    if (suggestion) {
      msg += ' — suggestion: "' + suggestion + '"';
    }

    return {
      type: type,
      message: msg,
      word: wrong,
      suggestion: suggestion,
      offset: m.offset,
      topic: topic,
    };
  }

  function issueKey(item) {
    if (item.topic) {
      return item.topic;
    }
    if (item.offset != null && item.word) {
      return item.type + ":" + item.offset + ":" + item.word.toLowerCase();
    }
    return item.type + ":" + item.message;
  }

  function mergeIssues(localIssues, ltIssues) {
    const out = [];
    const seen = {};

    function add(item) {
      const key = issueKey(item);
      if (seen[key]) return;
      seen[key] = true;
      out.push(item);
    }

    (ltIssues || []).forEach(add);
    localIssues.forEach(function (item) {
      if (item.topic && seen[item.topic]) {
        return;
      }
      add(item);
    });

    out.sort(function (a, b) {
      const order = { word: 0, length: 1, typo: 2, tense: 3, grammar: 4, empty: 5 };
      const typeOrder = function (t) {
        return order[t.type] != null ? order[t.type] : 9;
      };
      const ao = typeOrder(a);
      const bo = typeOrder(b);
      if (ao !== bo) return ao - bo;
      return (a.offset || 0) - (b.offset || 0);
    });
    return out;
  }

  function ltMatchesToIssues(data, text, targetWord) {
    const issues = [];
    (data.matches || []).forEach(function (m) {
      const item = issueFromMatch(m, text, targetWord);
      if (item) issues.push(item);
    });
    return { ok: issues.length === 0, issues: issues, offline: false };
  }

  function checkLanguageToolDirect(text, targetWord) {
    return fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "language=en-US&enabledOnly=false&text=" + encodeURIComponent(text),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("grammar api");
        return res.json();
      })
      .then(function (data) {
        return ltMatchesToIssues(data, text, targetWord);
      });
  }

  function checkKimiProxy(text, targetWord) {
    const headers = { "Content-Type": "application/json" };
    const api = global.EWPApi;
    if (api && typeof api.getToken === "function" && api.getToken()) {
      headers.Authorization = "Bearer " + api.getToken();
    }
    return fetch("/api/v1/sentences/validate", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        text: text,
        targetWord: targetWord,
        minWords: MIN_WORDS,
      }),
      credentials: "include",
    }).then(function (res) {
      if (res.status === 503 || res.status === 429 || res.status === 502) {
        return { ok: null, issues: [], unavailable: true, status: res.status };
      }
      if (!res.ok) throw new Error("kimi proxy");
      return res.json().then(function (data) {
        return {
          ok: data.ok,
          issues: data.issues || [],
          offline: false,
          ai: true,
        };
      });
    });
  }

  function checkLanguageToolProxy(text, targetWord) {
    const headers = { "Content-Type": "application/json" };
    const api = global.EWPApi;
    if (api && typeof api.getToken === "function" && api.getToken()) {
      headers.Authorization = "Bearer " + api.getToken();
    }
    return fetch("/api/v1/grammar/check", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ text: text }),
      credentials: "include",
    })
      .then(function (res) {
        if (!res.ok) throw new Error("grammar proxy");
        return res.json();
      })
      .then(function (data) {
        return ltMatchesToIssues(data, text, targetWord);
      });
  }

  function checkLanguageTool(text, targetWord) {
    let kimiFallback = null;
    return checkKimiProxy(text, targetWord)
      .then(function (kimi) {
        if (!kimi.unavailable && kimi.ok !== null) {
          return kimi;
        }
        if (kimi.unavailable) {
          kimiFallback = kimi;
        }
        return checkLanguageToolProxy(text, targetWord);
      })
      .catch(function () {
        return checkLanguageToolProxy(text, targetWord);
      })
      .catch(function () {
        return checkLanguageToolDirect(text, targetWord);
      })
      .catch(function () {
        return { ok: null, issues: [], offline: true };
      })
      .then(function (result) {
        if (kimiFallback && !result.ai) {
          result.unavailable = true;
          result.status = kimiFallback.status;
        }
        return result;
      });
  }

  function issuesToMessages(issues) {
    return issues.map(function (i) {
      return typeof i === "string" ? i : i.message;
    });
  }

  /** Returns Promise<{ ok, issues, issuesDetail, wordCount, offline?, ai?, fallback? }> */
  function validateSentence(text, targetWord) {
    const structural = validateStructuralLocal(text, targetWord);
    return checkLanguageTool(text, targetWord).then(function (remote) {
      let remoteIssues = [];
      let fallback = null;

      if (remote.offline) {
        remoteIssues = validateLocal(text, targetWord).issues;
      } else if (remote.ai) {
        remoteIssues = remote.issues || [];
      } else {
        remoteIssues = remote.issues || [];
        if (remote.unavailable) {
          fallback =
            remote.status === 429
              ? "Kimi AI quota exceeded — using grammar checker instead."
              : "Kimi AI unavailable — using grammar checker instead.";
        }
      }

      const all = mergeIssues(structural.issues, remoteIssues);
      return {
        ok: all.length === 0,
        issues: issuesToMessages(all),
        issuesDetail: all,
        wordCount: structural.wordCount,
        offline: !!remote.offline,
        ai: !!remote.ai,
        fallback: fallback,
      };
    });
  }

  function checkerStatusMessage(result) {
    if (result.fallback) return result.fallback;
    if (result.ai) return "Checked with Kimi AI.";
    if (result.offline) return "Grammar checked with basic rules only (offline).";
    return "Checked with grammar checker.";
  }

  global.WPSentence = {
    MIN_WORDS: MIN_WORDS,
    countWords: countWords,
    containsTargetWord: containsTargetWord,
    validateSentence: validateSentence,
    checkerStatusMessage: checkerStatusMessage,
  };
})(window);
