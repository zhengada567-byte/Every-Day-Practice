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

export function pluralizeNoun(noun) {
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

export function detectBlankForm(text) {
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

export function prepareBlankItem(sent) {
  const text = sent.text || "";
  const baseAnswer = (sent.answer || "").trim();
  const baseDistractors = (sent.distractors || []).map((d) => String(d).trim());
  const form = detectBlankForm(text);

  let answer = baseAnswer;
  let distractors = baseDistractors.slice();

  if (form === "plural") {
    answer = pluralizeNoun(baseAnswer);
    distractors = baseDistractors.map(pluralizeNoun);
  }

  const choices = [answer].concat(
    distractors.filter((d) => d.toLowerCase() !== answer.toLowerCase())
  );

  const acceptAnswers = [answer.toLowerCase()];

  return {
    text,
    form,
    baseAnswer,
    answer,
    choices,
    acceptAnswers,
  };
}

export function gradeBlankChoice(prepared, choice) {
  const c = String(choice || "").trim().toLowerCase();
  if (prepared.acceptAnswers.includes(c)) return true;
  if (prepared.form === "plural" && c === prepared.baseAnswer.toLowerCase()) {
    return false;
  }
  return false;
}
