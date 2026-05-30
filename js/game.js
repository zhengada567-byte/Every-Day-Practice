(function (global) {
  const EMOJI = {
    affect: "↔️",
    earthworm: "🪱",
    effect: "💥",
    emergent: "🌳",
    ferocious: "🦁",
    grasshopper: "🦗",
    insect: "🐞",
    mammal: "🐻",
    poisonous: "☠️",
    sustain: "♻️",
    trek: "🥾",
    underground: "🕳️",
    understory: "🌿",
    "carbon footprint": "👣",
    "climate change": "🌡️",
    damage: "💔",
    dangerous: "⚠️",
    destructive: "🌪️",
    drought: "🏜️",
    frequent: "🔁",
    "greenhouse gas": "🏭",
    gust: "💨",
    marine: "🐠",
    prone: "📉",
    rescue: "🚁",
    resource: "💧",
    "storm-proof": "🏠",
    survivor: "🛟",
    armoured: "🛡️",
    bellow: "📢",
    confused: "😕",
    cosy: "🛋️",
    creature: "👾",
    excited: "🎉",
    "fawn over": "⭐",
    fierce: "🐺",
    fossil: "🦴",
    frantically: "🏃",
    harmful: "🚫",
    haunted: "👻",
    legend: "📜",
    muster: "💪",
    nervous: "😰",
    relieved: "😌",
    scales: "🐟",
    shriek: "😱",
    slobbery: "🐶",
    spooky: "🌙",
    stunning: "✨",
    suspicious: "🔍",
    tame: "🐕",
    threatening: "⛈️",
    underworld: "🌋",
    vanish: "✨",
    wrecked: "🚢",
    hypothesis: "💡",
    accurate: "📏",
    observation: "🔬",
    temporary: "⏱️",
    theory: "📐",
    volume: "📦",
    elastic: "🔗",
    rubber: "⭕",
    contract: "↔️",
    expand: "↕️",
    evaporate: "💨",
    condense: "💧",
    shattering: "💥",
    decaying: "🍂",
    rusting: "🧱",
    limitation: "🚧",
    excessive: "⚠️",
    "consist of": "🧩",
    component: "⚙️",
    appliance: "🔌",
    insulation: "🧥",
    copper: "🟤",
    kettle: "☕",
    conductivity: "⚡",
    enhance: "⬆️",
    property: "📊",
    composition: "🧪",
    substance: "⚗️",
    dough: "🍞",
    grind: "🫙",
    phenomena: "🌈",
    split: "✂️",
    resistance: "🔋",
    barrel: "🛢️",
    alley: "🏙️",
    coarse: "🪨",
  };

  function emojiFor(word) {
    return EMOJI[word] || "📖";
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function pickRound(words, count) {
    count = count || 6;
    return shuffle(words).slice(0, Math.min(count, words.length));
  }

  /** Pick words for a round: all untested first (shuffled), then tested to fill the slot. */
  function pickRoundPrioritizeUntested(words, count, isTestedFn) {
    count = count || 6;
    const untested = [];
    const tested = [];
    words.forEach(function (w) {
      if (isTestedFn(w)) tested.push(w);
      else untested.push(w);
    });
    const ordered = shuffle(untested).concat(shuffle(tested));
    return ordered.slice(0, Math.min(count, words.length));
  }

  function randomSentence(wordEntry) {
    const s = wordEntry.sentences;
    return s[Math.floor(Math.random() * s.length)];
  }

  global.WPGame = {
    emojiFor: emojiFor,
    shuffle: shuffle,
    pickRound: pickRound,
    pickRoundPrioritizeUntested: pickRoundPrioritizeUntested,
    randomSentence: randomSentence,
  };
})(window);
