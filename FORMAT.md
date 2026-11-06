# Spanish Lab: content format

Every topic is **one JSON file** in `content/`. Adding a topic means writing data, not code.
The engine reads the file and builds the theory page, flashcards and exercises.

## Top level

| Field | Type | What it is |
|---|---|---|
| `id` | string | Unique, kebab-case. Used in XP history and progress (`reflexivos-rutina`) |
| `category` | string | One of `Verbos`, `Gramática`, `Vocabulario`, `Comprensión lectora`, `Escritura` |
| `title` | string | Spanish title shown to students |
| `subtitle` | string | English one-liner |
| `taughtIn` | array | `[{ "grade": "MYP5", "unit": "U1 Bienvenidos" }]`. Drives the "my level" filter and the course pathways |
| `levels` | object | `{ "1": {...}, "2": {...}, "3": {...} }`. Name, short description and the grade it's aimed at |
| `theory` | array | Theory sections (see below) |
| `vocab` | array | `{ "es": "levantarse", "en": "to get up", "note": "regular" }`. Feeds flashcards and matching |
| `exercises` | array | Exercise sets (see below) |

## Theory section
```json
{ "level": 1, "heading": "¿Qué es un verbo reflexivo?",
  "body": "Markdown-lite text. **bold**, *italic*, line breaks.",
  "table": { "head": ["", "levantarse"], "rows": [["yo", "me levanto"]] },
  "tip": "Optional orange 'Ojo' box" }
```

## Exercise set
```json
{ "id": "refl-1-conj", "level": 1, "type": "conjugate",
  "title": "Conjuga", "instructions": "English instructions",
  "xpPerItem": 2, "items": [ ... ] }
```

### Closed types (Class A: auto-corrected in the browser, no AI)
| `type` | Item shape | Notes |
|---|---|---|
| `conjugate` | `{ "subject": "yo", "verb": "levantarse", "answer": "me levanto", "accept": [] }` | |
| `gap` | `{ "text": "Yo ___ a las siete.", "hint": "levantarse", "answer": "me levanto", "accept": [] }` | One `___` per item. Optional set-level `bank` array shows a word bank |
| `choice` | `{ "q": "...", "options": ["a","b","c"], "answer": 1, "why": "English explanation" }` | `answer` = index |
| `order` | `{ "words": ["me","ducho","primero"], "answer": "Primero me ducho", "accept": [] }` | Shown shuffled. Capitals/final dot ignored |
| `match` | `{ "pairs": [["levantarse","to get up"], ...] }` | Usually 6–8 pairs per item |
| `translate` | `{ "en": "I get dressed quickly.", "answer": "Me visto rápidamente.", "accept": ["Me visto rápido."] }` | List every valid variant you can think of |
| `transform` | `{ "from": "Me levanto. Me ducho.", "instruction": "Use 'nada más + infinitive'", "answer": "...", "accept": [] }` | Basic → advanced rewrite |

**Checker rules (all closed types):** case, extra spaces, ¿ ¡ and final punctuation are ignored. The answer is correct if it matches `answer` or anything in `accept`.
**Accent rule** (decision 2026-11-04, can be changed in `ACCENT_MODE`): a missing tilde (á é í ó ú ü) counts as
- MYP3: correct, with a "watch the accent" warning and full XP
- MYP4–MYP5: wrong, but the message says "only the accent is missing"

`ñ` is a separate letter, not an accent: `ano` ≠ `año` in every grade.

### Open types (Class B: AI feedback in English via the Writing Lab `getFB()` flow)
| `type` | Shape |
|---|---|
| `writing` | `{ "prompt": "...", "criteria": ["uses ≥5 reflexive verbs", ...], "minWords": 50, "maxWords": 100, "model": "optional model text" }` |
| `reading` | `{ "text": "...", "questions": ["open question", ...] }` |

The `criteria` list goes into the feedback prompt, so the AI checks the task requirements as well as the grammar.

## Levels → grades
Level is the difficulty of the material, not a lock. By default Practice opens on the student's grade (`MYP3 → 1`, `MYP4 → 2`, `MYP5 → 3` unless a topic's `levels` say otherwise), but every level is open to everyone.
