# MaiKiasu

> **毋驚輸** — *Don't fear losing.*

**MaiKiasu** is a quiz-based spaced repetition app built to help you study smarter, not harder.

## The Name

The name blends two Hokkien words that capture the app's spirit perfectly:

**Mai (毋/莫)** means *"don't," "don't want,"* or *"will not."* It's used in daily Hokkien conversation to reject something or express reluctance — as in *"mai hiam"* (don't complain) or *"ai mai"* (want or don't want?).

**Kiasu (驚輸; kiaⁿ-su)** literally translates to *"fear of losing"* or *"scared to lose."* It describes a competitive mindset laser-focused on not missing out — think queuing at midnight for a sale, or hoarding bubble tea vouchers. In Singapore, it's a way of life.

Together, **MaiKiasu** flips the script: *don't be kiasu — study consistently and trust the process.* The spaced repetition algorithm does the heavy lifting so you don't have to cram.

---

## Features

- **SM-2 Spaced Repetition** — cards are scheduled based on your recall confidence, surfacing weak spots at the right time
- **5 Question Types** — Multiple Choice, Multi-Select, Fill in the Blank, Sorting (drag & drop), and Matching (dropdown)
- **Module System** — import separate question banks as named modules (e.g. IoT, PSD); auto-imported on first launch
- **Study Modes** — Due for Review · By Module (then by topic) · All Questions · New Questions
- **Session Resume** — pick up an unfinished session exactly where you left off
- **Dark / Light Theme** — toggle at any time
- **Fully offline** — everything lives in your browser's localStorage; no account needed

---

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) (recommended)

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/your-username/maikiasu.git
cd maikiasu

# 2. Install dependencies
bun install        # or: npm install

# 3. Start the dev server
bun run dev        # or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

On first launch, the two bundled modules (**IoT Communications** and **Professional Software Dev**) are automatically imported from `public/modules/`.

### Adding Your Own Module

1. Place your JSON file in `public/modules/your-module.json`
2. Add an entry to `lib/config/modules.ts`:

```ts
{ id: 'your-module', name: 'Your Module Name', description: '...', file: '/modules/your-module.json' }
```

The module will be auto-imported on the next page load.

---

## JSON Question Format

MaiKiasu auto-detects the format from the file structure.

### Format 1 — Flat Array *(recommended)*

```json
[
  {
    "question": "What does MQTT stand for?",
    "type": "single",
    "chapter": "3. CoAP & MQTT",
    "options": [
      "Message Queue Telemetry Transport",
      "Managed Queue Transfer Technology",
      "Multi-Queue Transmission Tool"
    ],
    "answer": "Message Queue Telemetry Transport",
    "note": "MQTT is a lightweight publish-subscribe protocol."
  },
  {
    "question": "Which of the following are IoT communication protocols?",
    "type": "multiple",
    "chapter": "3. CoAP & MQTT",
    "options": ["MQTT", "CoAP", "FTP", "LoRa"],
    "answer": ["MQTT", "CoAP", "LoRa"]
  },
  {
    "question": "Match each term to its description.",
    "type": "matching",
    "chapter": "5. LoRa & LoRaWAN",
    "options": ["1. Long-range radio modulation", "2. Network server layer", "3. End device"],
    "answer": {
      "LoRa":    "1. Long-range radio modulation",
      "LoRaWAN": "2. Network server layer",
      "Node":    "3. End device"
    }
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `question` | `string` | The question text |
| `type` | `"single"` \| `"multiple"` \| `"matching"` | Defaults to `"single"` if omitted |
| `chapter` | `string` | Used as the topic/category label |
| `options` | `string[]` | Answer choices |
| `answer` | `string` \| `string[]` \| `Record<string,string>` | Correct answer(s) |
| `note` | `string` | Optional explanation shown after answering |

### Format 2 — Topics Object *(legacy)*

```json
{
  "topics": {
    "topic_01": {
      "name": "Introduction",
      "icon": "📖",
      "questions": [
        {
          "id": 1,
          "question": "What is spaced repetition?",
          "options": ["A scheduling algorithm", "A diet plan", "A sorting method", "A database"],
          "correct": 0,
          "rationale": "Spaced repetition spaces out review sessions over increasing intervals."
        }
      ]
    }
  }
}
```

Supported `type` values in legacy format: *(omit for multiple choice)*, `"sorting"`, `"fill_in_blank"`.
