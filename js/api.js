(function (global) {
  "use strict";

  const API_BASE = "/api/v1";
  const TOKEN_KEY = "ewp_token";
  const USER_KEY = "ewp_user";

  let token = localStorage.getItem(TOKEN_KEY) || "";

  function setToken(value) {
    token = value || "";
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function setUser(user) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearSession() {
    setToken("");
    setUser(null);
  }

  async function request(method, path, body, opts) {
    const headers = { "Content-Type": "application/json" };
    if (opts && opts.headers) {
      Object.assign(headers, opts.headers);
    }
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(API_BASE + path, {
      method: method,
      headers: headers,
      body: body != null ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText || "Request failed");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function saveAuthResponse(data) {
    if (data.token) setToken(data.token);
    if (data.user) setUser(data.user);
  }

  const API = {
    getToken: function () {
      return token;
    },
    getUser: getUser,
    clearSession: clearSession,

    register: function (email, password, displayName) {
      return request("POST", "/auth/register", {
        email: email,
        password: password,
        displayName: displayName,
        role: "parent",
      }).then(function (data) {
        saveAuthResponse(data);
        return data;
      });
    },

    login: function (email, password) {
      return request("POST", "/auth/login", { email: email, password: password }).then(
        function (data) {
          saveAuthResponse(data);
          return data;
        }
      );
    },

    childLogin: function (parentAccount, childName, password) {
      return request("POST", "/auth/child-login", {
        parentAccount: parentAccount,
        childName: childName,
        password: password,
      }).then(function (data) {
        saveAuthResponse(data);
        return data;
      });
    },

    changePassword: function (currentPassword, newPassword) {
      return request("POST", "/auth/change-password", {
        currentPassword: currentPassword,
        newPassword: newPassword,
      });
    },

    adminCreateParent: function (accountName, displayName, adminKey) {
      return request(
        "POST",
        "/admin/parents",
        { accountName: accountName, displayName: displayName || accountName },
        { headers: { "X-Admin-Key": adminKey } }
      );
    },

    adminTestSetup: function (adminKey) {
      return request("POST", "/admin/test/setup", {}, { headers: { "X-Admin-Key": adminKey } });
    },

    testStartDaily: function () {
      return request("POST", "/child/test/start-daily");
    },
    testBypassPhase: function (planId) {
      return request("POST", "/child/test/bypass-phase", { planId: planId });
    },
    testFinishDaily: function (planId) {
      return request("POST", "/child/test/finish-daily", { planId: planId || undefined });
    },
    testSeedWeek: function () {
      return request("POST", "/child/test/seed-week");
    },
    testOpenWeekly: function () {
      return request("POST", "/child/test/open-weekly");
    },
    testOpenMonthly: function () {
      return request("POST", "/child/test/open-monthly");
    },
    testBypassAssessment: function (assessmentId) {
      return request("POST", "/child/test/bypass-assessment", {
        assessmentId: assessmentId || undefined,
      });
    },
    testStatus: function () {
      return request("GET", "/child/test/status");
    },

    logout: function () {
      return request("POST", "/auth/logout").finally(clearSession);
    },

    me: function () {
      return request("GET", "/auth/me").then(function (data) {
        if (data.user) setUser(data.user);
        return data;
      });
    },

    listChildren: function () {
      return request("GET", "/parent/children");
    },

    createChild: function (displayName, password) {
      return request("POST", "/parent/children", {
        displayName: displayName,
        password: password,
      });
    },

    childDashboard: function (childId) {
      return request("GET", "/parent/children/" + childId + "/dashboard");
    },

    childReports: function (childId, type, limit) {
      let path = "/parent/children/" + childId + "/reports?limit=" + (limit || 20);
      if (type) path += "&type=" + encodeURIComponent(type);
      return request("GET", path);
    },

    childToday: function () {
      return request("GET", "/child/today");
    },

    childCalendar: function (year, month) {
      return request(
        "GET",
        "/child/calendar?year=" + encodeURIComponent(year) + "&month=" + encodeURIComponent(month)
      );
    },

    childCalendarDay: function (date) {
      return request("GET", "/child/calendar/day?date=" + encodeURIComponent(date));
    },

    replayDailyPlan: function (planId) {
      return request("POST", "/child/daily-plan/" + planId + "/replay");
    },

    replayAssessment: function (assessmentId) {
      return request("POST", "/child/assessments/" + assessmentId + "/replay");
    },

    getPet: function () {
      return request("GET", "/child/pet");
    },

    feedPet: function () {
      return request("POST", "/child/pet/feed");
    },

    playPet: function () {
      return request("POST", "/child/pet/play");
    },

    buyPetOutfit: function (item) {
      return request("POST", "/child/pet/buy", { item: item });
    },

    buyPetBackground: function (background) {
      return request("POST", "/child/pet/background", { background: background });
    },

    startDailyPlan: function () {
      return request("POST", "/child/daily-plan/start");
    },

    getPlan: function (planId) {
      return request("GET", "/child/daily-plan/" + planId);
    },

    getLearnWords: function (planId) {
      return request("GET", "/child/daily-plan/" + planId + "/words");
    },

    getPractice: function (planId, phase) {
      return request("GET", "/child/daily-plan/" + planId + "/practice?phase=" + phase);
    },

    completePhase: function (planId, phase) {
      return request("POST", "/child/daily-plan/" + planId + "/phase/complete", {
        phase: phase,
      });
    },

    getCurrentAssessment: function () {
      return request("GET", "/child/assessments/current");
    },

    getAssessment: function (id) {
      return request("GET", "/child/assessments/" + id);
    },

    startAssessment: function (id) {
      return request("POST", "/child/assessments/" + id + "/start");
    },

    respondAssessment: function (id, itemId, response) {
      return request("POST", "/child/assessments/" + id + "/respond", {
        itemId: itemId,
        response: response,
      });
    },

    completeAssessment: function (id) {
      return request("POST", "/child/assessments/" + id + "/complete");
    },
  };

  global.EWPApi = API;
})(window);
