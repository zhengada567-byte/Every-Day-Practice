"""Seed words, examples, and blank items from data/wordpack.json.

Usage:
  py scripts/seed_wordpack.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from db_util import ROOT, get_database_url

WORDPACK = ROOT / "data" / "wordpack.json"

# From js/game.js — default emoji per lemma
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


def emoji_for(lemma: str) -> str:
    return EMOJI.get(lemma, "📖")


def iter_words(pack: dict):
    for mod in pack.get("modules", []):
        for entry in mod.get("words", []):
            yield entry


def main() -> int:
    try:
        import psycopg
        from psycopg.types.json import Jsonb
    except ImportError:
        print("Install psycopg: py -m pip install psycopg[binary]", file=sys.stderr)
        return 1

    if not WORDPACK.is_file():
        print(f"Missing {WORDPACK}", file=sys.stderr)
        return 1

    pack = json.loads(WORDPACK.read_text(encoding="utf-8"))
    url = get_database_url()

    upsert_word = """
        INSERT INTO words (lemma, explanation, picture_emoji, picture_search, picture_style)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (lemma) DO UPDATE SET
          explanation = EXCLUDED.explanation,
          picture_emoji = EXCLUDED.picture_emoji,
          picture_search = EXCLUDED.picture_search,
          picture_style = EXCLUDED.picture_style,
          active = TRUE
        RETURNING id
    """

    word_count = 0
    example_count = 0
    blank_count = 0

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            for entry in iter_words(pack):
                lemma = entry["word"]
                cur.execute(
                    upsert_word,
                    (
                        lemma,
                        entry["explanation"],
                        emoji_for(lemma),
                        entry.get("pictureSearch"),
                        entry.get("pictureStyle"),
                    ),
                )
                word_id = cur.fetchone()[0]
                word_count += 1

                cur.execute("DELETE FROM word_examples WHERE word_id = %s", (word_id,))
                examples = entry.get("examples") or []
                if examples:
                    cur.executemany(
                        """
                        INSERT INTO word_examples (word_id, text, sort_order)
                        VALUES (%s, %s, %s)
                        """,
                        [(word_id, text, i) for i, text in enumerate(examples)],
                    )
                    example_count += len(examples)

                cur.execute("DELETE FROM blank_items WHERE word_id = %s", (word_id,))
                sentences = entry.get("sentences") or []
                if sentences:
                    cur.executemany(
                        """
                        INSERT INTO blank_items (word_id, text, answer, distractors)
                        VALUES (%s, %s, %s, %s)
                        """,
                        [
                            (
                                word_id,
                                sent["text"],
                                sent["answer"],
                                Jsonb(sent["distractors"]),
                            )
                            for sent in sentences
                        ],
                    )
                    blank_count += len(sentences)

        conn.commit()

    print(
        f"Seeded {word_count} words, {example_count} examples, {blank_count} blank items "
        f"from {WORDPACK.name}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
