"""Generate SQL seed files for Supabase SQL Editor (no DATABASE_URL needed).

Usage:
  py scripts/generate_supabase_seed_sql.py

Writes:
  supabase/02_seed_holidays.sql
  supabase/03_seed_wordpack.sql
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "supabase"
WORDPACK = ROOT / "data" / "wordpack.json"
HOLIDAYS = ROOT / "data" / "hk-holidays.json"

EMOJI: dict[str, str] = {
    "affect": "↔️",
    "earthworm": "🪱",
    "effect": "💥",
    "emergent": "🌳",
    "ferocious": "🦁",
    "grasshopper": "🦗",
    "insect": "🐞",
    "mammal": "🐻",
    "poisonous": "☠️",
    "sustain": "♻️",
    "trek": "🥾",
    "underground": "🕳️",
    "understory": "🌿",
    "carbon footprint": "👣",
    "climate change": "🌡️",
    "damage": "💔",
    "dangerous": "⚠️",
    "destructive": "🌪️",
    "drought": "🏜️",
    "frequent": "🔁",
    "greenhouse gas": "🏭",
    "gust": "💨",
    "marine": "🐠",
    "prone": "📉",
    "rescue": "🚁",
    "resource": "💧",
    "storm-proof": "🏠",
    "survivor": "🛟",
    "armoured": "🛡️",
    "bellow": "📢",
    "confused": "😕",
    "cosy": "🛋️",
    "creature": "👾",
    "excited": "🎉",
    "fawn over": "⭐",
    "fierce": "🐺",
    "fossil": "🦴",
    "frantically": "🏃",
    "harmful": "🚫",
    "haunted": "👻",
    "legend": "📜",
    "muster": "💪",
    "nervous": "😰",
    "relieved": "😌",
    "scales": "🐟",
    "shriek": "😱",
    "slobbery": "🐶",
    "spooky": "🌙",
    "stunning": "✨",
    "suspicious": "🔍",
    "tame": "🐕",
    "threatening": "⛈️",
    "underworld": "🌋",
    "vanish": "✨",
    "wrecked": "🚢",
    "hypothesis": "💡",
    "accurate": "📏",
    "observation": "🔬",
    "temporary": "⏱️",
    "theory": "📐",
    "volume": "📦",
    "elastic": "🔗",
    "rubber": "⭕",
    "contract": "↔️",
    "expand": "↕️",
    "evaporate": "💨",
    "condense": "💧",
    "shattering": "💥",
    "decaying": "🍂",
    "rusting": "🧱",
    "limitation": "🚧",
    "excessive": "⚠️",
    "consist of": "🧩",
    "component": "⚙️",
    "appliance": "🔌",
    "insulation": "🧥",
    "copper": "🟤",
    "kettle": "☕",
    "conductivity": "⚡",
    "enhance": "⬆️",
    "property": "📊",
    "composition": "🧪",
    "substance": "⚗️",
    "dough": "🍞",
    "grind": "🫙",
    "phenomena": "🌈",
    "split": "✂️",
    "resistance": "🔋",
    "barrel": "🛢️",
    "alley": "🏙️",
    "coarse": "🪨",
}


def sql_text(value: str | None) -> str:
    """PostgreSQL dollar-quoted literal safe for Supabase SQL Editor."""
    if value is None:
        return "NULL"
    text = str(value)
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    # Supabase SQL Editor splits on ';' — semicolons inside strings break the script.
    text = text.replace(";", ",")
    tag = "wp"
    n = 0
    while f"${tag}$" in text:
        n += 1
        tag = f"wp{n}"
    return f"${tag}${text}${tag}$"


def sql_str(value: str | None) -> str:
    return sql_text(value)


def emoji_for(lemma: str) -> str:
    return EMOJI.get(lemma, "📖")


def iter_words(pack: dict):
    for mod in pack.get("modules", []):
        for entry in mod.get("words", []):
            yield entry


def generate_holidays() -> str:
    payload = json.loads(HOLIDAYS.read_text(encoding="utf-8"))
    region = payload.get("region", "HK")
    lines = [
        "-- HK holidays seed — run after 01_schema.sql",
        "BEGIN;",
    ]
    for row in payload["holidays"]:
        lines.append(
            "INSERT INTO holidays (date, name, region) VALUES ("
            + f"{sql_str(row['date'])}::date, {sql_str(row['name'])}, {sql_str(region)}"
            + ") ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;"
        )
    lines.append("COMMIT;")
    lines.append("")
    lines.append(f"-- Upserted {len(payload['holidays'])} holidays")
    return "\n".join(lines) + "\n"


def generate_wordpack() -> str:
    pack = json.loads(WORDPACK.read_text(encoding="utf-8"))
    lines = [
        "-- Wordpack seed — run after 01_schema.sql",
        "-- Uses dollar-quoting; semicolons in sentences are replaced with commas.",
        "BEGIN;",
    ]
    word_count = 0
    example_count = 0
    blank_count = 0

    for entry in iter_words(pack):
        lemma = entry["word"]
        explanation = entry["explanation"]
        emoji = emoji_for(lemma)
        search = entry.get("pictureSearch")
        style = entry.get("pictureStyle")

        lines.append("")
        lines.append(f"-- Word: {lemma}")
        lines.append(
            "INSERT INTO words (lemma, explanation, picture_emoji, picture_search, picture_style)"
            f" VALUES ({sql_str(lemma)}, {sql_str(explanation)}, {sql_str(emoji)}, "
            f"{sql_str(search)}, {sql_str(style)})"
            " ON CONFLICT (lemma) DO UPDATE SET"
            " explanation = EXCLUDED.explanation,"
            " picture_emoji = EXCLUDED.picture_emoji,"
            " picture_search = EXCLUDED.picture_search,"
            " picture_style = EXCLUDED.picture_style,"
            " active = TRUE;"
        )
        lines.append(
            f"DELETE FROM word_examples WHERE word_id = (SELECT id FROM words WHERE lemma = {sql_str(lemma)});"
        )
        lines.append(
            f"DELETE FROM blank_items WHERE word_id = (SELECT id FROM words WHERE lemma = {sql_str(lemma)});"
        )

        for i, text in enumerate(entry.get("examples") or []):
            lines.append(
                "INSERT INTO word_examples (word_id, text, sort_order)"
                f" SELECT id, {sql_str(text)}, {i} FROM words WHERE lemma = {sql_str(lemma)};"
            )
            example_count += 1

        for sent in entry.get("sentences") or []:
            distractors = json.dumps(sent["distractors"], ensure_ascii=False)
            lines.append(
                "INSERT INTO blank_items (word_id, text, answer, distractors)"
                f" SELECT id, {sql_str(sent['text'])}, {sql_str(sent['answer'])}, "
                f"{sql_str(distractors)}::jsonb FROM words WHERE lemma = {sql_str(lemma)};"
            )
            blank_count += 1

        word_count += 1

    lines.append("COMMIT;")
    lines.append("")
    lines.append(f"-- Seeded {word_count} words, {example_count} examples, {blank_count} blank items")
    return "\n".join(lines) + "\n"


def main() -> int:
    OUT.mkdir(exist_ok=True)
    if not HOLIDAYS.is_file() or not WORDPACK.is_file():
        print("Missing data/hk-holidays.json or data/wordpack.json", file=sys.stderr)
        return 1

    holidays_path = OUT / "02_seed_holidays.sql"
    wordpack_path = OUT / "03_seed_wordpack.sql"
    holidays_path.write_text(generate_holidays(), encoding="utf-8")
    wordpack_path.write_text(generate_wordpack(), encoding="utf-8")

    print(f"Wrote {holidays_path}")
    print(f"Wrote {wordpack_path} ({wordpack_path.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
