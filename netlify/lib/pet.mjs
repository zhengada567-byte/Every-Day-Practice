import { getHkNow } from "./calendar.mjs";
import { fetchPlanDetail } from "./daily.mjs";

const MS_DAY = 24 * 60 * 60 * 1000;
const COINS_PER_WORD = { l1: 1, l2: 2, l3: 3 };

export function bi(zh, en) {
  return zh + " · " + en;
}

export const SHOP_ITEMS = {
  food: {
    key: "food",
    label: "食物",
    labelEn: "Food",
    emoji: "🍎",
    cost: 1,
    kind: "consumable",
  },
  toy: {
    key: "toy",
    label: "玩具",
    labelEn: "Toy",
    emoji: "🧸",
    cost: 3,
    kind: "consumable",
  },
  cap: {
    key: "cap",
    label: "小帽子",
    labelEn: "Cap",
    emoji: "🧢",
    cost: 5,
    kind: "outfit",
  },
  scarf: {
    key: "scarf",
    label: "围巾",
    labelEn: "Scarf",
    emoji: "🧣",
    cost: 5,
    kind: "outfit",
  },
  bow: {
    key: "bow",
    label: "蝴蝶结",
    labelEn: "Bow",
    emoji: "🎀",
    cost: 5,
    kind: "outfit",
  },
};

let petSchemaReady = false;

