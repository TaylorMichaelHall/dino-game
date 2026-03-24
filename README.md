# Ian’s Jurassic Escape


Browser-based arcade game. Side project with my kid. He picks the features, I write the code.

Play it here: https://taylormichaelhall.com/dino

<img width="1154" height="971" alt="553100163-0d4642f6-9082-4de1-a1ca-7eb879754eb5" src="https://github.com/user-attachments/assets/e40f1762-0b9c-4cc5-a153-e6d4e4e1aa6f" />
<img width="360" height="775" alt="553100056-f2e1a99a-6219-4a12-a9f8-780adbc6dad6" src="https://github.com/user-attachments/assets/f556086f-90c0-4cd6-bdcc-1298ffc82197" />

---

## Gameplay

Dodge DNA obstacles, evolve through different dinosaurs as you score, collect power-ups. Keyboard, mouse, and touch all work.

- Multiple dino evolutions per run
- Power-ups and temporary “super” modes
- Local high scores in the browser
- Global leaderboard (top 20)

---

## Tech

No game libraries, just TypeScript, HTML5 Canvas, and Web Audio API. Built with Vite, linted with Biome.

---

## Running locally

```
npm install
npm run dev
```

`npm run build` outputs a static site to `dist/`.

The leaderboard is optional — without `VITE_LEADERBOARD_URL` set, the game works fully offline with local high scores only.

---

## Leaderboard Infrastructure

The global leaderboard runs on AWS (all within always-free tiers):

- **DynamoDB table** `dino-leaderboard` — partition key `playerId` (String), provisioned 1 RCU / 1 WCU
- **Lambda function** `dino-leaderboard` — Node.js 24.x, handler `leaderboard.handler`, source in `lambda/leaderboard.mjs`
- **Lambda Function URL** — auth type NONE, CORS configured for the game's domain

The deploy workflow (`.github/workflows/deploy.yml`) updates the Lambda code on each push to `main`. The `VITE_LEADERBOARD_URL` GitHub secret is passed to the Vite build so the client knows the API endpoint.
