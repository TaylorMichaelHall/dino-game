# Ian’s Jurassic Escape


Browser-based arcade game. Side project with my kid. He picks the features, I write the code.

Play it here: https://taylormichaelhall.com/dino


<img width="934" height="930" alt="Screenshot_20260424_213553" src="https://github.com/user-attachments/assets/d7126c9f-1b34-4f99-83e1-e4d0c3cd4948" />

<img width="407" height="829" alt="Screenshot_20260424_213632" src="https://github.com/user-attachments/assets/5abe669b-2f9f-43e4-a21e-335f7ce28a13" />

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

- **DynamoDB table** `game-leaderboard` — composite key `gameId` (HASH) + `playerId` (RANGE), provisioned 1 RCU / 1 WCU. Shared across games; this Lambda hardcodes `GAME_ID = "jurassic_escape"`.
- **Lambda function** `dino-leaderboard` — Node.js 24.x, handler `leaderboard.handler`, source in `lambda/leaderboard.mjs`
- **Lambda Function URL** — auth type NONE, CORS configured for the game's domain

The deploy workflow (`.github/workflows/deploy.yml`) updates the Lambda code on each push to `main`. The `VITE_LEADERBOARD_URL` GitHub secret is passed to the Vite build so the client knows the API endpoint.