/** Create pet/coin tables if migration 004 was not applied yet. */
async function ensurePetSchema(query) {
  if (petSchemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS child_coin_balances (
      child_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
      coins INT NOT NULL DEFAULT 0 CHECK (coins >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS child_pet (
      child_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
      food_progress INT NOT NULL DEFAULT 0 CHECK (food_progress >= 0 AND food_progress <= 10),
      full_until TIMESTAMPTZ,
      happy_until TIMESTAMPTZ,
      outfit TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS daily_plan_coin_grants (
      daily_plan_id UUID NOT NULL REFERENCES daily_plans (id) ON DELETE CASCADE,
      phase TEXT NOT NULL CHECK (phase IN ('l1', 'l2', 'l3')),
      word_count INT NOT NULL,
      coins_granted INT NOT NULL,
      granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (daily_plan_id, phase)
    )
  `);
  petSchemaReady = true;
}

async function ensurePetRow(childId, query) {
  await ensurePetSchema(query);
  await query(
    `INSERT INTO child_coin_balances (child_id, coins) VALUES ($1, 0) ON CONFLICT DO NOTHING`,
    [childId]
  );
  await query(
    `INSERT INTO child_pet (child_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [childId]
  );
}

function hungerStatus(pet, now) {
  if (pet.full_until && new Date(pet.full_until).getTime() > now.getTime()) {
    return "full";
  }
  return "hungry";
}

function moodStatus(pet, now) {
  if (pet.happy_until && new Date(pet.happy_until).getTime() > now.getTime()) {
    return "happy";
  }
  return "boring";
}

async function loadPetRow(childId, query) {
  await ensurePetRow(childId, query);
  const { rows: coinRows } = await query(
    `SELECT coins FROM child_coin_balances WHERE child_id = $1`,
    [childId]
  );
  const { rows: petRows } = await query(
    `SELECT food_progress, full_until, happy_until, outfit FROM child_pet WHERE child_id = $1`,
    [childId]
  );
  return {
    coins: coinRows[0]?.coins ?? 0,
    pet: petRows[0] || { food_progress: 0, full_until: null, happy_until: null, outfit: null },
  };
}

/** Reset food after 24h full; clear happiness after 24h. */
async function applyPetDecay(childId, query) {
  const now = new Date();
  const { pet } = await loadPetRow(childId, query);
  let foodProgress = pet.food_progress;
  let fullUntil = pet.full_until;
  let happyUntil = pet.happy_until;

  if (fullUntil && new Date(fullUntil).getTime() <= now.getTime()) {
    foodProgress = 0;
    fullUntil = null;
  }

  if (happyUntil && new Date(happyUntil).getTime() <= now.getTime()) {
    happyUntil = null;
  }

  await query(
    `
    UPDATE child_pet
    SET food_progress = $2, full_until = $3, happy_until = $4, updated_at = now()
    WHERE child_id = $1
    `,
    [childId, foodProgress, fullUntil, happyUntil]
  );
}

export function mapPetPayload(coins, pet) {
  const now = new Date();
  const hunger = hungerStatus(pet, now);
  const mood = moodStatus(pet, now);
  let fullRemainingMs = 0;
  let happyRemainingMs = 0;
  if (pet.full_until && hunger === "full") {
    fullRemainingMs = Math.max(0, new Date(pet.full_until).getTime() - now.getTime());
  }
  if (pet.happy_until && mood === "happy") {
    happyRemainingMs = Math.max(0, new Date(pet.happy_until).getTime() - now.getTime());
  }

  return {
    coins,
    hunger,
    mood,
    foodProgress: pet.food_progress,
    foodNeeded: 10,
    outfit: pet.outfit,
    fullRemainingMs,
    happyRemainingMs,
    shop: Object.values(SHOP_ITEMS),
  };
}

export async function getPetState(childId, query) {
  await applyPetDecay(childId, query);
  const { coins, pet } = await loadPetRow(childId, query);
  return mapPetPayload(coins, pet);
}

export async function addCoins(childId, amount, query) {
  if (amount <= 0) return getPetState(childId, query);
  await ensurePetRow(childId, query);
  await query(
    `
    UPDATE child_coin_balances
    SET coins = coins + $2, updated_at = now()
    WHERE child_id = $1
    `,
    [childId, amount]
  );
  return getPetState(childId, query);
}

async function spendCoins(childId, amount, query) {
  await ensurePetRow(childId, query);
  const { rows } = await query(
    `
    UPDATE child_coin_balances
    SET coins = coins - $2, updated_at = now()
    WHERE child_id = $1 AND coins >= $2
    RETURNING coins
    `,
    [childId, amount]
  );
  if (!rows.length) {
    const err = new Error(bi("金币不够啦！", "Not enough golden coins"));
    err.status = 422;
    throw err;
  }
  return rows[0].coins;
}

export async function awardPhaseCoins(childId, planId, phase, query) {
  const rate = COINS_PER_WORD[phase];
  if (!rate) return { coinsEarned: 0, pet: await getPetState(childId, query) };

  const { rows: existing } = await query(
    `SELECT 1 FROM daily_plan_coin_grants WHERE daily_plan_id = $1 AND phase = $2`,
    [planId, phase]
  );
  if (existing.length) {
    return { coinsEarned: 0, pet: await getPetState(childId, query) };
  }

  const plan = await fetchPlanDetail(planId, childId, query);
  if (!plan) {
    const err = new Error("Plan not found");
    err.status = 404;
    throw err;
  }

  let wordCount = plan.words.length;
  if (phase === "l3") {
    wordCount = plan.newWords.length;
  }
  if (wordCount <= 0) {
    return { coinsEarned: 0, pet: await getPetState(childId, query) };
  }

  const coinsEarned = wordCount * rate;
  await query(
    `
    INSERT INTO daily_plan_coin_grants (daily_plan_id, phase, word_count, coins_granted)
    VALUES ($1, $2, $3, $4)
    `,
    [planId, phase, wordCount, coinsEarned]
  );
  await addCoins(childId, coinsEarned, query);
  const pet = await getPetState(childId, query);
  return { coinsEarned, wordCount, coinsPerWord: rate, pet };
}

export async function feedPet(childId, query) {
  await applyPetDecay(childId, query);
  const { pet } = await loadPetRow(childId, query);
  const now = new Date();

  if (hungerStatus(pet, now) === "full") {
    const err = new Error(bi("宠物小精灵已经吃饱了！", "Your pet is already full!"));
    err.status = 422;
    throw err;
  }

  await spendCoins(childId, SHOP_ITEMS.food.cost, query);
  let foodProgress = pet.food_progress + 1;
  let fullUntil = pet.full_until;
  if (foodProgress >= 10) {
    foodProgress = 10;
    fullUntil = new Date(now.getTime() + MS_DAY);
  }

  await query(
    `
    UPDATE child_pet
    SET food_progress = $2, full_until = $3, updated_at = now()
    WHERE child_id = $1
    `,
    [childId, foodProgress, fullUntil]
  );

  const state = await getPetState(childId, query);
  return { action: "feed", state };
}

export async function playWithPet(childId, query) {
  await applyPetDecay(childId, query);
  const { pet } = await loadPetRow(childId, query);
  const now = new Date();

  if (moodStatus(pet, now) === "happy") {
    const err = new Error(bi("宠物小精灵今天已经很开心了！", "Your pet is already happy today!"));
    err.status = 422;
    throw err;
  }

  await spendCoins(childId, SHOP_ITEMS.toy.cost, query);
  const happyUntil = new Date(now.getTime() + MS_DAY);

  await query(
    `
    UPDATE child_pet
    SET happy_until = $2, updated_at = now()
    WHERE child_id = $1
    `,
    [childId, happyUntil]
  );

  const state = await getPetState(childId, query);
  return { action: "play", state };
}

export async function buyOutfit(childId, itemKey, query) {
  const item = SHOP_ITEMS[itemKey];
  if (!item || item.kind !== "outfit") {
    const err = new Error("Unknown outfit");
    err.status = 400;
    throw err;
  }
  await spendCoins(childId, item.cost, query);
  await query(
    `UPDATE child_pet SET outfit = $2, updated_at = now() WHERE child_id = $1`,
    [childId, itemKey]
  );
  const state = await getPetState(childId, query);
  return { action: "outfit", item: itemKey, state };
}
