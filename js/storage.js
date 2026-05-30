(function (global) {
  const KEY = "wordpractice";

  const POINTS = {
    match: 10,
    blank: 15,
    sentence: 20,
    newWord: 5,
    streakEvery: 3,
    streakBonus: 5,
    roundMatch: 20,
    roundBlank: 25,
    roundBlankPerfect: 40,
    roundSentence: 30,
  };

  const MILESTONES = [50, 100, 250, 500, 1000, 2000, 5000];
  const PASS_THRESHOLD = 80;

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : { players: {} };
    } catch {
      return { players: {} };
    }
  }

  function saveState(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function getPlayer(state, name) {
    if (!state.players[name]) {
      state.players[name] = { progress: {}, scores: defaultScores() };
    }
    ensureScores(state.players[name]);
    return state.players[name];
  }

  function defaultScores() {
    return {
      total: 0,
      bestStreak: 0,
      currentStreak: 0,
      correctTotal: 0,
      roundsPlayed: 0,
      milestones: [],
      history: [],
    };
  }

  function ensureScores(player) {
    if (!player.scores) player.scores = defaultScores();
    if (!player.scores.history) player.scores.history = [];
    if (!player.scores.milestones) player.scores.milestones = [];
    if (!player.mistakes || typeof player.mistakes !== "object" || Array.isArray(player.mistakes)) {
      player.mistakes = {};
    }
    if (!player.levelPass) player.levelPass = {};
  }

  function ensureModuleLevelPass(player, moduleId) {
    if (!player.levelPass[String(moduleId)]) {
      player.levelPass[String(moduleId)] = {};
    }
    return player.levelPass[String(moduleId)];
  }

  function getLevelRecord(state, playerName, moduleId, key) {
    const p = getPlayer(state, playerName);
    const mod = ensureModuleLevelPass(p, moduleId);
    return mod[key] || null;
  }

  function recordLevelResult(state, playerName, moduleId, key, stats) {
    const p = getPlayer(state, playerName);
    const mod = ensureModuleLevelPass(p, moduleId);
    const prev = mod[key];
    mod[key] = {
      correct: stats.correct,
      wrong: stats.wrong,
      accuracy: stats.accuracy,
      passed: stats.passed || !!(prev && prev.passed),
      words: stats.words,
      at: Date.now(),
    };
    saveState(state);
  }

  /** Main level passed, or failed main but passed mistake review for same activity. */
  function activityPassed(state, playerName, moduleId, activity) {
    const main = getLevelRecord(state, playerName, moduleId, activity);
    if (main && main.passed) return true;
    if (main && !main.passed) {
      const mist = getLevelRecord(state, playerName, moduleId, "mistake_" + activity);
      return !!(mist && mist.passed);
    }
    return false;
  }

  function mistakeKey(moduleId, word) {
    return String(moduleId) + "|" + word;
  }

  function addMistake(state, playerName, moduleId, word, activity) {
    const p = getPlayer(state, playerName);
    const prev = p.mistakes[mistakeKey(moduleId, word)] || {};
    p.mistakes[mistakeKey(moduleId, word)] = {
      moduleId: moduleId,
      word: word,
      activity: activity || prev.activity || "",
      at: Date.now(),
    };
    saveState(state);
  }

  function removeMistake(state, playerName, moduleId, word) {
    const p = getPlayer(state, playerName);
    const key = mistakeKey(moduleId, word);
    if (p.mistakes[key]) {
      delete p.mistakes[key];
      saveState(state);
    }
  }

  function listMistakes(state, playerName) {
    const p = getPlayer(state, playerName);
    return Object.values(p.mistakes || {}).sort(function (a, b) {
      return (b.at || 0) - (a.at || 0);
    });
  }

  function countMistakes(state, playerName) {
    return listMistakes(state, playerName).length;
  }

  function resolveMistakeItems(state, playerName, pack, filter) {
    if (!pack || !pack.modules) return [];
    let list = listMistakes(state, playerName);
    if (filter && filter.moduleId != null) {
      list = list.filter(function (m) {
        return m.moduleId == filter.moduleId;
      });
    }
    if (filter && filter.activity) {
      list = list.filter(function (m) {
        return m.activity === filter.activity || !m.activity;
      });
    }
    const items = [];
    list.forEach(function (m) {
      const mod = pack.modules.find(function (x) {
        return x.id == m.moduleId;
      });
      if (!mod) return;
      const entry = (mod.words || []).find(function (w) {
        return w.word === m.word;
      });
      if (entry) {
        items.push({
          moduleId: m.moduleId,
          moduleName: mod.name,
          activity: m.activity,
          entry: entry,
        });
      }
    });
    return items;
  }

  function rankTitle(total) {
    if (total >= 2000) return "Word Master";
    if (total >= 1000) return "Vocabulary Star";
    if (total >= 500) return "Language Explorer";
    if (total >= 250) return "Rising Reader";
    if (total >= 100) return "Word Builder";
    if (total >= 50) return "Keen Learner";
    return "Beginner";
  }

  function checkMilestones(scores) {
    const messages = [];
    MILESTONES.forEach(function (level) {
      if (scores.total >= level && scores.milestones.indexOf(level) === -1) {
        scores.milestones.push(level);
        messages.push("Milestone: " + level + " points!");
      }
    });
    return messages;
  }

  function recordHistory(scores, entry) {
    scores.history.unshift(entry);
    if (scores.history.length > 10) scores.history.length = 10;
  }

  /** Award points for one correct answer. Resets streak on wrong. */
  function awardCorrect(state, playerName, type, firstTime) {
    const p = getPlayer(state, playerName);
    const sc = p.scores;
    let add = POINTS.match;
    if (type === "blank") add = POINTS.blank;
    else if (type === "sentence") add = POINTS.sentence;
    if (firstTime) add += POINTS.newWord;
    sc.correctTotal += 1;
    sc.currentStreak += 1;
    if (sc.currentStreak > sc.bestStreak) sc.bestStreak = sc.currentStreak;
    if (sc.currentStreak > 0 && sc.currentStreak % POINTS.streakEvery === 0) {
      add += POINTS.streakBonus;
    }
    sc.total += add;
    const milestones = checkMilestones(sc);
    saveState(state);
    return {
      added: add,
      total: sc.total,
      streak: sc.currentStreak,
      milestones: milestones,
      firstTime: firstTime,
    };
  }

  function awardWrong(state, playerName) {
    const p = getPlayer(state, playerName);
    p.scores.currentStreak = 0;
    saveState(state);
  }

  /** Bonus at end of a round. */
  function awardRoundEnd(state, playerName, type, stats) {
    const p = getPlayer(state, playerName);
    const sc = p.scores;
    let bonus = 0;
    if (type === "match") {
      bonus = POINTS.roundMatch;
    } else if (type === "blank") {
      bonus = POINTS.roundBlank;
      if (stats.correct === stats.total && stats.total > 0) {
        bonus = POINTS.roundBlankPerfect;
      }
    } else if (type === "sentence") {
      bonus = POINTS.roundSentence;
      if (stats.correct === stats.total && stats.total > 0) {
        bonus = POINTS.roundBlankPerfect;
      }
    }
    sc.total += bonus;
    sc.roundsPlayed += 1;
    const milestones = checkMilestones(sc);
    recordHistory(sc, {
      when: Date.now(),
      type: type,
      moduleId: stats.moduleId,
      correct: stats.correct,
      total: stats.total,
      roundPoints: stats.roundPoints + bonus,
      bonus: bonus,
    });
    saveState(state);
    return {
      bonus: bonus,
      total: sc.total,
      milestones: milestones,
      rank: rankTitle(sc.total),
    };
  }

  function getScoreSummary(state, playerName) {
    const p = getPlayer(state, playerName);
    const sc = p.scores;
    return {
      total: sc.total,
      bestStreak: sc.bestStreak,
      currentStreak: sc.currentStreak,
      correctTotal: sc.correctTotal,
      roundsPlayed: sc.roundsPlayed,
      rank: rankTitle(sc.total),
      milestones: sc.milestones.slice(),
      history: sc.history.slice(),
    };
  }

  function getWordProgress(state, playerName, moduleId, word) {
    const p = getPlayer(state, playerName);
    if (!p.progress[moduleId]) p.progress[moduleId] = {};
    if (!p.progress[moduleId][word]) p.progress[moduleId][word] = {};
    const w = p.progress[moduleId][word];
    // Migrate older saves (single l1 / l2 flags)
    if (w.l1 && !w.matchMeaning && !w.matchPicture) {
      w.matchMeaning = true;
      w.matchPicture = true;
    }
    if (w.l2 && !w.blank) w.blank = true;
    if (w.l3 && !w.sentence) w.sentence = true;
    return w;
  }

  function isTested(state, playerName, moduleId, word, activity) {
    return !!getWordProgress(state, playerName, moduleId, word)[activity];
  }

  function markTested(state, playerName, moduleId, word, activity) {
    const w = getWordProgress(state, playerName, moduleId, word);
    w[activity] = true;
    if (activity === "matchMeaning" || activity === "matchPicture") {
      w.l1 = true;
    }
    if (activity === "blank") {
      w.l2 = true;
    }
    if (activity === "sentence") {
      w.l3 = true;
    }
    saveState(state);
  }

  /** @deprecated use markTested */
  function markWin(state, playerName, moduleId, word, level) {
    if (level === 1) {
      markTested(state, playerName, moduleId, word, "matchMeaning");
      markTested(state, playerName, moduleId, word, "matchPicture");
    } else if (level === 2) {
      markTested(state, playerName, moduleId, word, "blank");
    }
  }

  function countTested(state, playerName, moduleId, words, activity) {
    let n = 0;
    words.forEach(function (w) {
      if (isTested(state, playerName, moduleId, w.word, activity)) n++;
    });
    return n;
  }

  function allWordsTested(state, playerName, moduleId, words, activity) {
    if (!words || !words.length) return false;
    return countTested(state, playerName, moduleId, words, activity) === words.length;
  }

  /** Level 1 complete if either meanings OR pictures passed (80%+ or via mistake book). */
  function level1Passed(state, playerName, moduleId) {
    return (
      activityPassed(state, playerName, moduleId, "matchMeaning") ||
      activityPassed(state, playerName, moduleId, "matchPicture")
    );
  }

  function levelUnlocked(state, playerName, moduleId, level) {
    if (level === 1) return true;
    if (level === 2) {
      return level1Passed(state, playerName, moduleId);
    }
    if (level === 3) {
      return activityPassed(state, playerName, moduleId, "blank");
    }
    return false;
  }

  function subActivityUnlocked(state, playerName, moduleId, activity) {
    if (activity === "matchMeaning" || activity === "matchPicture") return true;
    if (activity === "blank") {
      return level1Passed(state, playerName, moduleId);
    }
    if (activity === "sentence") {
      return activityPassed(state, playerName, moduleId, "blank");
    }
    return false;
  }

  function resetPlayerProgress(state, playerName) {
    const p = getPlayer(state, playerName);
    p.progress = {};
    p.mistakes = {};
    p.levelPass = {};
    p.scores = defaultScores();
    saveState(state);
  }

  function listPlayerNames(state) {
    return Object.keys(state.players || {}).sort(function (a, b) {
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }

  function buildPlayerReport(state, playerName, pack) {
    if (!state.players[playerName]) return null;
    const sc = getScoreSummary(state, playerName);
    const modules = (pack.modules || []).map(function (m) {
      const words = m.words || [];
      const total = words.length;
      const meaning = countTested(state, playerName, m.id, words, "matchMeaning");
      const picture = countTested(state, playerName, m.id, words, "matchPicture");
      const blank = countTested(state, playerName, m.id, words, "blank");
      return {
        id: m.id,
        name: m.name,
        total: total,
        meaning: meaning,
        picture: picture,
        blank: blank,
        meaningPct: total ? Math.round((meaning / total) * 100) : 0,
        picturePct: total ? Math.round((picture / total) * 100) : 0,
        blankPct: total ? Math.round((blank / total) * 100) : 0,
        allBlanks: total > 0 && blank === total,
      };
    });
    return {
      name: playerName,
      scores: sc,
      modules: modules,
    };
  }

  global.WPStorage = {
    loadState: loadState,
    saveState: saveState,
    getPlayer: getPlayer,
    listPlayerNames: listPlayerNames,
    buildPlayerReport: buildPlayerReport,
    addMistake: addMistake,
    removeMistake: removeMistake,
    listMistakes: listMistakes,
    countMistakes: countMistakes,
    resolveMistakeItems: resolveMistakeItems,
    getWordProgress: getWordProgress,
    isTested: isTested,
    markTested: markTested,
    markWin: markWin,
    countTested: countTested,
    allWordsTested: allWordsTested,
    levelUnlocked: levelUnlocked,
    subActivityUnlocked: subActivityUnlocked,
    level1Passed: level1Passed,
    activityPassed: activityPassed,
    resetPlayerProgress: resetPlayerProgress,
    getLevelRecord: getLevelRecord,
    recordLevelResult: recordLevelResult,
    PASS_THRESHOLD: PASS_THRESHOLD,
    awardCorrect: awardCorrect,
    awardWrong: awardWrong,
    awardRoundEnd: awardRoundEnd,
    getScoreSummary: getScoreSummary,
    rankTitle: rankTitle,
    POINTS: POINTS,
  };
})(window);
