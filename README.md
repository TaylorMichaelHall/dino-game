# Ian's Jurassic Escape

A prehistoric "Flappy Bird" style game featuring evolving dinosaurs, DNA strand obstacles, and powerful transformations. Built with Vanilla JavaScript and Canvas API.

## 🦖 Features

- **Evolution System**: Raptor → Quetzalcoatlus → T-Rex → Spinosaurus → Mosasaurus. Evolve every 10 points!
- **Visuals**: High-quality WebP/PNG sprites for all evolution stages.
- **Powerups**:
    - 🦴 **Dino Bone**: (+5 points, 1.5x Speed Boost for 5s). Spawns every 5-15 points.
    - 💎/💚 **Gems (Super Dino)**: Transform into an invulnerable **Super Dino** for 30 seconds! Diamonds turn you into a **Super T-Rex**, while Emeralds turn you into a **Super Spinosaurus**. In this mode, you smash through DNA strands instead of taking damage. Spawns every 50 points.
- **Dynamic Difficulty**: Game speed increases with each evolution level.
- **Procedural Audio**: 8-bit style sound effects (Jump, Hit, Point, Upgrade, Powerup, Explosion) and a looping chiptune soundtrack synthesized via the Web Audio API.
- **Audio Toggles & Pause Button**: Music/SFX buttons plus a tap-friendly pause button live under the instructions so mobile players never have to reach into the gameplay area.
- **Themes**: Atmospheric background gradients cycle every 30 points.
- **Health System**: 3 hearts with 1s invulnerability frames. Hearts refill upon evolution.
- **Hit Flash**: Intense visual feedback (screen/border flash) when taking damage or smashing DNA.
- **Persistence**: Local storage tracks your all-time high score.
- **Modern UI**: Polished screens for Start, Pause, and Game Over, with smooth CSS animations.
- **Personalized Intro**: A custom "GO IAN" coin message welcomes you at the start of every run.

## ⌨️ Controls

- **Space / Click / Tap**: Jump
- **P**: Pause / Resume
- **R**: Restart (on Game Over screen)
- **Footer controls**: Toggle Music/SFX and pause instantly from the footer (optimized for both desktop and touch).
- **HUD**: Score sits in a separate top bar, hearts + Super Dino timer float over the playfield, and all elements resize gracefully down to small phones.

## 🚀 Getting Started

### Installation

1. Clone or download the project.
2. Open a terminal in the project root.
3. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to play.

### Building for Production

```bash
npm run build
```

### Hosting / Deployment

The build output in `dist/` is a completely static site, so you can host it anywhere that serves files:

1. Run `npm run build`. This emits minified assets in `dist/`.
2. Upload **everything** inside `dist/` to your host, keeping the folder structure intact.
3. (Optional but recommended) Purge any caches/CDNs after you deploy so new assets load immediately.

#### Example: Amazon S3

1. Create (or reuse) an S3 bucket and enable *Static website hosting* in the bucket properties. Set both the index and error document to `index.html`.
2. Upload from the repo root:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name/dino/ --delete
   ```
   The trailing `/dino/` is optional—use it if you want the game under a subfolder.
3. Make the bucket (or CloudFront distribution) publicly readable. A minimal bucket policy looks like:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/dino/*"
       }
     ]
   }
   ```
4. (Optional) Put CloudFront in front of the bucket for HTTPS and caching. Point your domain/DNS record at the CloudFront distribution.

Because Vite is configured with a relative `base`, you can host the game at the bucket root or in any subdirectory without breaking asset URLs.

## 🛠 Maintenance & Tuning

All gameplay logic is centralized in `src/Constants.js`. You can easily adjust:
- **Physics**: Gravity, Jump strength.
- **Difficulty**: Base speed and speed increase per evolution.
- **Spawning**: Obstacle gap size and powerup frequency.
- **Powerup Effects**: Bonus points, speed multipliers, and transformation durations.

## 📁 Architecture

- `src/main.js`: Entry point.
- `src/Game.js`: Main loop, state management, and entity coordination.
- `src/Dino.js`: Physics, evolution logic, and sprite rendering.
- `src/ObstacleManager.js`: DNA strand spawning and movement.
- `src/CoinManager.js`: Custom coin patterns and message spawning ("GO IAN").
- `src/PowerupManager.js`: Bone and Gem (Diamond/Emerald) powerup lifecycle.
- `src/AudioManager.js`: On-the-fly sound effect synthesis.
- `src/musicLoop.js`: Defines the procedural Jurassic background soundtrack.
- `src/Constants.js`: Centralized game configuration.
- `src/style.css`: UI layout and background themes.

---
Enjoy the hunt, Ian!
