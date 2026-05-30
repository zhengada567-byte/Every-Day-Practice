import { query } from "../db.mjs";
import { buyOutfit, buyPetBackground, feedPet, getPetState, playWithPet } from "../pet.mjs";
import { ok } from "../http.mjs";

export async function getState(event, childAuth) {
  const state = await getPetState(childAuth.sub, query);
  return ok(event, state);
}

export async function feed(event, childAuth) {
  const result = await feedPet(childAuth.sub, query);
  return ok(event, result);
}

export async function play(event, childAuth) {
  const result = await playWithPet(childAuth.sub, query);
  return ok(event, result);
}

export async function buy(event, childAuth, body) {
  const item = (body.item || body.outfit || "").trim();
  const result = await buyOutfit(childAuth.sub, item, query);
  return ok(event, result);
}

export async function buyBackground(event, childAuth, body) {
  const key = (body.background || body.key || "").trim();
  const result = await buyPetBackground(childAuth.sub, key, query);
  return ok(event, result);
}
