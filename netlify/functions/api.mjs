import "../lib/load-env.mjs";

import { requireAuth, requireRole } from "../lib/auth.mjs";

import * as assessmentHandlers from "../lib/handlers/assessment.mjs";
import * as adminHandlers from "../lib/handlers/admin.mjs";
import * as authHandlers from "../lib/handlers/auth.mjs";

import * as calendarHandlers from "../lib/handlers/calendar.mjs";
import * as childHandlers from "../lib/handlers/child.mjs";

import * as dailyHandlers from "../lib/handlers/daily.mjs";

import * as grammarHandlers from "../lib/handlers/grammar.mjs";
import * as healthHandlers from "../lib/handlers/health.mjs";

import * as parentHandlers from "../lib/handlers/parent.mjs";
import * as petHandlers from "../lib/handlers/pet.mjs";

import {

  corsHeaders,

  errorResponse,

  noContent,

  parseBody,

  routePath,

} from "../lib/http.mjs";



export async function handler(event) {

  if (event.httpMethod === "OPTIONS") {

    return noContent(corsHeaders(event));

  }



  const path = routePath(event);

  const method = event.httpMethod;



  try {

    if (method === "GET" && path === "/health") {

      return await healthHandlers.health(event);

    }

    if (method === "POST" && path === "/grammar/check") {
      requireAuth(event);
      return await grammarHandlers.checkGrammar(event, parseBody(event));
    }



    if (method === "POST" && path === "/auth/register") {

      return await authHandlers.register(event, parseBody(event));

    }

    if (method === "POST" && path === "/admin/parents") {
      return await adminHandlers.createParent(event, parseBody(event));
    }

    if (method === "POST" && path === "/auth/child-login") {
      return await authHandlers.childLogin(event, parseBody(event));
    }

    if (method === "POST" && path === "/auth/login") {

      return await authHandlers.login(event, parseBody(event));

    }

    if (method === "POST" && path === "/auth/change-password") {
      const auth = requireAuth(event);
      return await authHandlers.changePassword(event, auth, parseBody(event));
    }

    if (method === "POST" && path === "/auth/logout") {

      return await authHandlers.logout(event);

    }

    if (method === "GET" && path === "/auth/me") {

      const auth = requireAuth(event);

      return await authHandlers.me(event, auth);

    }



    if (method === "POST" && path === "/parent/children") {

      const parent = requireRole(event, "parent");

      return await parentHandlers.createChild(event, parent, parseBody(event));

    }

    if (method === "GET" && path === "/parent/children") {

      const parent = requireRole(event, "parent");

      return await parentHandlers.listChildren(event, parent);

    }



    const dashboardMatch = path.match(/^\/parent\/children\/([^/]+)\/dashboard$/);

    if (method === "GET" && dashboardMatch) {

      const parent = requireRole(event, "parent");

      return await parentHandlers.childDashboard(event, parent, dashboardMatch[1]);

    }

    const reportsMatch = path.match(/^\/parent\/children\/([^/]+)\/reports$/);
    if (method === "GET" && reportsMatch) {
      const parent = requireRole(event, "parent");
      return await parentHandlers.childReports(event, parent, reportsMatch[1]);
    }



    if (method === "GET" && path === "/child/today") {

      const child = requireRole(event, "child");

      return await childHandlers.getToday(event, child);

    }

    if (method === "GET" && path === "/child/pet") {
      const child = requireRole(event, "child");
      return await petHandlers.getState(event, child);
    }

    if (method === "POST" && path === "/child/pet/feed") {
      const child = requireRole(event, "child");
      return await petHandlers.feed(event, child);
    }

    if (method === "POST" && path === "/child/pet/play") {
      const child = requireRole(event, "child");
      return await petHandlers.play(event, child);
    }

    if (method === "POST" && path === "/child/pet/buy") {
      const child = requireRole(event, "child");
      return await petHandlers.buy(event, child, parseBody(event));
    }

    if (method === "GET" && path === "/child/calendar") {
      const child = requireRole(event, "child");
      return await calendarHandlers.getMonth(event, child);
    }

    if (method === "GET" && path === "/child/calendar/day") {
      const child = requireRole(event, "child");
      return await calendarHandlers.getDay(event, child);
    }

    const planReplayMatch = path.match(/^\/child\/daily-plan\/([^/]+)\/replay$/);
    if (method === "POST" && planReplayMatch) {
      const child = requireRole(event, "child");
      return await calendarHandlers.replayPlan(event, child, planReplayMatch[1]);
    }

    const assessReplayMatch = path.match(/^\/child\/assessments\/([^/]+)\/replay$/);
    if (method === "POST" && assessReplayMatch) {
      const child = requireRole(event, "child");
      return await calendarHandlers.replayQuiz(event, child, assessReplayMatch[1]);
    }

    if (method === "POST" && path === "/child/daily-plan/start") {

      const child = requireRole(event, "child");

      return await dailyHandlers.startPlan(event, child);

    }



    const planMatch = path.match(/^\/child\/daily-plan\/([^/]+)$/);

    if (method === "GET" && planMatch) {

      const child = requireRole(event, "child");

      return await dailyHandlers.getPlan(event, child, planMatch[1]);

    }



    const learnMatch = path.match(/^\/child\/daily-plan\/([^/]+)\/words$/);

    if (method === "GET" && learnMatch) {

      const child = requireRole(event, "child");

      return await dailyHandlers.getLearnWords(event, child, learnMatch[1]);

    }



    const practiceMatch = path.match(/^\/child\/daily-plan\/([^/]+)\/practice$/);

    if (method === "GET" && practiceMatch) {

      const child = requireRole(event, "child");

      const phase = event.queryStringParameters?.phase || "l1";

      return await dailyHandlers.getPractice(event, child, practiceMatch[1], phase);

    }



    const phaseMatch = path.match(/^\/child\/daily-plan\/([^/]+)\/phase\/complete$/);

    if (method === "POST" && phaseMatch) {

      const child = requireRole(event, "child");

      return await dailyHandlers.completePhase(

        event,

        child,

        phaseMatch[1],

        parseBody(event)

      );

    }



    if (method === "GET" && path === "/child/assessments/current") {
      const child = requireRole(event, "child");
      return await assessmentHandlers.getCurrent(event, child);
    }

    const assessMatch = path.match(/^\/child\/assessments\/([^/]+)$/);
    if (method === "GET" && assessMatch) {
      const child = requireRole(event, "child");
      return await assessmentHandlers.getById(event, child, assessMatch[1]);
    }

    const assessStart = path.match(/^\/child\/assessments\/([^/]+)\/start$/);
    if (method === "POST" && assessStart) {
      const child = requireRole(event, "child");
      return await assessmentHandlers.start(event, child, assessStart[1]);
    }

    const assessRespond = path.match(/^\/child\/assessments\/([^/]+)\/respond$/);
    if (method === "POST" && assessRespond) {
      const child = requireRole(event, "child");
      return await assessmentHandlers.respond(
        event,
        child,
        assessRespond[1],
        parseBody(event)
      );
    }

    const assessComplete = path.match(/^\/child\/assessments\/([^/]+)\/complete$/);
    if (method === "POST" && assessComplete) {
      const child = requireRole(event, "child");
      return await assessmentHandlers.complete(event, child, assessComplete[1]);
    }

    return errorResponse(event, Object.assign(new Error("Not found"), { status: 404 }));

  } catch (err) {

    return errorResponse(event, err);

  }

}


