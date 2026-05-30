/**
 * Fill-in-the-blank: plural nouns after numbers/quantifiers, verb forms, etc.
 */
(function (global) {
  "use strict";

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

  const SINGULAR_S_NOUNS =
    /^(news|mathematics|physics|politics|economics|class|glass|bus|gas|grass|lens|illness|happiness|stress|darkness|kindness|this|that|unless|across|always|plus|is|us|as|his|its|yes)$/i;

  function pluralizeNoun(noun) {
    const n = String(noun || "").trim().toLowerCase();
    if (!n) return noun;
    if (IRREGULAR_PLURALS[n]) return IRREGULAR_PLURALS[n];
    if (SINGULAR_S_NOUNS.test(n)) return n;
    if (n.endsWith("s")) return n;
    if (n.indexOf(" ") !== -1) {
      const parts = n.split(" ");
      const last = parts[parts.length - 1];
      parts[parts.length - 1] = pluralizeNoun(last);
      return parts.join(" ");
    }
    if (n.endsWith("y") && !/[aeiou]y$/i.test(n)) return n.slice(0, -1) + "ies";
    if (/(?:s|sh|ch|x|z|o)$/i.test(n)) return n + "es";
    return n + "s";
  }

  function isPluralForm(word) {
    const w = String(word || "").trim().toLowerCase();
    if (IRREGULAR_PLURALS[w]) return false;
    for (const base in IRREGULAR_PLURALS) {
      if (IRREGULAR_PLURALS[base] === w) return true;
    }
    if (w.endsWith("s") && w.length > 3 && !/(ss|us|is|as|ness|less|ous)$/i.test(w)) {
      return true;
    }
    return false;
  }

  /** What grammatical form the blank needs from sentence context. */
  function detectBlankForm(text) {
    const idx = text.indexOf("___");
    if (idx < 0) return "singular";
    const before = text.slice(0, idx).toLowerCase();

    if (
      /\b(?:can|could|will|would|may|might|must|shall|should|does|do|did|has|have|had|is|are|was|were|began|begins|begin|started|starts|start|helped|helps|help|hoped|hopes|hope|continued|continues|continue)\s*$/.test(
        before
      ) ||
      /\bto\s*$/.test(before)
    ) {
      return "verb";
    }

    if (
      /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|\d+)\s*$/.test(
        before
      ) ||
      /\b(?:many|several|few|some|both|these|those|other|numerous|various|countless|multiple)\s*$/.test(
        before
      ) ||
      /\b(?:swarm|pair|group|flock|herd|school|pack|bunch|collection)\s+of\s*$/.test(before)
    ) {
      return "plural";
    }

    if (/\b(?:a|an)\s+$/.test(before)) return "singular";
    return "singular";
  }

  function blankHint(form) {
    if (form === "plural") {
      return "Use a plural noun (e.g. after five, many, or a swarm of).";
    }
    if (form === "verb") {
      return "Use the correct verb form for the sentence.";
    }
    return "";
  }

  /** Prepare display choices and accepted answers from stored blank row. */
  function prepareBlankItem(sent) {
    const text = sent.text || "";
    const baseAnswer = (sent.answer || "").trim();
    const baseDistractors = (sent.distractors || []).map(function (d) {
      return String(d).trim();
    });
    const form = detectBlankForm(text);

    let answer = baseAnswer;
    let distractors = baseDistractors.slice();

    if (form === "plural") {
      answer = pluralizeNoun(baseAnswer);
      distractors = baseDistractors.map(pluralizeNoun);
    }

    const choices = [answer].concat(
      distractors.filter(function (d) {
        return d.toLowerCase() !== answer.toLowerCase();
      })
    );

    const acceptAnswers = [answer.toLowerCase()];
    if (form === "singular" && isPluralForm(baseAnswer)) {
      acceptAnswers.push(baseAnswer.toLowerCase());
    }

    return {
      text: text,
      form: form,
      baseAnswer: baseAnswer,
      answer: answer,
      distractors: distractors,
      choices: choices,
      acceptAnswers: acceptAnswers,
      hint: blankHint(form),
    };
  }

  function isBlankChoiceCorrect(prepared, choice) {
    const c = String(choice || "").trim().toLowerCase();
    if (!c) return { ok: false };

    if (prepared.acceptAnswers.indexOf(c) !== -1) {
      return { ok: true };
    }

    if (prepared.form === "plural" && c === prepared.baseAnswer.toLowerCase()) {
      return {
        ok: false,
        hint: 'Use the plural form (e.g. "earthworms" after "five").',
      };
    }

    if (prepared.form === "singular" && c === pluralizeNoun(prepared.baseAnswer).toLowerCase()) {
      return {
        ok: false,
        hint: 'Use the singular form (e.g. "a grasshopper", not "grasshoppers").',
      };
    }

    return { ok: false };
  }

  global.WPBlank = {
    detectBlankForm: detectBlankForm,
    pluralizeNoun: pluralizeNoun,
    prepareBlankItem: prepareBlankItem,
    isBlankChoiceCorrect: isBlankChoiceCorrect,
    blankHint: blankHint,
  };
})(typeof window !== "undefined" ? window : globalThis);
