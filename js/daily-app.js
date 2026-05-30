(function () {
  "use strict";

  const API = window.EWPApi;
  const { shuffle } = window.WPGame;
  const { MIN_WORDS, validateSentence } = window.WPSentence;

  const screen = document.getElementById("screen");
  const playerLabel = document.getElementById("playerLabel");
  const loadStatus = document.getElementById("loadStatus");

  let today = null;
  let childTab = "today";
  let petState = null;

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function setStatus(msg, isError) {
    if (!loadStatus) return;
    loadStatus.textContent = msg || "";
    loadStatus.className = "load-status" + (isError ? " error" : msg ? " ok" : "");
  }

  function updateFooter(user) {
    if (!playerLabel) return;
    if (!user) {
      playerLabel.textContent = "";
      return;
    }
    playerLabel.textContent =
      user.displayName + " · " + (user.role === "parent" ? "Parent" : "Player");
  }

  function btnRow(html) {
    return '<div class="btn-row">' + html + "</div>";
  }

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

  function showSentenceIssues(fb, issues, extra) {
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
      '<ul class="sentence-issue-list">' +
      items.join("") +
      "</ul>";
  }

  function runSentenceCheck(text, targetWord, fb, checkBtn, onSuccess) {
    if (!text) {
      showSentenceIssues(fb, ["Write a sentence first."]);
      return;
    }
    if (checkBtn) {
      checkBtn.disabled = true;
      checkBtn.textContent = "Checking…";
    }
    fb.className = "feedback";
    fb.textContent = "Checking grammar…";

    validateSentence(text, targetWord)
      .then(function (result) {
        if (checkBtn) {
          checkBtn.disabled = false;
          checkBtn.textContent = checkBtn.dataset.label || "Check sentence";
        }
        if (!result.ok) {
          showSentenceIssues(
            fb,
            result.issuesDetail && result.issuesDetail.length
              ? result.issuesDetail
              : result.issues || ["Check your sentence."]
          );
          return;
        }
        fb.className = "feedback ok";
        let okMsg = "Great sentence! (" + result.wordCount + " words)";
        if (result.offline) {
          okMsg += " · Grammar checked with basic rules only (offline).";
        }
        fb.textContent = okMsg;
        if (onSuccess) onSuccess(result);
      })
      .catch(function (err) {
        if (checkBtn) {
          checkBtn.disabled = false;
          checkBtn.textContent = checkBtn.dataset.label || "Check sentence";
        }
        fb.className = "feedback bad";
        fb.textContent = err.message || "Could not check sentence. Try again.";
      });
  }

  function showError(err) {
    alert(err.message || "Something went wrong · 出了点问题");
  }

  /** Bilingual label: 中文 · English */
  function bi(zh, en) {
    return zh + " · " + en;
  }

  function formatTimeLeft(ms) {
    if (!ms || ms <= 0) return "";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) {
      return bi(h + " 小时 " + m + " 分", h + " hr " + m + " min");
    }
    return bi(m + " 分钟", m + " min");
  }

  function coinRewardMessage(res) {
    if (!res || !res.coinsEarned) return "";
    return bi(
      "🪙 获得 " +
        res.coinsEarned +
        " 枚金币！（每个词 " +
        res.coinsPerWord +
        " 枚 × " +
        res.wordCount +
        " 个词）",
      "🪙 You earned " +
        res.coinsEarned +
        " golden coins! (" +
        res.coinsPerWord +
        " per word × " +
        res.wordCount +
        " words)"
    );
  }

  function renderChildTabBar(active) {
    const coins =
      petState && petState.coins != null
        ? '<span class="coin-pill">🪙 ' + petState.coins + "</span>"
        : "";
    return (
      '<nav class="child-tabs" aria-label="Child sections">' +
      '<button type="button" class="child-tab' +
      (active === "today" ? " child-tab--active" : "") +
      '" data-tab="today">' +
      bi("今日练习", "Today") +
      "</button>" +
      '<button type="button" class="child-tab' +
      (active === "pet" ? " child-tab--active" : "") +
      '" data-tab="pet">' +
      bi("宠物小精灵", "Pet") +
      "</button>" +
      coins +
      "</nav>"
    );
  }

  function mountChildTabs() {
    screen.querySelectorAll(".child-tab").forEach(function (btn) {
      btn.onclick = function () {
        const tab = btn.dataset.tab;
        if (tab === "today") showChildToday();
        else if (tab === "pet") showChildPet();
      };
    });
  }

  function setChildScreen(activeTab, bodyHtml) {
    childTab = activeTab;
    screen.innerHTML =
      renderChildTabBar(activeTab) + '<div class="child-panel">' + bodyHtml + "</div>";
    mountChildTabs();
  }

  function refreshPetCoins() {
    return API.getPet()
      .then(function (state) {
        petState = state;
        const pill = screen.querySelector(".coin-pill");
        if (pill) pill.textContent = "🪙 " + state.coins;
        return state;
      })
      .catch(function () {
        return null;
      });
  }

  function handlePhaseComplete(res, onPlan) {
    if (res.pet) petState = res.pet;
    const msg = coinRewardMessage(res);
    if (msg && onPlan) {
      onPlan(res.plan, msg);
      return;
    }
    if (onPlan) onPlan(res.plan, "");
  }

  function showChildPet() {
    setStatus(bi("加载中…", "Loading…"));
    API.getPet()
      .then(function (state) {
        petState = state;
        setStatus("");
        const hungerLabel =
          state.hunger === "full" ? bi("饱足 😊", "Full 😊") : bi("饥饿 😢", "Hungry 😢");
        const moodLabel =
          state.mood === "happy" ? bi("开心 😄", "Happy 😄") : bi("无聊 😐", "Bored 😐");
        const foodPct = Math.min(100, Math.round((state.foodProgress / state.foodNeeded) * 100));
        const hungerHint =
          state.hunger === "full"
            ? bi(
                "吃饱啦！约 " + formatTimeLeft(state.fullRemainingMs) + " 后会再饿",
                "Full! Gets hungry again in about " + formatTimeLeft(state.fullRemainingMs)
              )
            : bi(
                "再喂 " +
                  (state.foodNeeded - state.foodProgress) +
                  " 份食物就能吃饱（每天 10 份）",
                "Feed " +
                  (state.foodNeeded - state.foodProgress) +
                  " more times to be full (10 meals per day)"
              );
        const moodHint =
          state.mood === "happy"
            ? bi(
                "很开心！约 " + formatTimeLeft(state.happyRemainingMs) + " 后会无聊",
                "Happy! Gets bored again in about " + formatTimeLeft(state.happyRemainingMs)
              )
            : bi(
                "用 1 个玩具（3 金币）可以让它开心一整天",
                "1 toy (3 coins) keeps your pet happy for 24 hours"
              );

        const outfit = state.outfit || "";
        const outfitEmoji =
          outfit === "cap"
            ? "🧢"
            : outfit === "scarf"
              ? "🧣"
              : outfit === "bow"
                ? "🎀"
                : "";

        const shopItems = (state.shop || [])
          .map(function (item) {
            if (item.kind === "outfit") {
              return (
                '<button type="button" class="shop-item" data-buy="' +
                escapeHtml(item.key) +
                '">' +
                '<span class="shop-emoji">' +
                item.emoji +
                "</span>" +
                "<span>" +
                escapeHtml(item.label) +
                (item.labelEn ? " · " + escapeHtml(item.labelEn) : "") +
                "</span>" +
                '<span class="shop-price">🪙 ' +
                item.cost +
                "</span></button>"
              );
            }
            return "";
          })
          .join("");

        setChildScreen(
          "pet",
          "<h2>🏠 " + bi("宠物小精灵的家", "Pet home") + "</h2>" +
            '<p class="lead">' +
            bi("用练习赚来的金币照顾你的小伙伴！", "Use coins from practice to care for your pet!") +
            "</p>" +
            '<div class="pet-house">' +
            '<div class="pet-scene" aria-hidden="false">' +
            '<div class="pet-sky"></div>' +
            '<div class="pet-sun" aria-hidden="true"></div>' +
            '<div class="pet-cloud pet-cloud--a" aria-hidden="true"></div>' +
            '<div class="pet-cloud pet-cloud--b" aria-hidden="true"></div>' +
            '<div class="pet-grass" aria-hidden="true"></div>' +
            '<span class="pet-flower pet-flower--1" aria-hidden="true">🌼</span>' +
            '<span class="pet-flower pet-flower--2" aria-hidden="true">🌸</span>' +
            '<span class="pet-flower pet-flower--3" aria-hidden="true">🌷</span>' +
            '<span class="pet-flower pet-flower--4" aria-hidden="true">🌻</span>' +
            '<span class="pet-flower pet-flower--5" aria-hidden="true">🌼</span>' +
            '<span class="pet-flower pet-flower--6" aria-hidden="true">🌸</span>' +
            '<div class="pet-room">' +
            (outfitEmoji ? '<span class="pet-outfit">' + outfitEmoji + "</span>" : "") +
            '<span class="pet-sprite" aria-hidden="true">🐥</span>' +
            '<p class="pet-name">' + bi("小精灵", "Little buddy") + "</p>" +
            "</div></div>" +
            '<div class="pet-status-grid">' +
            '<div class="pet-status-card">' +
            "<h3>" + bi("肚子", "Tummy") + "</h3>" +
            '<p class="pet-status-label ' +
            (state.hunger === "full" ? "ok" : "warn") +
            '">' +
            hungerLabel +
            "</p>" +
            '<div class="pet-meter"><div class="pet-meter-fill" style="width:' +
            foodPct +
            '%"></div></div>' +
            "<p class=\"pet-hint\">" +
            escapeHtml(hungerHint) +
            "</p>" +
            "</div>" +
            '<div class="pet-status-card">' +
            "<h3>" + bi("心情", "Mood") + "</h3>" +
            '<p class="pet-status-label ' +
            (state.mood === "happy" ? "ok" : "warn") +
            '">' +
            moodLabel +
            "</p>" +
            "<p class=\"pet-hint\">" +
            escapeHtml(moodHint) +
            "</p>" +
            "</div>" +
            "</div>" +
            "</div>" +
            '<section class="pet-shop">' +
            "<h3>🛒 " + bi("商店", "Shop") + "</h3>" +
            '<div class="shop-actions">' +
            '<button type="button" class="btn-fun shop-feed" id="petFeed">🍎 ' +
            bi("喂食（1 金币）", "Feed (1 coin)") +
            "</button>" +
            '<button type="button" class="btn-fun shop-play" id="petPlay">🧸 ' +
            bi("玩玩具（3 金币）", "Play toy (3 coins)") +
            "</button>" +
            "</div>" +
            '<p class="shop-note">' +
            bi("衣服会穿在小精灵身上：", "Outfits appear on your pet:") +
            "</p>" +
            '<div class="shop-grid">' +
            shopItems +
            "</div>" +
            "</section>"
        );

        document.getElementById("petFeed").onclick = function () {
          setStatus(bi("喂食中…", "Feeding…"));
          API.feedPet()
            .then(function () {
              setStatus("");
              showChildPet();
            })
            .catch(function (err) {
              setStatus(err.message, true);
            });
        };
        document.getElementById("petPlay").onclick = function () {
          setStatus(bi("玩耍中…", "Playing…"));
          API.playPet()
            .then(function () {
              setStatus("");
              showChildPet();
            })
            .catch(function (err) {
              setStatus(err.message, true);
            });
        };
        screen.querySelectorAll("[data-buy]").forEach(function (btn) {
          btn.onclick = function () {
            setStatus(bi("购买中…", "Buying…"));
            API.buyPetOutfit(btn.dataset.buy)
              .then(function () {
                setStatus("");
                showChildPet();
              })
              .catch(function (err) {
                setStatus(err.message, true);
              });
          };
        });
      })
      .catch(showError);
  }

  function sortAlpha(words) {
    return words.slice().sort(function (a, b) {
      return a.lemma.localeCompare(b.lemma, undefined, { sensitivity: "base" });
    });
  }

  function chunkWords(words, maxSize) {
    maxSize = maxSize || 4;
    if (words.length <= 5) {
      return [words.slice()];
    }
    const chunks = [];
    let i = 0;
    while (i < words.length) {
      chunks.push(words.slice(i, i + Math.min(maxSize, words.length - i)));
      i += maxSize;
    }
    return chunks;
  }

  function randomBlank(word) {
    const blanks = word.blanks || [];
    if (!blanks.length) return null;
    return blanks[Math.floor(Math.random() * blanks.length)];
  }

  function sortedChoices(sent) {
    return [sent.answer].concat(sent.distractors || []).sort(function (a, b) {
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }

  function fieldGroup(id, label, type, attrs) {
    attrs = attrs || {};
    const hint = attrs.hint
      ? '<p class="field-hint">' + escapeHtml(attrs.hint) + "</p>"
      : "";
    const extra =
      (attrs.placeholder ? ' placeholder="' + escapeHtml(attrs.placeholder) + '"' : "") +
      (attrs.autocomplete ? ' autocomplete="' + attrs.autocomplete + '"' : "") +
      (attrs.minlength ? ' minlength="' + attrs.minlength + '"' : "") +
      (attrs.maxlength ? ' maxlength="' + attrs.maxlength + '"' : "") +
      (attrs.required ? " required" : "");
    return (
      '<div class="field-group">' +
      '<label class="field-label" for="' +
      id +
      '">' +
      escapeHtml(label) +
      "</label>" +
      '<input type="' +
      type +
      '" id="' +
      id +
      '" class="field-input"' +
      extra +
      " />" +
      hint +
      "</div>"
    );
  }

  /* —— Auth —— */

  function showAuth(mode) {
    const isLogin = mode === "login";
    screen.innerHTML =
      '<div class="auth-shell">' +
      '<div class="auth-hero">' +
      '<div class="auth-hero-icon" aria-hidden="true">' +
      (isLogin ? "🔐" : "✨") +
      "</div>" +
      "<h2>" +
      (isLogin ? "Welcome back!" : "Create parent account") +
      "</h2>" +
      '<p class="lead">' +
      (isLogin
        ? "Parents and children — sign in with your email."
        : "Sign up once, then add your kids' accounts.") +
      "</p>" +
      "</div>" +
      '<div class="auth-tabs" role="tablist">' +
      '<button type="button" class="auth-tab' +
      (isLogin ? " is-active" : "") +
      '" data-mode="login" role="tab">Log in</button>' +
      '<button type="button" class="auth-tab' +
      (!isLogin ? " is-active" : "") +
      '" data-mode="register" role="tab">Sign up</button>' +
      "</div>" +
      '<form id="authForm" class="auth-form">' +
      (isLogin
        ? ""
        : fieldGroup("nameInput", "Your name", "text", {
            placeholder: "e.g. Sam",
            autocomplete: "name",
            maxlength: 32,
            required: true,
          })) +
      fieldGroup("emailInput", "Email", "email", {
        placeholder: "you@example.com",
        autocomplete: isLogin ? "email" : "email",
        required: true,
      }) +
      fieldGroup("passInput", "Password", "password", {
        placeholder: "At least 8 characters",
        autocomplete: isLogin ? "current-password" : "new-password",
        minlength: 8,
        hint: isLogin ? "" : "Use 8 or more characters.",
        required: true,
      }) +
      '<div class="auth-actions">' +
      '<button type="submit" class="btn-fun">' +
      (isLogin ? "Log in 🚀" : "Create account 🚀") +
      "</button>" +
      "</div>" +
      "</form>" +
      "</div>";

    screen.querySelectorAll(".auth-tab").forEach(function (tab) {
      tab.onclick = function () {
        showAuth(tab.dataset.mode);
      };
    });

    document.getElementById("authForm").onsubmit = function (e) {
      e.preventDefault();
      const email = document.getElementById("emailInput").value.trim();
      const password = document.getElementById("passInput").value;
      setStatus("Signing in…");
      const p = isLogin
        ? API.login(email, password)
        : API.register(
            email,
            password,
            document.getElementById("nameInput").value.trim()
          );
      p.then(function () {
        setStatus("");
        return bootstrap();
      }).catch(function (err) {
        setStatus(err.message, true);
      });
    };
  }

  /* —— Parent —— */

  function showParentHome() {
    setStatus("Loading…");
    API.listChildren()
      .then(function (data) {
        setStatus("");
        const kids = data.children || [];
        let list =
          kids
            .map(function (c) {
              return (
                '<li class="child-list-item">' +
                '<button type="button" class="child-link" data-child-id="' +
                escapeHtml(c.id) +
                '">' +
                "<strong>" +
                escapeHtml(c.displayName) +
                "</strong> · " +
                escapeHtml(c.email) +
                " · View progress</button></li>"
              );
            })
            .join("") || "<li>No children yet — add one below.</li>";

        screen.innerHTML =
          "<h2>👪 Parent home</h2>" +
          '<p class="lead">Add child accounts — each child logs in with their own email to play.</p>' +
          '<ul class="child-list">' +
          list +
          "</ul>" +
          '<div class="form-panel">' +
          '<h3 class="form-panel-title">➕ Add a child</h3>' +
          '<form id="addChildForm" class="auth-form auth-form--flat">' +
          fieldGroup("childName", "Child's name", "text", {
            placeholder: "e.g. Alex",
            required: true,
            maxlength: 32,
          }) +
          fieldGroup("childEmail", "Child's email", "email", {
            placeholder: "alex@example.com",
            autocomplete: "email",
            required: true,
          }) +
          fieldGroup("childPass", "Child's password", "password", {
            placeholder: "At least 8 characters",
            minlength: 8,
            autocomplete: "new-password",
            required: true,
          }) +
          '<div class="auth-actions">' +
          '<button type="submit" class="btn-fun">Add child ✓</button>' +
          "</div>" +
          "</form>" +
          "</div>" +
          btnRow(
            '<button type="button" class="secondary" id="logoutBtn">Log out</button>'
          );

        document.getElementById("addChildForm").onsubmit = function (ev) {
          ev.preventDefault();
          API.createChild(
            document.getElementById("childName").value.trim(),
            document.getElementById("childEmail").value.trim(),
            document.getElementById("childPass").value
          )
            .then(function () {
              showParentHome();
            })
            .catch(showError);
        };
        document.getElementById("logoutBtn").onclick = function () {
          API.logout().then(function () {
            updateFooter(null);
            showAuth("login");
          });
        };
        screen.querySelectorAll(".child-link").forEach(function (btn) {
          btn.onclick = function () {
            showChildDashboard(btn.dataset.childId);
          };
        });
      })
      .catch(showError);
  }

  function showChildDashboard(childId) {
    setStatus("Loading…");
    Promise.all([API.childDashboard(childId), API.childReports(childId, null, 10)])
      .then(function (results) {
        setStatus("");
        const dash = results[0];
        const reports = (results[1].reports || []).slice();
        const todayData = dash.today || {};
        const mastery = dash.mastery || {};

        let todayLine = "Today: " + (todayData.date || "—");
        if (todayData.blockingAssessment) {
          todayLine +=
            " · " + assessmentLabel(todayData.blockingAssessment.type) + " pending";
        } else if (todayData.dailyPlan) {
          todayLine += " · " + phaseLabel(todayData.dailyPlan.phase);
        } else if (todayData.canStartDaily) {
          todayLine += " · ready for new words";
        }

        const reportHtml =
          reports
            .map(function (r) {
              const s = r.summary || {};
              const typeLabel = r.reportType === "monthly" ? "Monthly" : "Weekly";
              return (
                '<li class="report-item">' +
                "<strong>" +
                typeLabel +
                "</strong> · " +
                escapeHtml(r.periodKey || "") +
                " · mastered " +
                (s.masteredCount || 0) +
                " / retry " +
                (s.retryCount || 0) +
                "</li>"
              );
            })
            .join("") || "<li>No quiz reports yet.</li>";

        screen.innerHTML =
          "<h2>👪 Child progress</h2>" +
          '<p class="lead">' +
          todayLine +
          "</p>" +
          '<div class="mastery-stats">' +
          "<p><strong>Mastered:</strong> " +
          (mastery.mastered || 0) +
          " · <strong>In pool:</strong> " +
          (mastery.available || 0) +
          "</p></div>" +
          "<h3>Recent quiz reports</h3>" +
          '<ul class="child-list">' +
          reportHtml +
          "</ul>" +
          btnRow(
            '<button type="button" class="secondary" id="backParent">Back to parent home</button>' +
              '<button type="button" class="secondary" id="logoutBtn">Log out</button>'
          );

        document.getElementById("backParent").onclick = showParentHome;
        document.getElementById("logoutBtn").onclick = function () {
          API.logout().then(function () {
            updateFooter(null);
            showAuth("login");
          });
        };
      })
      .catch(showError);
  }

  /* —— Child calendar —— */

  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function parseYmd(dateStr) {
    const p = (dateStr || "").split("-");
    return { year: Number(p[0]), month: Number(p[1]), day: Number(p[2]) };
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function weekdayMonFirst(dateStr) {
    const d = new Date(dateStr + "T12:00:00+08:00");
    return (d.getDay() + 6) % 7;
  }

  function shiftMonth(year, month, delta) {
    let m = month + delta;
    let y = year;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    return { year: y, month: m };
  }

  function calendarDotHtml(flags) {
    if (!flags || !flags.completed) return "";
    const parts = [];
    if (flags.daily) {
      parts.push('<span class="cal-dot cal-dot--daily" title="' + bi("每日单词", "Daily words") + '"></span>');
    }
    if (flags.weekly) {
      parts.push('<span class="cal-dot cal-dot--weekly" title="' + bi("每周测验", "Weekly quiz") + '"></span>');
    }
    if (flags.monthly) {
      parts.push('<span class="cal-dot cal-dot--monthly" title="' + bi("每月测试", "Monthly test") + '"></span>');
    }
    if (!parts.length) parts.push('<span class="cal-dot cal-dot--done"></span>');
    return '<span class="cal-dots">' + parts.join("") + "</span>";
  }

  function showChildCalendar(year, month) {
    setStatus("Loading calendar…");
    API.childCalendar(year, month)
      .then(function (data) {
        setStatus("");
        const y = data.year;
        const m = data.month;
        const dim = daysInMonth(y, m);
        const first = y + "-" + pad2(m) + "-01";
        const pad = weekdayMonFirst(first);
        const cells = [];
        let d;
        for (let i = 0; i < pad; i++) {
          cells.push('<div class="cal-cell cal-cell--empty"></div>');
        }
        for (d = 1; d <= dim; d++) {
          const key = y + "-" + pad2(m) + "-" + pad2(d);
          const flags = data.days[key];
          const isToday = key === data.today;
          const clickable = flags && flags.completed;
          const cls =
            "cal-cell cal-day" +
            (isToday ? " cal-day--today" : "") +
            (clickable ? " cal-day--done" : "");
          cells.push(
            '<button type="button" class="' +
              cls +
              '" data-date="' +
              escapeHtml(key) +
              '"' +
              (clickable ? "" : " disabled") +
              ">" +
              '<span class="cal-day-num">' +
              d +
              "</span>" +
              calendarDotHtml(flags) +
              "</button>"
          );
        }

        const prev = shiftMonth(y, m, -1);
        const next = shiftMonth(y, m, 1);

        screen.innerHTML =
          "<h2>📅 " + bi("练习日历", "Practice calendar") + "</h2>" +
          '<p class="lead cal-legend">' +
          bi(
            "红点 = 那天完成了练习。点击有标记的日期可以再做一次。",
            "Red dot = you finished something that day. Tap a marked day to practice again."
          ) +
          "</p>" +
          '<div class="cal-nav">' +
          '<button type="button" class="secondary cal-nav-btn" id="calPrev">←</button>' +
          "<strong>" +
          MONTH_NAMES[m - 1] +
          " " +
          y +
          "</strong>" +
          '<button type="button" class="secondary cal-nav-btn" id="calNext">→</button>' +
          "</div>" +
          '<div class="cal-weekdays">' +
          ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            .map(function (w) {
              return '<span class="cal-weekday">' + w + "</span>";
            })
            .join("") +
          "</div>" +
          '<div class="cal-grid">' +
          cells.join("") +
          "</div>" +
          '<p class="cal-legend-hint"><span class="cal-dot cal-dot--daily"></span> ' +
          bi("每日", "daily") +
          ' · <span class="cal-dot cal-dot--weekly"></span> ' +
          bi("测验", "quiz") +
          ' · <span class="cal-dot cal-dot--monthly"></span> ' +
          bi("测试", "test") +
          "</p>" +
          btnRow(
            '<button type="button" class="secondary" id="calBackToday">' +
              bi("返回今天", "Back to today") +
              "</button>"
          );

        document.getElementById("calPrev").onclick = function () {
          showChildCalendar(prev.year, prev.month);
        };
        document.getElementById("calNext").onclick = function () {
          showChildCalendar(next.year, next.month);
        };
        document.getElementById("calBackToday").onclick = showChildToday;
        screen.querySelectorAll(".cal-day--done").forEach(function (btn) {
          btn.onclick = function () {
            showChildCalendarDay(btn.dataset.date);
          };
        });
      })
      .catch(showError);
  }

  function showChildCalendarDay(dateStr) {
    setStatus("Loading…");
    API.childCalendarDay(dateStr)
      .then(function (data) {
        setStatus("");
        const parts = parseYmd(data.date);
        const title =
          MONTH_NAMES[parts.month - 1] + " " + parts.day + ", " + parts.year;
        let list = "";

        if (!data.activities || !data.activities.length) {
          list =
            '<p class="lead">' +
            bi("这一天还没有完成的练习。", "No completed practice on this day.") +
            "</p>";
        } else {
          list =
            '<ul class="cal-activity-list">' +
            data.activities
              .map(function (act) {
                const icon =
                  act.kind === "daily"
                    ? "📖"
                    : act.kind === "monthly"
                      ? "📆"
                      : "📋";
                return (
                  '<li class="cal-activity-item">' +
                  "<span>" +
                  icon +
                  " <strong>" +
                  escapeHtml(act.label) +
                  "</strong></span>" +
                  '<button type="button" class="btn-fun cal-redo-btn" data-kind="' +
                  escapeHtml(act.kind) +
                  '" data-id="' +
                  escapeHtml(act.id) +
                  '">' +
                  bi("再做一次", "Practice again") +
                  "</button>" +
                  "</li>"
                );
              })
              .join("") +
            "</ul>";
        }

        const ym = { year: parts.year, month: parts.month };

        screen.innerHTML =
          "<h2>📅 " +
          escapeHtml(title) +
          "</h2>" +
          list +
          btnRow(
            '<button type="button" class="secondary" id="calBackMonth">' +
              bi("返回日历", "Back to calendar") +
              '</button><button type="button" class="secondary" id="calBackToday2">' +
              bi("返回今天", "Back to today") +
              "</button>"
          );

        document.getElementById("calBackMonth").onclick = function () {
          showChildCalendar(ym.year, ym.month);
        };
        document.getElementById("calBackToday2").onclick = showChildToday;

        screen.querySelectorAll(".cal-redo-btn").forEach(function (btn) {
          btn.onclick = function () {
            const kind = btn.dataset.kind;
            const id = btn.dataset.id;
            btn.disabled = true;
            btn.textContent = "Loading…";
            if (kind === "daily") {
              API.replayDailyPlan(id)
                .then(function (res) {
                  runDailyFlow(res.plan);
                })
                .catch(showError);
            } else {
              API.replayAssessment(id)
                .then(function (res) {
                  runQuizItems(res.assessment);
                })
                .catch(showError);
            }
          };
        });
      })
      .catch(showError);
  }

  /* —— Child today —— */

  function phaseLabel(phase) {
    return (
      {
        learn: "📖 " + bi("学习", "Learn"),
        l1: "🎯 " + bi("第 1 关", "Level 1"),
        l2: "✏️ " + bi("第 2 关", "Level 2"),
        l3: "📝 " + bi("第 3 关", "Level 3"),
        done: "✅ " + bi("完成", "Done"),
      }[phase] || phase
    );
  }

  function assessmentLabel(type) {
    return type === "monthly" ? bi("每月测试", "Monthly test") : bi("每周测验", "Weekly quiz");
  }

  function assessmentButtonLabel(type, action) {
    const name = assessmentLabel(type);
    if (action === "start") return bi("开始", "Start") + " " + name + " 🚀";
    if (action === "continue") return bi("继续", "Continue") + " " + name + " 📋";
    return bi("参加", "Take") + " " + name + " 📋";
  }

  function renderBlockingAssessmentBanner(assessment, context) {
    const label = assessmentLabel(assessment.type);
    let html = "";
    if (context === "sunday") {
      html +=
        '<p class="feedback bad">' +
        bi(
          "你还有 " + label + " 要完成（补做）。",
          "You still have a " + label + " to finish (makeup)."
        ) +
        "</p>";
    } else if (context === "workday") {
      html +=
        '<div class="quiz-banner">' +
        '<p class="feedback bad">' +
        bi(
          "请先完成<strong>" + label + "</strong>，再做今天的新单词。",
          "Finish your <strong>" + label + "</strong> before today's new words."
        ) +
        "</p>" +
        "<p>" +
        assessment.wordCount +
        " " +
        bi("个词", "words") +
        " · " +
        assessment.status +
        "</p></div>";
    } else {
      html +=
        "<p><strong>" +
        assessment.wordCount +
        "</strong> " +
        bi("个词", "words") +
        " · " +
        bi("混合题型", "mixed questions") +
        "</p>";
    }
    html += btnRow(
      '<button type="button" class="btn-fun" id="quizBtn">' +
        assessmentButtonLabel(assessment.type, context === "workday" ? "continue" : "start") +
        "</button>"
    );
    return html;
  }

  function showChildToday() {
    setStatus("Loading today…");
    Promise.all([API.childToday(), API.getPet().catch(function () { return null; })])
      .then(function (results) {
        const data = results[0];
        if (results[1]) petState = results[1];
        today = data;
        setStatus("");
        let body = "";
        if (data.isSunday) {
          body +=
            '<p class="lead">🌴 ' +
            bi("星期日 — 休息日，没有新单词。", "Sunday — rest day for new words.") +
            "</p>";
          if (data.blockingAssessment) {
            body += renderBlockingAssessmentBanner(data.blockingAssessment, "sunday");
          }
        } else if (data.isSaturday) {
          body +=
            '<p class="lead">📋 ' + bi("星期六 — 测验日！", "Saturday — quiz day!") + "</p>";
          if (data.isLastSaturday) {
            body +=
              '<p class="lead-hint">' +
              bi(
                "本月最后一个星期六 — 先做每周测验，再做每月测试。",
                "Last Saturday of the month — weekly quiz first, then monthly test when ready."
              ) +
              "</p>";
          }
          if (data.blockingAssessment) {
            body += renderBlockingAssessmentBanner(data.blockingAssessment, "saturday");
          } else {
            body +=
              '<p class="lead">' +
              bi(
                "还没有测验 — 本周至少完成一个上学日再来。",
                "No quiz yet — complete at least one workday this week first."
              ) +
              "</p>";
          }
        } else if (data.blockingAssessment) {
          body += renderBlockingAssessmentBanner(data.blockingAssessment, "workday");
        } else if (data.dailyPlan) {
          const p = data.dailyPlan;
          body +=
            "<p><strong>" +
            bi("今日计划", "Today's plan") +
            "</strong> · " +
            p.newWordCount +
            " " +
            bi("新词", "new") +
            (p.reviewWordCount ? " + " + p.reviewWordCount + " " + bi("复习", "review") : "") +
            "</p>" +
            "<p>" +
            bi("步骤", "Step") +
            ": <strong>" +
            phaseLabel(p.phase) +
            "</strong> · " +
            p.status +
            "</p>" +
            btnRow(
              '<button type="button" class="btn-fun" id="continueBtn">' +
                bi("继续今日单词", "Continue today's words") +
                "</button>"
            );
        } else if (data.canStartDaily) {
          body +=
            "<p>" +
            bi("准备好学习", "Ready for") +
            " <strong>5 " +
            bi("个新词", "new words") +
            "</strong>" +
            (data.wordCount > 5
              ? "."
              : " " +
                bi("（第一次测验后会有复习词）", "(review words appear after your first quiz)") +
                ".") +
            "</p>" +
            btnRow(
              '<button type="button" class="btn-fun" id="startBtn">' +
                bi("开始今日单词", "Start today's words") +
                " 🚀</button>"
            );
        } else if (!data.isWorkday) {
          body +=
            '<p class="lead">' +
            bi("今天不上学（假期或周末）。", "No school words today (holiday or weekend).") +
            "</p>";
        }

        const coinTip =
          petState && petState.coins != null
            ? '<p class="coin-tip">🪙 ' +
              bi(
                "你有 <strong>" + petState.coins + "</strong> 枚金币 · 完成练习关卡可以赚更多！",
                "You have <strong>" +
                  petState.coins +
                  "</strong> golden coins · Finish practice levels to earn more!"
              ) +
              "</p>"
            : "";

        setChildScreen(
          "today",
          "<h2>📅 Today · " +
            escapeHtml(data.date) +
            " (HK)</h2>" +
            coinTip +
            body +
            btnRow(
              '<button type="button" class="secondary" id="openCalBtn">' +
                bi("练习日历", "Practice calendar") +
                "</button>" +
                '<button type="button" class="secondary" id="logoutBtn">' +
                bi("退出", "Log out") +
                "</button>"
            )
        );

        const startBtn = document.getElementById("startBtn");
        if (startBtn) {
          startBtn.onclick = function () {
            setStatus("Starting…");
            API.startDailyPlan()
              .then(function (res) {
                setStatus("");
                runDailyFlow(res.plan);
              })
              .catch(function (err) {
                setStatus(err.message, true);
              });
          };
        }
        const contBtn = document.getElementById("continueBtn");
        if (contBtn) {
          contBtn.onclick = function () {
            runDailyFlow(data.dailyPlan);
          };
        }
        const quizBtn = document.getElementById("quizBtn");
        if (quizBtn) {
          quizBtn.onclick = function () {
            runAssessment(data.blockingAssessment.id);
          };
        }
        const calBtn = document.getElementById("openCalBtn");
        if (calBtn) {
          calBtn.onclick = function () {
            const p = parseYmd(data.date);
            showChildCalendar(p.year, p.month);
          };
        }
        document.getElementById("logoutBtn").onclick = function () {
          API.logout().then(function () {
            updateFooter(null);
            showAuth("login");
          });
        };
      })
      .catch(showError);
  }

  /* —— Daily flow —— */

  function runDailyFlow(plan) {
    if (!plan || plan.status === "completed" || plan.phase === "done") {
      screen.innerHTML =
        "<h2>🎉 All done for today!</h2>" +
        "<p class=\"lead\">Great job — come back on the next workday.</p>" +
        btnRow('<button type="button" id="backToday">Back</button>');
      document.getElementById("backToday").onclick = showChildToday;
      return;
    }

    if (plan.phase === "learn") {
      runLearn(plan);
    } else if (plan.phase === "l1") {
      runLevel1(plan);
    } else if (plan.phase === "l2") {
      runLevel2(plan);
    } else if (plan.phase === "l3") {
      runLevel3(plan);
    }
  }

  function runLearn(plan) {
    setStatus("Loading words…");
    API.getLearnWords(plan.id)
      .then(function (data) {
        setStatus("");
        const words = data.words || [];
        const cards = words
          .map(function (w) {
            const tag =
              w.wordRole === "review"
                ? '<span class="tag review-tag">Review</span>'
                : '<span class="tag new-tag">New</span>';
            const ex = (w.examples || [])
              .map(function (t) {
                return '<p class="revision-example">' + escapeHtml(t) + "</p>";
              })
              .join("");
            return (
              '<article class="revision-card">' +
              '<div class="revision-picture"><span class="revision-emoji">' +
              (w.pictureEmoji || "📖") +
              '</span></div><div class="revision-body">' +
              tag +
              "<h3>" +
              escapeHtml(w.lemma) +
              "</h3>" +
              '<p class="revision-explanation">' +
              escapeHtml(w.explanation) +
              "</p>" +
              ex +
              "</div></article>"
            );
          })
          .join("");

        screen.innerHTML =
          "<h2>📖 Learn today's words</h2>" +
          '<p class="lead">' +
          plan.newWordCount +
          " new" +
          (plan.reviewWordCount ? " + " + plan.reviewWordCount + " review" : "") +
          " — read each card, then continue.</p>" +
          '<div class="revision-list">' +
          cards +
          "</div>" +
          btnRow(
            '<button type="button" class="btn-fun" id="learnDone">Continue to Level 1 →</button>'
          ) +
          btnRow('<button type="button" class="secondary" id="quitLearn">Back</button>');

        document.getElementById("learnDone").onclick = function () {
          API.completePhase(plan.id, "learn")
            .then(function (res) {
              runDailyFlow(res.plan);
            })
            .catch(showError);
        };
        document.getElementById("quitLearn").onclick = showChildToday;
      })
      .catch(showError);
  }

  function runLevel1(plan) {
    API.getPractice(plan.id, "l1").then(function (data) {
      const words = shuffle(data.words || []);
      runMatching(words, "meaning", function () {
        API.completePhase(plan.id, "l1")
          .then(function (res) {
            handlePhaseComplete(res, function (plan, msg) {
              if (msg) {
                screen.innerHTML =
                  "<h2>🪙 " + bi("Level 1 完成！", "Level 1 complete!") + "</h2>" +
                  '<p class="lead feedback ok">' +
                  escapeHtml(msg) +
                  "</p>" +
                  btnRow(
                    '<button type="button" class="btn-fun" id="l1Next">' +
                      bi("继续", "Continue") +
                      " →</button>"
                  );
                document.getElementById("l1Next").onclick = function () {
                  runDailyFlow(plan);
                };
              } else {
                runDailyFlow(plan);
              }
            });
          })
          .catch(showError);
      }, plan);
    }).catch(showError);
  }

  function runMatching(words, mode, onAllDone, plan) {
    const chunks = chunkWords(words, 4);
    let chunkIndex = 0;

    function nextChunk() {
      if (chunkIndex >= chunks.length) {
        onAllDone();
        return;
      }
      const round = chunks[chunkIndex];
      const rights = round.map(function (w) {
        if (mode === "meaning") {
          return { id: w.lemma, label: w.explanation };
        }
        return { id: w.lemma, label: w.lemma, emoji: w.pictureEmoji || "📖" };
      });
      const shuffledRight = shuffle(rights);
      const matched = new Set();
      let selected = null;

      function render() {
        const batchLine =
          chunks.length > 1
            ? "<p class=\"lead\">Batch " +
              (chunkIndex + 1) +
              " of " +
              chunks.length +
              " · match every word</p>"
            : '<p class="lead">Match every word to its ' +
              (mode === "meaning" ? "meaning" : "picture") +
              "</p>";

        screen.innerHTML =
          "<h2>🎯 Level 1 — " +
          (mode === "meaning" ? "Meanings" : "Pictures") +
          "</h2>" +
          batchLine +
          '<div class="match-columns">' +
          '<div class="match-column"><h3 class="match-col-title">Words</h3><div class="match-list" id="wordCol"></div></div>' +
          '<div class="match-column"><h3 class="match-col-title">' +
          (mode === "meaning" ? "Meanings" : "Pictures") +
          '</h3><div class="match-list" id="rightCol"></div></div></div>' +
          btnRow('<button type="button" class="secondary" id="quitM">Back</button>');

        const wordCol = document.getElementById("wordCol");
        const rightCol = document.getElementById("rightCol");

        round.forEach(function (w) {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "match-card match-word";
          if (matched.has(w.lemma)) {
            el.classList.add("matched");
            el.disabled = true;
          } else if (selected && selected.side === "word" && selected.id === w.lemma) {
            el.classList.add("selected");
          }
          el.textContent = w.lemma + (w.wordRole === "review" ? " ↻" : "");
          if (!matched.has(w.lemma)) {
            el.onclick = function () {
              pick("word", w.lemma);
            };
          }
          wordCol.appendChild(el);
        });

        shuffledRight.forEach(function (r) {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "match-card match-right" + (mode === "picture" ? " picture-card" : "");
          if (matched.has(r.id)) {
            el.classList.add("matched");
            el.disabled = true;
          } else if (selected && selected.side === "right" && selected.id === r.id) {
            el.classList.add("selected");
          }
          if (mode === "picture") {
            el.innerHTML = '<span class="emoji">' + r.emoji + "</span>";
          } else {
            el.textContent = r.label;
          }
          if (!matched.has(r.id)) {
            el.onclick = function () {
              pick("right", r.id);
            };
          }
          rightCol.appendChild(el);
        });

        document.getElementById("quitM").onclick = showChildToday;
      }

      function pick(side, id) {
        if (selected) {
          if (selected.side !== side && selected.id === id) {
            matched.add(id);
            selected = null;
            if (matched.size === round.length) {
              chunkIndex++;
              nextChunk();
              return;
            }
          } else {
            selected = null;
          }
        } else {
          selected = { side: side, id: id };
        }
        render();
      }

      render();
    }

    nextChunk();
  }

  function runLevel2(plan) {
    API.getPractice(plan.id, "l2")
      .then(function (data) {
        const words = shuffle(data.words || []);
        let index = 0;

        function showBlank() {
          if (index >= words.length) {
            API.completePhase(plan.id, "l2")
              .then(function (res) {
                handlePhaseComplete(res, function (plan, msg) {
                  if (msg) {
                    screen.innerHTML =
                      "<h2>🪙 " + bi("Level 2 完成！", "Level 2 complete!") + "</h2>" +
                      '<p class="lead feedback ok">' +
                      escapeHtml(msg) +
                      "</p>" +
                      btnRow(
                        '<button type="button" class="btn-fun" id="l2Next">' +
                          bi("继续", "Continue") +
                          " →</button>"
                      );
                    document.getElementById("l2Next").onclick = function () {
                      runDailyFlow(plan);
                    };
                  } else {
                    runDailyFlow(plan);
                  }
                });
              })
              .catch(showError);
            return;
          }
          const w = words[index];
          const sent = randomBlank(w);
          if (!sent) {
            index++;
            showBlank();
            return;
          }
          const choices = sortedChoices(sent);
          const prompt = sent.text.replace("___", "______");

          screen.innerHTML =
            "<h2>✏️ Level 2 — Fill in the blank</h2>" +
            "<p class=\"lead\">Question " +
            (index + 1) +
            " of " +
            words.length +
            "</p>" +
            '<p class="blank-sentence">' +
            escapeHtml(prompt) +
            "</p>" +
            '<div class="blank-choices" id="choices"></div>' +
            btnRow('<button type="button" class="secondary" id="quitB">Back</button>');

          const box = document.getElementById("choices");
          choices.forEach(function (c) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "blank-choice";
            b.textContent = c;
            b.onclick = function () {
              if (c.toLowerCase() === sent.answer.toLowerCase()) {
                index++;
                showBlank();
              } else {
                b.classList.add("wrong");
                setTimeout(function () {
                  b.classList.remove("wrong");
                }, 400);
              }
            };
            box.appendChild(b);
          });
          document.getElementById("quitB").onclick = showChildToday;
        }

        showBlank();
      })
      .catch(showError);
  }

  function runLevel3(plan) {
    API.getPractice(plan.id, "l3")
      .then(function (data) {
        const words = sortAlpha(data.words || []);
        let index = 0;

        function showSentence() {
          if (index >= words.length) {
            API.completePhase(plan.id, "l3")
              .then(function (res) {
                handlePhaseComplete(res, function (_plan, msg) {
                  screen.innerHTML =
                    "<h2>🎉 All done for today!</h2>" +
                    (msg
                      ? '<p class="lead feedback ok">' + escapeHtml(msg) + "</p>"
                      : '<p class="lead">You finished all steps. See you next workday!</p>') +
                    btnRow('<button type="button" id="doneBtn">Back to today</button>');
                  document.getElementById("doneBtn").onclick = showChildToday;
                });
              })
              .catch(showError);
            return;
          }
          const w = words[index];
          screen.innerHTML =
            "<h2>📝 Level 3 — Build a sentence</h2>" +
            "<p class=\"lead\">New word " +
            (index + 1) +
            " of " +
            words.length +
            ": <strong>" +
            escapeHtml(w.lemma) +
            "</strong></p>" +
            "<p>Use at least " +
            MIN_WORDS +
            " words and include <strong>" +
            escapeHtml(w.lemma) +
            "</strong>.</p>" +
            '<textarea id="sentInput" rows="4" class="sentence-input" placeholder="Type your sentence…" autocomplete="off" spellcheck="false"></textarea>' +
            '<p id="sentFeedback" class="feedback" aria-live="polite"></p>' +
            btnRow(
              '<button type="button" class="btn-fun" id="checkSent" data-label="Check sentence">Check sentence</button>'
            ) +
            btnRow('<button type="button" class="secondary" id="quitS">Back</button>');

          const input = document.getElementById("sentInput");
          const fb = document.getElementById("sentFeedback");
          const checkBtn = document.getElementById("checkSent");
          configureSentenceInput(input);

          checkBtn.onclick = function () {
            runSentenceCheck(input.value.trim(), w.lemma, fb, checkBtn, function () {
              index++;
              setTimeout(showSentence, 600);
            });
          };
          document.getElementById("quitS").onclick = showChildToday;
        }

        showSentence();
      })
      .catch(showError);
  }

  function bootstrap() {
    return API.me()
      .then(function (data) {
        const user = data.user;
        updateFooter(user);
        if (user.role === "parent") showParentHome();
        else showChildToday();
      })
      .catch(function () {
        API.clearSession();
        updateFooter(null);
        showAuth("login");
      });
  }

  function init() {
    const welcome = document.getElementById("welcomeView");
    if (welcome) welcome.remove();
    setStatus("");
    const user = API.getUser();
    if (user && API.getToken()) {
      updateFooter(user);
      bootstrap();
    } else {
      showAuth("login");
    }
  }

  /* —— Weekly quiz —— */

  function itemTypeLabel(t) {
    return (
      {
        match_meaning: "Meaning",
        match_picture: "Picture",
        blank: "Fill in the blank",
        sentence: "Build a sentence",
      }[t] || t
    );
  }

  function runAssessment(assessmentId) {
    setStatus("Loading quiz…");
    API.startAssessment(assessmentId)
      .then(function (data) {
        setStatus("");
        runQuizItems(data.assessment);
      })
      .catch(function () {
        API.getAssessment(assessmentId)
          .then(function (data) {
            setStatus("");
            runQuizItems(data.assessment);
          })
          .catch(showError);
      });
  }

  function runQuizItems(assessment) {
    const items = (assessment.items || [])
      .filter(function (it) {
        return it.itemType !== "sentence";
      })
      .slice();
    let index = 0;
    let correctCount = 0;

    function showItem() {
      const unanswered = items.filter(function (it) {
        return !it.answered;
      });
      if (!unanswered.length) {
        finishQuiz();
        return;
      }
      const item = unanswered[0];
      index = items.indexOf(item);
      const p = item.payload || {};
      const total = items.length;
      const done = items.filter(function (i) {
        return i.answered;
      }).length;

      let inner = "";
      const showWord =
        item.itemType !== "blank" &&
        (item.lemma || p.lemma);
      const quizTitle =
        assessment.type === "monthly" ? "📆 Monthly test" : "📋 Weekly quiz";
      const head =
        "<h2>" +
        quizTitle +
        "</h2>" +
        '<p class="lead">' +
        itemTypeLabel(item.itemType) +
        " · Question " +
        (done + 1) +
        " of " +
        total +
        "</p>" +
        (showWord
          ? '<p class="quiz-word"><strong>' +
            escapeHtml(item.lemma || p.lemma) +
            "</strong></p>"
          : "");

      if (item.itemType === "match_meaning") {
        inner =
          '<p class="lead">' +
          escapeHtml(p.prompt || "Pick the correct meaning") +
          '</p><div class="blank-choices" id="choices"></div>';
      } else if (item.itemType === "match_picture") {
        inner =
          '<p class="lead">' +
          escapeHtml(p.prompt || "Pick the correct picture") +
          '</p><div class="blank-choices quiz-emoji-choices" id="choices"></div>';
      } else if (item.itemType === "blank") {
        inner =
          '<p class="blank-sentence">' +
          escapeHtml((p.text || "").replace("___", "______")) +
          '</p><div class="blank-choices" id="choices"></div>';
      } else if (item.itemType === "sentence") {
        inner =
          "<p>" +
          escapeHtml(p.prompt || "Write a sentence using this word.") +
          "</p>" +
          "<p>Use at least " +
          (p.minWords || 15) +
          " words.</p>" +
          '<textarea id="quizSent" rows="4" class="sentence-input field-input" autocomplete="off" spellcheck="false"></textarea>' +
          '<p id="quizFb" class="feedback" aria-live="polite"></p>' +
          btnRow('<button type="button" class="btn-fun" id="submitSent" data-label="Check sentence">Check sentence</button>');
      }

      screen.innerHTML = head + inner + btnRow('<button type="button" class="secondary" id="quitQuiz">Back</button>');

      document.getElementById("quitQuiz").onclick = showChildToday;

      if (item.itemType === "sentence") {
        const targetLemma = item.lemma || p.lemma || "";
        const sentInput = document.getElementById("quizSent");
        const fb = document.getElementById("quizFb");
        const submitBtn = document.getElementById("submitSent");
        configureSentenceInput(sentInput);

        submitBtn.onclick = function () {
          const text = sentInput.value.trim();
          runSentenceCheck(text, targetLemma, fb, submitBtn, function () {
            API.respondAssessment(assessment.id, item.id, { text: text })
              .then(function (res) {
                items[index].answered = true;
                if (res.correct) correctCount++;
                setTimeout(showItem, 700);
              })
              .catch(showError);
          });
        };
        return;
      }

      const box = document.getElementById("choices");
      (p.choices || []).forEach(function (choice) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "blank-choice" + (item.itemType === "match_picture" ? " emoji-choice" : "");
        if (item.itemType === "match_picture") {
          b.innerHTML = '<span class="emoji">' + choice + "</span>";
        } else {
          b.textContent = choice;
        }
        b.onclick = function () {
          API.respondAssessment(assessment.id, item.id, { answer: choice }).then(function (res) {
            items[index].answered = true;
            if (res.correct) correctCount++;
            b.classList.add(res.correct ? "correct-flash" : "wrong");
            setTimeout(showItem, res.correct ? 350 : 600);
          }).catch(showError);
        };
        box.appendChild(b);
      });
    }

    function finishQuiz() {
      setStatus("Saving results…");
      API.completeAssessment(assessment.id)
        .then(function (res) {
          setStatus("");
          const s = res.summary || {};
          const mastered = (s.mastered || []).map(escapeHtml).join(", ") || "—";
          const retry = (s.retry || []).map(escapeHtml).join(", ") || "—";
          const doneTitle =
            assessment.type === "monthly" ? "Monthly test complete!" : "Quiz complete!";
          screen.innerHTML =
            "<h2>🎉 " +
            doneTitle +
            "</h2>" +
            '<div class="quiz-report">' +
            "<p><strong>Mastered:</strong> " +
            s.masteredCount +
            " words</p>" +
            '<p class="report-list ok-list">' +
            mastered +
            "</p>" +
            "<p><strong>Practice again later:</strong> " +
            s.retryCount +
            " words</p>" +
            '<p class="report-list bad-list">' +
            retry +
            "</p>" +
            "</div>" +
            btnRow('<button type="button" class="btn-fun" id="doneQuiz">Back to today</button>');
          document.getElementById("doneQuiz").onclick = showChildToday;
        })
        .catch(showError);
    }

    showItem();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
