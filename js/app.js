(function () {
  "use strict";

  const {
    loadState,
    saveState,
    getPlayer,
    markTested,
    isTested,
    countTested,
    levelUnlocked,
    subActivityUnlocked,
    level1Passed,
    activityPassed,
    resetPlayerProgress,
    recordLevelResult,
    PASS_THRESHOLD,
    listPlayerNames,
    buildPlayerReport,
    addMistake,
    removeMistake,
    countMistakes,
    resolveMistakeItems,
    awardCorrect,
    awardWrong,
    awardRoundEnd,
    getScoreSummary,
  } = WPStorage;
  const { emojiFor, shuffle } = WPGame;
  const { MIN_WORDS, validateSentence } = WPSentence;

  const screen = document.getElementById("screen");
  const playerLabel = document.getElementById("playerLabel");
  const welcomeForm = document.getElementById("welcomeForm");
  const nameInput = document.getElementById("nameInput");
  const loadStatus = document.getElementById("loadStatus");

  let pack = null;
  let state = loadState();
  let playerName = sessionStorage.getItem("wp_player") || "";
  let currentModule = null;
  let packReady = false;
  /** @type {{ kind: 'module', module: object } | { kind: 'mistakes', items: object[], activity?: string } | null} */
  let practiceSource = null;

  const ACTIVITY_LABELS = {
    matchMeaning: "Level 1 — Words ↔ meanings",
    matchPicture: "Level 1 — Words ↔ pictures",
    blank: "Level 2 — Fill in the blank",
    sentence: "Level 3 — Build a sentence",
  };

  const MODULE_EMOJI = { 1: "🌿", 2: "🌍", 3: "📖", 4: "🔬" };
  const ADMIN_PIN_KEY = "wp_admin_pin";
  const ADMIN_SESSION_KEY = "wp_admin_ok";
  const DEFAULT_ADMIN_PIN = "1234";

  function isMistakeMode() {
    return !!(practiceSource && practiceSource.kind === "mistakes");
  }

  function practiceWordsList() {
    if (!practiceSource) return [];
    if (practiceSource.kind === "module") return practiceSource.module.words;
    return practiceSource.items.map(function (i) {
      return i.entry;
    });
  }

  function moduleIdForWord(wordStr) {
    if (!practiceSource) return currentModule ? currentModule.id : 0;
    if (practiceSource.kind === "module") return practiceSource.module.id;
    const item = practiceSource.items.find(function (i) {
      return i.entry.word === wordStr;
    });
    return item ? item.moduleId : 0;
  }

  function moduleLabelForWord(wordStr) {
    if (!isMistakeMode()) return "";
    const item = practiceSource.items.find(function (i) {
      return i.entry.word === wordStr;
    });
    if (!item) return "";
    const emoji = MODULE_EMOJI[item.moduleId] || "⭐";
    return emoji + " M" + item.moduleId;
  }

  function sortWordsAlpha(words) {
    return words.slice().sort(function (a, b) {
      return a.word.localeCompare(b.word, undefined, { sensitivity: "base" });
    });
  }

  /** Split into batches of 3–4 words; avoid a lone word at the end (e.g. 4+4+1 → 3+3+3+4). */
  function computeBatchSizes(n, maxSize) {
    maxSize = maxSize || 4;
    if (n <= 0) return [];
    if (n <= maxSize) return [n];

    const sizes = [];
    let left = n;
    while (left > 0) {
      if (left <= maxSize) {
        if (left === 1 && sizes.length > 0) {
          const prev = sizes.pop();
          const total = prev + 1;
          if (total <= maxSize) {
            sizes.push(total);
          } else {
            sizes.push(3, total - 3);
          }
        } else if (left === 2 && sizes.length > 0 && sizes[sizes.length - 1] === 4) {
          sizes.pop();
          sizes.push(3, 3);
        } else {
          sizes.push(left);
        }
        break;
      }
      if (left % maxSize === 1) {
        sizes.push(3);
        left -= 3;
      } else if (left % maxSize === 2 && left >= 6) {
        sizes.push(3);
        left -= 3;
      } else if (left % maxSize === 3 && left >= 7) {
        sizes.push(3);
        left -= 3;
      } else {
        sizes.push(maxSize);
        left -= maxSize;
      }
    }
    return sizes;
  }

  function chunkWords(words, maxSize) {
    const sizes = computeBatchSizes(words.length, maxSize);
    const chunks = [];
    let i = 0;
    sizes.forEach(function (sz) {
      chunks.push(words.slice(i, i + sz));
      i += sz;
    });
    return chunks;
  }

  function sortedChoices(sent) {
    return [sent.answer].concat(sent.distractors).sort(function (a, b) {
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }

  function newSession(activity) {
    return {
      activity: activity,
      correct: 0,
      wrong: 0,
      mistakesAdded: [],
      roundPoints: 0,
      isMistakeReview: isMistakeMode(),
    };
  }

  function sessionAccuracy(session) {
    const n = session.correct + session.wrong;
    return n ? Math.round((100 * session.correct) / n) : 0;
  }

  function trackMistake(session, moduleId, word) {
    if (session.mistakesAdded.indexOf(word) === -1) {
      session.mistakesAdded.push(word);
    }
    addMistake(state, playerName, moduleId, word, session.activity);
  }

  function currentSessionActivity() {
    if (practiceSource && practiceSource.activity) return practiceSource.activity;
    return null;
  }

  function addMistakeForPair(id1, id2, roundWords, session) {
    const ids = new Set([id1, id2]);
    roundWords.forEach(function (w) {
      if (ids.has(w.word)) {
        trackMistake(session, moduleIdForWord(w.word), w.word);
      }
    });
  }

  function clearMistakeIfCorrect(moduleId, word) {
    removeMistake(state, playerName, moduleId, word);
  }

  function practiceLevelBack() {
    if (isMistakeMode()) showMistakeLevelPick();
    else showLevelPick();
  }

  function updatePlayerLabel() {
    if (!playerName) {
      playerLabel.textContent = "";
      return;
    }
    const sc = getScoreSummary(state, playerName);
    playerLabel.textContent =
      "Playing as: " +
      playerName +
      " · ⭐ " +
      sc.total +
      " pts · " +
      sc.rank +
      (sc.currentStreak > 1 ? " · 🔥 " + sc.currentStreak + " streak" : "");
  }

  function scoreCardHtml() {
    if (!playerName) return "";
    const sc = getScoreSummary(state, playerName);
    let milestoneText = "";
    if (sc.milestones.length) {
      milestoneText =
        "<p class=\"score-milestones\">Badges: " +
        sc.milestones.join(" · ") +
        " pts</p>";
    }
    return (
      '<div class="score-panel">' +
      "<h3>⭐ Your points</h3>" +
      '<p class="score-big">' +
      sc.total +
      " <span>points</span></p>" +
      '<p class="score-rank">' +
      escapeHtml(sc.rank) +
      "</p>" +
      "<ul class=\"score-stats\">" +
      "<li>Best streak: <strong>" +
      sc.bestStreak +
      "</strong> in a row</li>" +
      "<li>Correct answers: <strong>" +
      sc.correctTotal +
      "</strong></li>" +
      "<li>Rounds played: <strong>" +
      sc.roundsPlayed +
      "</strong></li>" +
      "</ul>" +
      milestoneText +
      '<p class="score-hint">+10 match · +15 blank · +20 sentence · +5 new word · round bonuses</p>' +
      "</div>"
    );
  }

  function pointsFeedback(award) {
    let msg = "+" + award.added + " points!";
    if (award.firstTime) msg += " (+5 new word)";
    if (award.streak > 0 && award.streak % 3 === 0) {
      msg += " 🔥 " + award.streak + " in a row (+5 bonus)!";
    }
    if (award.milestones && award.milestones.length) {
      msg += " " + award.milestones.join(" ");
    }
    return msg;
  }

  function roundCompleteHtml(roundPoints, endAward, extra) {
    const sc = getScoreSummary(state, playerName);
    let html =
      '<p class="feedback ok">This round: <strong>+' +
      roundPoints +
      "</strong> points (+" +
      endAward.bonus +
      " finish bonus)</p>" +
      '<p class="score-big-inline">Total: ⭐ <strong>' +
      sc.total +
      "</strong> points · " +
      escapeHtml(endAward.rank) +
      "</p>";
    if (endAward.milestones.length) {
      html +=
        '<p class="feedback ok">' + escapeHtml(endAward.milestones.join(" ")) + "</p>";
    }
    if (extra) html += extra;
    return html;
  }

  function setLoadStatus(msg, isError) {
    if (!loadStatus) return;
    loadStatus.textContent = msg;
    loadStatus.className = "load-status" + (isError ? " error" : " ok");
  }

  function bindWelcomeForm() {
    welcomeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!packReady) {
        setLoadStatus("Word list still loading — wait a moment, then try again.", true);
        return;
      }
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      playerName = name;
      sessionStorage.setItem("wp_player", name);
      getPlayer(state, name);
      saveState(state);
      updatePlayerLabel();
      showHome();
    });
  }

  function showSetupHelp(errMsg) {
    packReady = false;
    screen.innerHTML =
      "<h2>Start the local server</h2>" +
      '<div class="setup-box">' +
      "<p>The game needs a local server. Do <strong>not</strong> double-click the HTML file.</p>" +
      "<p><strong>1.</strong> Open PowerShell in:<br><code>d:\\Game\\WordPractice</code></p>" +
      "<p><strong>2.</strong> Run:<br><code>py -m http.server 8080</code></p>" +
      "<p><strong>3.</strong> Open in browser:<br><code>http://localhost:8080</code></p>" +
      (errMsg ? '<p class="feedback bad">Error: ' + escapeHtml(errMsg) + "</p>" : "") +
      "</div>" +
      '<div class="btn-row"><button type="button" id="retryBtn">Try again</button></div>';
    document.getElementById("retryBtn").onclick = function () {
      location.reload();
    };
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function showHome() {
    if (!pack || !pack.modules) return;
    practiceSource = null;
    currentModule = null;
    const modules = pack.modules
      .map(function (m) {
        return (
          '<button type="button" class="module-card" data-id="' +
          m.id +
          '">' +
          "<h3>" +
          (MODULE_EMOJI[m.id] || "⭐") +
          " Module " +
          m.id +
          "</h3>" +
          "<p>" +
          escapeHtml(m.name) +
          "</p>" +
          "<p>" +
          m.words.length +
          " words</p>" +
          "</button>"
        );
      })
      .join("");

    screen.innerHTML =
      scoreCardHtml() +
      "<h2>Choose a module</h2>" +
      '<p class="lead">Pick a colorful module and start earning stars! ⭐</p>' +
      '<div class="module-grid">' +
      modules +
      "</div>" +
      '<div class="btn-row">' +
      '<button type="button" class="secondary" id="changePlayer">Change player</button>' +
      '<button type="button" class="secondary" id="parentView">👪 Parent view</button>' +
      "</div>" +
      '<div class="btn-row">' +
      '<button type="button" class="mistake-book-btn" id="mistakeBook">📕 错题本' +
      (countMistakes(state, playerName) > 0
        ? " (" + countMistakes(state, playerName) + ")"
        : "") +
      "</button></div>" +
      '<div class="btn-row">' +
      '<button type="button" class="secondary reset-progress-btn" id="resetProgress">🔄 Reset progress</button>' +
      "</div>";
    updatePlayerLabel();

    document.getElementById("resetProgress").onclick = function () {
      if (!playerName) return;
      const ok = confirm(
        "Reset ALL progress for \"" +
          playerName +
          "\"?\n\nThis clears points, levels, mistake book, and word marks. You will start from Level 1 again."
      );
      if (!ok) return;
      resetPlayerProgress(state, playerName);
      practiceSource = null;
      currentModule = null;
      updatePlayerLabel();
      alert("Progress reset! Points are 0 and levels are back to the start.");
      showHome();
    };

    document.getElementById("parentView").onclick = showAdminGate;
    document.getElementById("mistakeBook").onclick = function () {
      if (!packReady || !pack) {
        alert("Word list still loading — wait a moment.");
        return;
      }
      if (!playerName) {
        alert("Enter your name on the welcome screen first.");
        return;
      }
      practiceSource = null;
      currentModule = null;
      showMistakeBook();
    };
    screen.querySelectorAll(".module-card").forEach(function (btn) {
      btn.onclick = function () {
        currentModule = pack.modules.find(function (m) {
          return m.id === Number(btn.dataset.id);
        });
        practiceSource = { kind: "module", module: currentModule };
        showLevelPick();
      };
    });

    document.getElementById("changePlayer").onclick = function () {
      sessionStorage.removeItem("wp_player");
      playerName = "";
      updatePlayerLabel();
      location.reload();
    };
  }

  function coverageLine(activity, label) {
    const total = currentModule.words.length;
    const done = countTested(state, playerName, currentModule.id, currentModule.words, activity);
    return label + ": " + done + " / " + total + " tested";
  }

  function showMistakeBook() {
    if (!pack) {
      alert("Word list not loaded yet.");
      return;
    }
    if (!playerName) {
      alert("Enter your name first.");
      return;
    }
    const items = resolveMistakeItems(state, playerName, pack);
    let listHtml = "";
    if (!items.length) {
      listHtml =
        '<p class="lead">还没有错题。答错时，单词会自动放进错题本。</p>' +
        '<p class="lead">No mistakes yet — wrong answers are saved here automatically.</p>';
    } else {
      listHtml =
        '<p class="lead">共 <strong>' +
        items.length +
        "</strong> 个词 · A–Z order · need " +
        PASS_THRESHOLD +
        "%+ in mistake practice to unlock the next level if you did not pass.</p>" +
        '<ul class="mistake-list">';
      items.forEach(function (item) {
        const emoji = MODULE_EMOJI[item.moduleId] || "⭐";
        listHtml +=
          "<li><span class=\"mistake-mod\">" +
          emoji +
          " M" +
          item.moduleId +
          "</span> <strong>" +
          escapeHtml(item.entry.word) +
          "</strong></li>";
      });
      listHtml += "</ul>";
    }

    screen.innerHTML =
      "<h2>📕 错题本 · Mistake book</h2>" +
      listHtml +
      (items.length
        ? '<div class="btn-row"><button type="button" id="startMistakePractice">开始练习 · Practice</button></div>'
        : "") +
      '<div class="btn-row"><button type="button" class="secondary" id="backHomeMistake">返回 · Back</button></div>';

    const startBtn = document.getElementById("startMistakePractice");
    if (startBtn) {
      startBtn.onclick = function () {
        practiceSource = { kind: "mistakes", items: items };
        showMistakeLevelPick();
      };
    }
    document.getElementById("backHomeMistake").onclick = showHome;
  }

  function showMistakeLevelPick() {
    const items =
      practiceSource && practiceSource.items
        ? practiceSource.items
        : resolveMistakeItems(state, playerName, pack);
    if (!items.length) {
      practiceSource = null;
      showMistakeBook();
      return;
    }
    practiceSource = { kind: "mistakes", items: items };

    function countFor(act) {
      return resolveMistakeItems(state, playerName, pack, {
        activity: act,
        moduleId: currentModule ? currentModule.id : undefined,
      }).length;
    }

    screen.innerHTML =
      "<h2>📕 错题练习 · Mistake practice</h2>" +
      '<p class="lead">Pick the level you need — words in A–Z order · need <strong>' +
      PASS_THRESHOLD +
      "%+</strong> accuracy · summary at the end.</p>" +
      '<div class="level-grid">' +
      '<button type="button" class="level-card" id="mistakeDef">' +
      "<h3>📝 Meanings</h3><p>" +
      countFor("matchMeaning") +
      " word(s)</p></button>" +
      '<button type="button" class="level-card" id="mistakePic">' +
      "<h3>🖼️ Pictures</h3><p>" +
      countFor("matchPicture") +
      " word(s)</p></button>" +
      '<button type="button" class="level-card" id="mistakeBlank">' +
      "<h3>✏️ Fill in the blank</h3><p>" +
      countFor("blank") +
      " word(s)</p></button>" +
      '<button type="button" class="level-card" id="mistakeSentence">' +
      "<h3>✍️ Build a sentence</h3><p>" +
      countFor("sentence") +
      " word(s)</p></button>" +
      "</div>" +
      '<div class="btn-row">' +
      '<button type="button" class="secondary" id="backMistakeList">错题列表 · Word list</button>' +
      '<button type="button" class="secondary" id="backHomeFromMistake">返回首页 · Home</button>' +
      "</div>";

    document.getElementById("mistakeDef").onclick = function () {
      startMistakeActivity("matchMeaning");
    };
    document.getElementById("mistakePic").onclick = function () {
      startMistakeActivity("matchPicture");
    };
    document.getElementById("mistakeBlank").onclick = function () {
      startMistakeActivity("blank");
    };
    document.getElementById("mistakeSentence").onclick = function () {
      startMistakeActivity("sentence");
    };
    document.getElementById("backMistakeList").onclick = showMistakeBook;
    document.getElementById("backHomeFromMistake").onclick = showHome;
  }

  function moduleCoverageHtml() {
    const mid = currentModule.id;
    const sc = getScoreSummary(state, playerName);
    return (
      "<p class=\"score-line\">" +
      coverageLine("matchMeaning", "Meanings") +
      " · " +
      coverageLine("matchPicture", "Pictures") +
      " · " +
      coverageLine("blank", "Blanks") +
      " · " +
      coverageLine("sentence", "Sentences") +
      "</p>" +
      '<p class="score-line">⭐ ' +
      sc.total +
      " points · 🔥 best streak " +
      sc.bestStreak +
      "</p>"
    );
  }

  function moduleTabBarHtml(activeTab) {
    const practiceActive = activeTab === "practice";
    return (
      '<nav class="module-tabs" aria-label="Module sections">' +
      '<button type="button" class="module-tab' +
      (practiceActive ? " active" : "") +
      '" data-tab="practice">🎮 Practice</button>' +
      '<button type="button" class="module-tab' +
      (!practiceActive ? " active" : "") +
      '" data-tab="revision">📖 Revision</button>' +
      "</nav>"
    );
  }

  function wordProgressBadges(moduleId, word) {
    const m = isTested(state, playerName, moduleId, word, "matchMeaning");
    const p = isTested(state, playerName, moduleId, word, "matchPicture");
    const b = isTested(state, playerName, moduleId, word, "blank");
    const s = isTested(state, playerName, moduleId, word, "sentence");
    return (
      '<span class="rev-badge' +
      (m ? " done" : "") +
      '">📝</span>' +
      '<span class="rev-badge' +
      (p ? " done" : "") +
      '">🖼️</span>' +
      '<span class="rev-badge' +
      (b ? " done" : "") +
      '">✏️</span>' +
      '<span class="rev-badge' +
      (s ? " done" : "") +
      '">✍️</span>'
    );
  }

  function revisionExamplesHtml(wordEntry) {
    const examples = wordEntry.examples || [];
    if (!examples.length) return "";
    return (
      '<div class="revision-sentences">' +
      "<h4>Sample sentence</h4>" +
      '<p class="revision-example">' +
      escapeHtml(examples[0]) +
      "</p></div>"
    );
  }

  function buildRevisionListHtml() {
    const mid = currentModule.id;
    const words = currentModule.words.slice().sort(function (a, b) {
      return a.word.localeCompare(b.word, undefined, { sensitivity: "base" });
    });
    return words
      .map(function (w) {
        return (
          '<article class="revision-card">' +
          '<div class="revision-picture" aria-hidden="true">' +
          '<span class="revision-emoji">' +
          emojiFor(w.word) +
          "</span>" +
          '<span class="revision-pic-label">Picture</span>' +
          "</div>" +
          '<div class="revision-body">' +
          "<h3>" +
          escapeHtml(w.word) +
          "</h3>" +
          '<p class="revision-explanation">' +
          escapeHtml(w.explanation) +
          "</p>" +
          revisionExamplesHtml(w) +
          '<p class="revision-meta">Practiced: ' +
          wordProgressBadges(mid, w.word) +
          " <span class=\"rev-hint\">📝 · 🖼️ · ✏️ · ✍️</span></p>" +
          "</div></article>"
        );
      })
      .join("");
  }

  function completeLevelSession(session, meta) {
    const accuracy = sessionAccuracy(session);
    const passed = accuracy >= PASS_THRESHOLD;
    const moduleId = meta.moduleId;
    const recordKey = session.isMistakeReview
      ? "mistake_" + session.activity
      : session.activity;

    if (moduleId) {
      recordLevelResult(state, playerName, moduleId, recordKey, {
        correct: session.correct,
        wrong: session.wrong,
        accuracy: accuracy,
        passed: passed,
        words: meta.wordCount,
      });
    }

    let endAward = { bonus: 0, milestones: [], rank: getScoreSummary(state, playerName).rank };
    if (session.roundPoints > 0 && moduleId) {
      endAward = awardRoundEnd(
        state,
        playerName,
        session.activity === "blank"
          ? "blank"
          : session.activity === "sentence"
            ? "sentence"
            : "match",
        {
          moduleId: moduleId,
          correct: session.correct,
          total: meta.wordCount,
          roundPoints: session.roundPoints,
        }
      );
    }
    updatePlayerLabel();
    showLevelSummary(session, meta, passed, accuracy, endAward);
  }

  function showLevelSummary(session, meta, passed, accuracy, endAward) {
    const total = session.correct + session.wrong;
    const title = ACTIVITY_LABELS[session.activity] || session.activity;
    const moduleId = meta.moduleId;

    let resultMsg = "";
    if (passed) {
      resultMsg =
        '<p class="feedback ok">✅ Passed! Accuracy ' +
        accuracy +
        "% (need " +
        PASS_THRESHOLD +
        "%+)</p>";
      if (!session.isMistakeReview && meta.nextUnlock) {
        resultMsg += '<p class="feedback ok">' + escapeHtml(meta.nextUnlock) + "</p>";
      }
    } else if (!session.isMistakeReview) {
      resultMsg =
        '<p class="feedback bad">📋 Accuracy ' +
        accuracy +
        "% — below " +
        PASS_THRESHOLD +
        "%.</p>" +
        '<p class="feedback bad">Finish <strong>mistake book</strong> practice for this level at ' +
        PASS_THRESHOLD +
        "%+ accuracy to unlock the next level.</p>";
    } else {
      resultMsg =
        '<p class="feedback bad">📋 Mistake book accuracy ' +
        accuracy +
        "% — need " +
        PASS_THRESHOLD +
        "%+ to unlock the next level.</p>";
    }

    let mistakesHtml = "";
    if (session.mistakesAdded.length) {
      mistakesHtml =
        "<h3>Added to mistake book 📕</h3><ul class=\"summary-mistake-list\">" +
        session.mistakesAdded
          .map(function (w) {
            return "<li>" + escapeHtml(w) + "</li>";
          })
          .join("") +
        "</ul>";
    } else {
      mistakesHtml = '<p class="score-line">No new words added to mistake book.</p>';
    }

    let pointsHtml = "";
    if (session.roundPoints > 0 && endAward.bonus) {
      pointsHtml = roundCompleteHtml(session.roundPoints, endAward, "");
    }

    let btnHtml =
      '<div class="btn-row"><button type="button" id="summaryMenu">Back to menu</button>';
    if (!passed) {
      btnHtml += '<button type="button" id="summaryRetry">Try again</button>';
      if (!session.isMistakeReview && moduleId) {
        btnHtml += '<button type="button" id="summaryMistake">📕 Mistake book</button>';
      }
    }
    btnHtml += "</div>";

    screen.innerHTML =
      "<h2>📊 Level summary</h2>" +
      '<h3 class="summary-sub">' +
      escapeHtml(title) +
      (session.isMistakeReview ? " · 错题本" : "") +
      "</h3>" +
      '<div class="summary-panel">' +
      '<ul class="summary-stats">' +
      "<li>Words in level: <strong>" +
      meta.wordCount +
      "</strong></li>" +
      "<li>Total attempts: <strong>" +
      total +
      "</strong></li>" +
      "<li>Correct: <strong>" +
      session.correct +
      "</strong></li>" +
      "<li>Wrong: <strong>" +
      session.wrong +
      "</strong></li>" +
      "<li>Accuracy: <strong>" +
      accuracy +
      "%</strong> (need " +
      PASS_THRESHOLD +
      "%+)</li>" +
      "</ul>" +
      resultMsg +
      mistakesHtml +
      pointsHtml +
      "</div>" +
      btnHtml;

    document.getElementById("summaryMenu").onclick = practiceLevelBack;
    document.getElementById("summaryRetry").onclick = function () {
      if (session.activity === "blank") startLevel2();
      else if (session.activity === "sentence") startLevel3();
      else if (session.activity === "matchPicture") runMatching("picture");
      else runMatching("definition");
    };
    const mb = document.getElementById("summaryMistake");
    if (mb) {
      mb.onclick = function () {
        if (!moduleId) {
          practiceSource = null;
          showMistakeBook();
          return;
        }
        openMistakeReview(moduleId, session.activity);
      };
    }
  }

  function startMistakeActivity(activity) {
    if (!pack) {
      alert("Word list not loaded yet.");
      return;
    }
    const filter = { activity: activity };
    if (currentModule) filter.moduleId = currentModule.id;
    const items = resolveMistakeItems(state, playerName, pack, filter);
    if (!items.length) {
      alert(
        "No words in mistake book for this level yet. Answer some questions wrong first, or pick another level."
      );
      showMistakeLevelPick();
      return;
    }
    practiceSource = { kind: "mistakes", items: items, activity: activity };
    if (activity === "blank") startLevel2();
    else if (activity === "sentence") startLevel3();
    else if (activity === "matchPicture") runMatching("picture");
    else runMatching("definition");
  }

  function sessionModuleIdFromWords(wordList) {
    if (!isMistakeMode() && currentModule) return currentModule.id;
    const ids = new Set();
    wordList.forEach(function (w) {
      const id = moduleIdForWord(w.word);
      if (id) ids.add(id);
    });
    if (ids.size === 1) return Array.from(ids)[0];
    return null;
  }

  function openMistakeReview(moduleId, activity) {
    if (!pack) {
      alert("Word list not loaded yet.");
      return;
    }
    currentModule =
      pack.modules.find(function (m) {
        return m.id == moduleId;
      }) || null;
    practiceSource = null;
    if (!currentModule) {
      showMistakeBook();
      return;
    }
    startMistakeActivity(activity);
  }

  function bindModuleTabs(activeTab) {
    screen.querySelectorAll(".module-tab").forEach(function (btn) {
      btn.onclick = function () {
        const tab = btn.dataset.tab;
        if (tab !== activeTab) showLevelPick(tab);
      };
    });
  }

  function showLevelPick(activeTab) {
    activeTab = activeTab || "practice";
    const mid = currentModule.id;
    const modEmoji = MODULE_EMOJI[mid] || "⭐";

    let mainHtml = "";
    if (activeTab === "practice") {
      const l2 = levelUnlocked(state, playerName, mid, 2);
      const l3 = levelUnlocked(state, playerName, mid, 3);
      const l1m = activityPassed(state, playerName, mid, "matchMeaning");
      const l1p = activityPassed(state, playerName, mid, "matchPicture");
      const l1done = level1Passed(state, playerName, mid);
      const l2p = activityPassed(state, playerName, mid, "blank");
      const l3p = activityPassed(state, playerName, mid, "sentence");
      const l3Open = levelUnlocked(state, playerName, mid, 3);
      mainHtml =
        '<p class="lead">Words go in <strong>A–Z order</strong>. Finish the whole level; need <strong>' +
        PASS_THRESHOLD +
        "%+</strong> accuracy to unlock the next. Level 1: pass <strong>meanings OR pictures</strong> (either one). Below " +
        PASS_THRESHOLD +
        "%? Use the mistake book for that level.</p>" +
        '<div class="level-grid">' +
        '<button type="button" class="level-card" data-level="1">' +
        "<h3>🎯 Level 1 — Matching</h3>" +
        "<p>Meanings" +
        (l1m ? " ✅" : "") +
        " · Pictures" +
        (l1p ? " ✅" : "") +
        (l1done ? " · Level 1 passed ✅" : "") +
        "</p></button>" +
        '<button type="button" class="level-card' +
        (l2 ? "" : " locked") +
        '" data-level="2"' +
        (l2 ? "" : " disabled") +
        ">" +
        "<h3>✏️ Level 2 — Fill in the blank</h3>" +
        "<p>All words A–Z" +
        (l2p ? " ✅" : "") +
        "</p>" +
        (l2 ? "" : "<p>🔒 Pass Level 1 (meanings OR pictures) at " + PASS_THRESHOLD + "%+</p>") +
        "</button>" +
        '<button type="button" class="level-card' +
        (l3Open ? "" : " locked") +
        '" data-level="3"' +
        (l3Open ? "" : " disabled") +
        ">" +
        "<h3>✍️ Level 3 — Build a sentence</h3>" +
        "<p>Type " +
        MIN_WORDS +
        "+ words yourself · typo + grammar check" +
        (l3p ? " ✅" : "") +
        "</p>" +
        (l3Open ? "" : "<p>🔒 Pass Level 2 at " + PASS_THRESHOLD + "%+</p>") +
        "</button>" +
        "</div>";
    } else {
      const total = currentModule.words.length;
      mainHtml =
        '<p class="lead">Browse all <strong>' +
        total +
        "</strong> words — meanings, pictures, and one short sample sentence each (not the fill-in-the-blank exercises).</p>" +
        '<div class="revision-list">' +
        buildRevisionListHtml() +
        "</div>";
    }

    screen.innerHTML =
      "<h2>" +
      modEmoji +
      " " +
      escapeHtml(currentModule.name) +
      "</h2>" +
      moduleCoverageHtml() +
      moduleTabBarHtml(activeTab) +
      mainHtml +
      '<div class="btn-row"><button type="button" class="secondary" id="backModules">Back</button></div>';

    bindModuleTabs(activeTab);

    if (activeTab === "practice") {
      screen.querySelectorAll(".level-card[data-level]").forEach(function (btn) {
        if (btn.disabled) return;
        btn.onclick = function () {
          const level = Number(btn.dataset.level);
          if (level === 1) startLevel1Menu();
          else if (level === 2) startLevel2();
          else if (level === 3) startLevel3();
        };
      });
    }

    document.getElementById("backModules").onclick = showHome;
  }

  function startLevel1Menu() {
    if (!practiceWordsList().length) {
      screen.innerHTML =
        "<h2>📕 错题本</h2>" +
        '<p class="lead">No words to practice.</p>' +
        '<div class="btn-row"><button type="button" id="l1emptyBack">Back</button></div>';
      document.getElementById("l1emptyBack").onclick = practiceLevelBack;
      return;
    }
    screen.innerHTML =
      "<h2>" +
      (isMistakeMode() ? "📕 " : "") +
      "🎯 Level 1 — Matching</h2>" +
      '<p class="lead">All words in A–Z order · pass <strong>either</strong> game at ' +
      PASS_THRESHOLD +
      "%+ to unlock Level 2 · summary at the end</p>" +
      '<div class="level-grid">' +
      '<button type="button" class="level-card" id="matchDef">' +
      "<h3>📝 Words ↔ meanings</h3><p>Every word, alphabetical</p></button>" +
      '<button type="button" class="level-card" id="matchPic">' +
      "<h3>🖼️ Words ↔ pictures</h3><p>Every word, alphabetical</p></button>" +
      "</div>" +
      '<div class="btn-row"><button type="button" class="secondary" id="backLv">Back</button></div>';
    document.getElementById("matchDef").onclick = function () {
      runMatching("definition");
    };
    document.getElementById("matchPic").onclick = function () {
      runMatching("picture");
    };
    document.getElementById("backLv").onclick = practiceLevelBack;
  }

  function matchingActivity(mode) {
    return mode === "definition" ? "matchMeaning" : "matchPicture";
  }

  function runMatching(mode) {
    const activity = matchingActivity(mode);
    const allWords = sortWordsAlpha(practiceWordsList());
    if (!allWords.length) {
      screen.innerHTML =
        "<h2>📕 错题本</h2>" +
        '<p class="lead">No words to practice here.</p>' +
        '<div class="btn-row"><button type="button" id="noWordsBack">Back</button></div>';
      document.getElementById("noWordsBack").onclick = practiceLevelBack;
      return;
    }

    const session = newSession(activity);
    const chunks = chunkWords(allWords, 4);
    const moduleId = sessionModuleIdFromWords(allWords);
    let chunkIndex = 0;
    let wordsDone = 0;

    function nextUnlockMessage() {
      if (activity === "matchMeaning" || activity === "matchPicture") {
        return "Level 2 fill-in-the-blank unlocked!";
      }
      return "Great work!";
    }

    function runChunk() {
      if (chunkIndex >= chunks.length) {
        completeLevelSession(session, {
          moduleId: moduleId,
          wordCount: allWords.length,
          nextUnlock: nextUnlockMessage(),
        });
        return;
      }

      const roundWords = chunks[chunkIndex];
      const rightItems = roundWords.map(function (w) {
        if (mode === "definition") {
          return { pairId: w.word, label: w.explanation, kind: "definition" };
        }
        return {
          pairId: w.word,
          label: w.word,
          emoji: emojiFor(w.word),
          kind: "picture",
        };
      });
      const shuffledRight = shuffle(rightItems);

      const matchedPairs = new Set();
      let selected = null;
      let lock = false;
      let lastPointsMsg = "";
      const rightHeading = mode === "definition" ? "Meanings" : "Pictures";
      const batchNum = chunkIndex + 1;

      function render() {
        const done = matchedPairs.size;
        const total = roundWords.length;
        const titlePrefix = isMistakeMode() ? "📕 Mistake book — " : "";

        screen.innerHTML =
          "<h2>" +
          titlePrefix +
          "Level 1 — " +
          (mode === "definition" ? "Words & meanings" : "Words & pictures") +
          "</h2>" +
          '<p class="lead">A–Z order · batch ' +
          batchNum +
          " of " +
          chunks.length +
          "</p>" +
          '<p class="score-line">This batch: ' +
          done +
          "/" +
          total +
          " · Overall " +
          (wordsDone + done) +
          "/" +
          allWords.length +
          " words · ✅ " +
          session.correct +
          " · ❌ " +
          session.wrong +
          (lastPointsMsg
            ? ' · <span class="points-flash">' + escapeHtml(lastPointsMsg) + "</span>"
            : "") +
          '</p><div class="progress-bar"><span style="width:' +
          ((wordsDone + done) / allWords.length) * 100 +
          '%"></span></div>' +
          '<div class="match-columns">' +
          '<div class="match-column"><h3 class="match-col-title">Words (A→Z)</h3><div class="match-list" id="wordCol"></div></div>' +
          '<div class="match-column"><h3 class="match-col-title">' +
          rightHeading +
          '</h3><div class="match-list" id="rightCol"></div></div>' +
          "</div>" +
          '<div class="btn-row"><button type="button" class="secondary" id="quitMatch">Quit</button></div>';

        const wordCol = document.getElementById("wordCol");
        const rightCol = document.getElementById("rightCol");

        roundWords.forEach(function (w) {
          const el = document.createElement("button");
          el.type = "button";
          const matched = matchedPairs.has(w.word);
          el.className = "match-card match-word";
          if (matched) {
            el.classList.add("matched");
            el.disabled = true;
          } else if (selected && selected.side === "word" && selected.pairId === w.word) {
            el.classList.add("selected");
          }
          const modTag = moduleLabelForWord(w.word);
          el.textContent = modTag ? w.word + " (" + modTag + ")" : w.word;
          if (!matched) {
            el.onclick = function () {
              onPick("word", w.word);
            };
          }
          wordCol.appendChild(el);
        });

        shuffledRight.forEach(function (item) {
          const el = document.createElement("button");
          el.type = "button";
          const matched = matchedPairs.has(item.pairId);
          el.className = "match-card match-right";
          if (item.kind === "picture") el.classList.add("picture-card");
          if (matched) {
            el.classList.add("matched");
            el.disabled = true;
          } else if (selected && selected.side === "right" && selected.pairId === item.pairId) {
            el.classList.add("selected");
          }
          if (item.kind === "picture") {
            el.innerHTML =
              '<span class="emoji">' +
              item.emoji +
              '</span><span class="pic-label">Picture</span>';
          } else {
            el.textContent = item.label;
          }
          if (!matched) {
            el.onclick = function () {
              onPick("right", item.pairId);
            };
          }
          rightCol.appendChild(el);
        });

        document.getElementById("quitMatch").onclick = practiceLevelBack;
      }

      function onPick(side, pairId) {
        if (lock || matchedPairs.has(pairId)) return;

        if (!selected) {
          selected = { side: side, pairId: pairId };
          render();
          return;
        }

        if (selected.side === side) {
          if (selected.pairId === pairId) {
            selected = null;
          } else {
            selected = { side: side, pairId: pairId };
          }
          render();
          return;
        }

        if (selected.pairId === pairId) {
          session.correct++;
          matchedPairs.add(pairId);
          const mid = moduleIdForWord(pairId);
          const firstTime = !isTested(state, playerName, mid, pairId, activity);
          markTested(state, playerName, mid, pairId, activity);
          clearMistakeIfCorrect(mid, pairId);
          const award = awardCorrect(state, playerName, "match", firstTime);
          session.roundPoints += award.added;
          lastPointsMsg = pointsFeedback(award);
          updatePlayerLabel();
          selected = null;

          if (matchedPairs.size === roundWords.length) {
            wordsDone += roundWords.length;
            chunkIndex++;
            runChunk();
            return;
          }
          render();
        } else {
          session.wrong++;
          addMistakeForPair(selected.pairId, pairId, roundWords, session);
          awardWrong(state, playerName);
          lastPointsMsg = "Try again · added to 错题本";
          updatePlayerLabel();
          lock = true;
          selected = null;
          render();
          setTimeout(function () {
            lock = false;
            lastPointsMsg = "";
            render();
          }, 600);
        }
      }

      render();
    }

    runChunk();
  }

  function startLevel2() {
    const activity = "blank";
    if (
      !isMistakeMode() &&
      currentModule &&
      !subActivityUnlocked(state, playerName, currentModule.id, activity)
    ) {
      alert(
        "Pass Level 1 (meanings OR pictures) at " +
          PASS_THRESHOLD +
          "%+ first (or via mistake book)."
      );
      showLevelPick();
      return;
    }
    const words = sortWordsAlpha(practiceWordsList());
    if (!words.length) {
      screen.innerHTML =
        "<h2>📕 错题本</h2>" +
        '<p class="lead">No words to practice here.</p>' +
        '<div class="btn-row"><button type="button" id="emptyBack">Back</button></div>';
      document.getElementById("emptyBack").onclick = practiceLevelBack;
      return;
    }

    const session = newSession(activity);
    const moduleId = sessionModuleIdFromWords(words);
    let index = 0;

    function showQuestion() {
      if (index >= words.length) {
        completeLevelSession(session, {
          moduleId: moduleId,
          wordCount: words.length,
          nextUnlock: "Level 3 — Build a sentence unlocked!",
        });
        return;
      }

      const w = words[index];
      const sent = w.sentences[0];
      const choices = sortedChoices(sent);
      const display = sent.text.replace("___", "______");
      const fullAnswer = sent.text.replace("___", sent.answer);
      const modTag = moduleLabelForWord(w.word);

      screen.innerHTML =
        "<h2>" +
        (isMistakeMode() ? "📕 " : "") +
        "✏️ Level 2 — Fill in the blank</h2>" +
        (modTag ? '<p class="score-line">Module: ' + modTag + "</p>" : "") +
        '<p class="score-line">Word ' +
        (index + 1) +
        " of " +
        words.length +
        " (A→Z) · <strong>" +
        escapeHtml(w.word) +
        "</strong> · ✅ " +
        session.correct +
        " · ❌ " +
        session.wrong +
        "</p>" +
        '<div class="progress-bar"><span style="width:' +
        (index / words.length) * 100 +
        '%"></span></div><div class="sentence-box">' +
        escapeHtml(display) +
        '</div><div class="choices" id="choices"></div><div id="fb"></div>' +
        '<div class="btn-row btn-row-next" id="nextRow" hidden>' +
        '<button type="button" id="btnNext" class="btn-next">Next ➡️</button>' +
        "</div>" +
        '<div class="btn-row"><button type="button" class="secondary" id="quit2">Quit</button></div>';

      const fb = document.getElementById("fb");
      const ch = document.getElementById("choices");
      const nextRow = document.getElementById("nextRow");
      const btnNext = document.getElementById("btnNext");
      let answered = false;

      btnNext.onclick = function () {
        index++;
        showQuestion();
      };

      choices.forEach(function (c) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice-btn";
        btn.textContent = c;
        btn.onclick = function () {
          if (answered) return;
          answered = true;
          const ok = c === sent.answer;
          ch.querySelectorAll("button").forEach(function (b) {
            b.disabled = true;
          });

          if (ok) {
            session.correct++;
            const mid = moduleIdForWord(w.word);
            const firstTime = !isTested(state, playerName, mid, w.word, activity);
            markTested(state, playerName, mid, w.word, activity);
            clearMistakeIfCorrect(mid, w.word);
            const award = awardCorrect(state, playerName, "blank", firstTime);
            session.roundPoints += award.added;
            updatePlayerLabel();
            btn.classList.add("correct");
            fb.className = "feedback ok";
            fb.textContent = pointsFeedback(award) + " " + fullAnswer;
          } else {
            session.wrong++;
            trackMistake(session, moduleIdForWord(w.word), w.word);
            awardWrong(state, playerName);
            updatePlayerLabel();
            btn.classList.add("wrong");
            fb.className = "feedback bad";
            fb.innerHTML =
              "<strong>Not quite!</strong> · 已加入错题本<br><br>" +
              "<strong>Word:</strong> " +
              escapeHtml(w.word) +
              "<br><br>" +
              "<strong>Meaning:</strong> " +
              escapeHtml(w.explanation);
          }

          nextRow.hidden = false;
          btnNext.focus();
        };
        ch.appendChild(btn);
      });
      document.getElementById("quit2").onclick = practiceLevelBack;
    }

    showQuestion();
  }

  /** Turn off browser autofill / autocorrect on Level 3 — player types every letter. */
  function configureSentenceInput(el) {
    if (!el) return;
    el.setAttribute("autocomplete", "off");
    el.setAttribute("autocorrect", "off");
    el.setAttribute("autocapitalize", "off");
    el.setAttribute("spellcheck", "false");
    el.setAttribute("data-lpignore", "true");
    el.setAttribute("data-1p-ignore", "true");
    el.setAttribute("readonly", "readonly");
    el.addEventListener(
      "focus",
      function once() {
        el.removeAttribute("readonly");
        el.removeEventListener("focus", once);
      },
      { once: true }
    );
  }

  function startLevel3() {
    const activity = "sentence";
    if (
      !isMistakeMode() &&
      currentModule &&
      !subActivityUnlocked(state, playerName, currentModule.id, activity)
    ) {
      alert(
        "Pass Level 2 (fill-in-the-blank) at " +
          PASS_THRESHOLD +
          "%+ first (or via mistake book)."
      );
      showLevelPick();
      return;
    }
    const words = sortWordsAlpha(practiceWordsList());
    if (!words.length) {
      screen.innerHTML =
        "<h2>📕 错题本</h2>" +
        '<p class="lead">No words to practice here.</p>' +
        '<div class="btn-row"><button type="button" id="emptyBack">Back</button></div>';
      document.getElementById("emptyBack").onclick = practiceLevelBack;
      return;
    }

    const session = newSession(activity);
    const moduleId = sessionModuleIdFromWords(words);
    let index = 0;

    function showPrompt() {
      if (index >= words.length) {
        completeLevelSession(session, {
          moduleId: moduleId,
          wordCount: words.length,
          nextUnlock: "You finished all words in this module! 🎉",
        });
        return;
      }

      const w = words[index];
      const modTag = moduleLabelForWord(w.word);
      const example =
        w.examples && w.examples[0]
          ? w.examples[0]
          : "";

      screen.innerHTML =
        "<h2>" +
        (isMistakeMode() ? "📕 " : "") +
        "✍️ Level 3 — Build a sentence</h2>" +
        (modTag ? '<p class="score-line">Module: ' + modTag + "</p>" : "") +
        '<p class="score-line">Word ' +
        (index + 1) +
        " of " +
        words.length +
        " (A→Z) · ✅ " +
        session.correct +
        " · ❌ " +
        session.wrong +
        "</p>" +
        '<div class="progress-bar"><span style="width:' +
        (index / words.length) * 100 +
        '%"></span></div>' +
        '<div class="sentence-prompt-card">' +
        "<h3>Use this word:</h3>" +
        '<p class="sentence-target-word">' +
        escapeHtml(w.word) +
        "</p>" +
        '<p class="sentence-meaning">' +
        escapeHtml(w.explanation) +
        "</p>" +
        (example
          ? '<p class="sentence-example-hint"><em>Example style: ' +
            escapeHtml(example) +
            "</em></p>"
          : "") +
        '<p class="sentence-rules">Write <strong>' +
        MIN_WORDS +
        "+ words</strong>. Include <strong>" +
        escapeHtml(w.word) +
        '</strong>. Type <strong>every letter yourself</strong> — no autocomplete.</p>' +
        '<p class="sentence-type-hint">Spellcheck and autofill are off. We check typos and grammar when you tap Check.</p>' +
        '<form class="sentence-form" autocomplete="off" spellcheck="false" onsubmit="return false">' +
        '<label class="sr-only" for="sentenceInput">Your sentence</label>' +
        '<textarea id="sentenceInput" class="sentence-input" name="wp-sentence-' +
        index +
        '" rows="4" placeholder="Type every word yourself…" ' +
        'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" ' +
        'data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" ' +
        'data-ms-editor="false" inputmode="text"></textarea>' +
        "</form>" +
        '<div id="sentenceFb"></div>' +
        '<div class="btn-row">' +
        '<button type="button" id="checkSentence">Check sentence ✓</button>' +
        '<button type="button" class="secondary" id="quit3">Quit</button>' +
        "</div></div>";

      const input = document.getElementById("sentenceInput");
      const fb = document.getElementById("sentenceFb");
      const checkBtn = document.getElementById("checkSentence");
      let checking = false;

      configureSentenceInput(input);

      function showIssues(issues, extra) {
        fb.className = "feedback bad";
        const items = issues.map(function (item) {
          if (typeof item === "string") {
            return "<li>" + escapeHtml(item) + "</li>";
          }
          const tag =
            item.type === "typo"
              ? '<span class="issue-tag typo-tag">Typo</span> '
              : item.type === "tense"
                ? '<span class="issue-tag tense-tag">Tense</span> '
                : item.type === "word"
                  ? '<span class="issue-tag word-tag">Word</span> '
                  : item.type === "length"
                    ? '<span class="issue-tag length-tag">Length</span> '
                    : '<span class="issue-tag grammar-tag">Grammar</span> ';
          return "<li>" + tag + escapeHtml(item.message) + "</li>";
        });
        const count = issues.length;
        fb.innerHTML =
          "<strong>Not quite — " +
          count +
          " issue" +
          (count === 1 ? "" : "s") +
          " found:</strong>" +
          (extra ? "<p>" + escapeHtml(extra) + "</p>" : "") +
          "<ul class=\"sentence-issue-list\">" +
          items.join("") +
          "</ul>";
      }

      checkBtn.onclick = function () {
        if (checking) return;
        const text = input.value.trim();
        if (!text) {
          showIssues(["Write a sentence first."]);
          return;
        }
        checking = true;
        checkBtn.disabled = true;
        checkBtn.textContent = "Checking…";
        fb.className = "feedback";
        fb.textContent = "Checking grammar…";

        validateSentence(text, w.word).then(function (result) {
          checking = false;
          checkBtn.disabled = false;
          checkBtn.textContent = "Check sentence ✓";

          if (!result.ok) {
            session.wrong++;
            trackMistake(session, moduleIdForWord(w.word), w.word);
            awardWrong(state, playerName);
            updatePlayerLabel();
            showIssues(
              result.issuesDetail && result.issuesDetail.length
                ? result.issuesDetail
                : result.issues
            );
            return;
          }

          session.correct++;
          const mid = moduleIdForWord(w.word);
          const firstTime = !isTested(state, playerName, mid, w.word, activity);
          markTested(state, playerName, mid, w.word, activity);
          clearMistakeIfCorrect(mid, w.word);
          const award = awardCorrect(state, playerName, "sentence", firstTime);
          session.roundPoints += award.added;
          updatePlayerLabel();

          fb.className = "feedback ok";
          let okMsg =
            pointsFeedback(award) +
            " Great sentence! (" +
            result.wordCount +
            " words)";
          if (result.offline) {
            okMsg += " · Grammar checked with basic rules (offline).";
          }
          fb.textContent = okMsg;

          setTimeout(function () {
            index++;
            showPrompt();
          }, 1200);
        });
      };

      document.getElementById("quit3").onclick = practiceLevelBack;
      input.focus();
    }

    showPrompt();
  }

  function getAdminPin() {
    return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_ADMIN_PIN;
  }

  function isAdminSession() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
  }

  function showAdminGate() {
    if (isAdminSession()) {
      showAdminDashboard();
      return;
    }
    screen.innerHTML =
      "<h2>👪 Parent view</h2>" +
      '<p class="lead">Enter parent PIN to see player progress on this device.</p>' +
      '<form id="pinForm" class="welcome-form">' +
      '<label class="sr-only" for="pinInput">Parent PIN</label>' +
      '<input type="password" id="pinInput" inputmode="numeric" maxlength="8" placeholder="PIN" autocomplete="off" />' +
      '<div class="btn-row">' +
      '<button type="submit" class="btn-fun">View progress</button>' +
      '<button type="button" class="secondary" id="pinBack">Back</button>' +
      "</div></form>" +
      '<p class="score-hint">Default PIN is 1234 (change below after login).</p>';

    document.getElementById("pinForm").onsubmit = function (e) {
      e.preventDefault();
      const pin = document.getElementById("pinInput").value;
      if (pin === getAdminPin()) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
        showAdminDashboard();
      } else {
        alert("Wrong PIN. Try again.");
      }
    };
    document.getElementById("pinBack").onclick = showHome;
  }

  function showAdminDashboard() {
    const names = listPlayerNames(state);
    let body = "";
    if (!names.length) {
      body = '<p class="lead">No players yet. Ask your kids to enter a name and play.</p>';
    } else {
      body = names
        .map(function (name) {
          const report = buildPlayerReport(state, name, pack);
          if (!report) return "";
          const modRows = report.modules
            .map(function (m) {
              const emoji = MODULE_EMOJI[m.id] || "⭐";
              return (
                "<tr>" +
                "<td>" +
                emoji +
                " M" +
                m.id +
                "</td>" +
                "<td>" +
                m.meaning +
                "/" +
                m.total +
                " <span class=\"pct\">(" +
                m.meaningPct +
                "%)</span></td>" +
                "<td>" +
                m.picture +
                "/" +
                m.total +
                " <span class=\"pct\">(" +
                m.picturePct +
                "%)</span></td>" +
                "<td>" +
                m.blank +
                "/" +
                m.total +
                " <span class=\"pct\">(" +
                m.blankPct +
                "%)</span></td>" +
                "<td>" +
                (m.allBlanks ? "✅" : "—") +
                "</td>" +
                "</tr>"
              );
            })
            .join("");
          return (
            '<div class="admin-player-card">' +
            "<h3>" +
            escapeHtml(report.name) +
            "</h3>" +
            '<p class="admin-score-line">⭐ ' +
            report.scores.total +
            " pts · " +
            escapeHtml(report.scores.rank) +
            " · Best streak " +
            report.scores.bestStreak +
            " · " +
            report.scores.correctTotal +
            " correct · " +
            report.scores.roundsPlayed +
            " rounds</p>" +
            '<table class="admin-table"><thead><tr>' +
            "<th>Module</th><th>Meanings</th><th>Pictures</th><th>Blanks</th><th>All blanks?</th>" +
            "</tr></thead><tbody>" +
            modRows +
            "</tbody></table></div>"
          );
        })
        .join("");
    }

    screen.innerHTML =
      "<h2>👪 Parent dashboard</h2>" +
      '<p class="lead">Progress saved on <strong>this browser only</strong> (no cloud).</p>' +
      body +
      '<div class="admin-pin-change">' +
      "<h3>Change PIN</h3>" +
      '<form id="changePinForm" class="welcome-form">' +
      '<input type="password" id="newPin" maxlength="8" placeholder="New PIN" />' +
      '<button type="submit" class="secondary">Save new PIN</button>' +
      "</form></div>" +
      '<div class="btn-row">' +
      '<button type="button" class="secondary" id="adminLogout">Lock parent view</button>' +
      '<button type="button" id="adminHome">Back to game</button>' +
      "</div>";

    document.getElementById("changePinForm").onsubmit = function (e) {
      e.preventDefault();
      const np = document.getElementById("newPin").value.trim();
      if (np.length < 4) {
        alert("PIN must be at least 4 characters.");
        return;
      }
      localStorage.setItem(ADMIN_PIN_KEY, np);
      document.getElementById("newPin").value = "";
      alert("PIN updated.");
    };
    document.getElementById("adminLogout").onclick = function () {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      showHome();
    };
    document.getElementById("adminHome").onclick = showHome;
  }

  function init() {
    bindWelcomeForm();
    nameInput.focus();

    fetch("data/wordpack.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Could not load word list (" + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        pack = data;
        packReady = true;
        setLoadStatus("Ready! Type your name and press Start.");
        if (playerName) {
          updatePlayerLabel();
          showHome();
        }
      })
      .catch(function (err) {
        setLoadStatus("Could not load words. Use http://localhost:8080 (see README).", true);
        console.error(err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
