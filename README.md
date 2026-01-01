# Ian's Flappy Dino

A prehistoric "Flappy Bird" style game featuring evolving dinosaurs, DNA strand obstacles, and powerful transformations. Built with Vanilla JavaScript and Canvas API.

## 🦖 Features

- **Evolution System**: Raptor → Quetzalcoatlus → T-Rex → Spinosaurus → Mosasaurus. Evolve every 10 points!
- **Visuals**: High-quality WebP/PNG sprites for all evolution stages.
- **Powerups**:
    - 🦴 **Dino Bone**: (+5 points, 1.5x Speed Boost for 5s). Spawns every 5-15 points.
    - 💎 **Diamond (Super T-Rex)**: Transform into the invulnerable **Super T-Rex** for 30 seconds! In this mode, you smash through DNA strands instead of taking damage. Spawns every 50 points.
- **Dynamic Difficulty**: Game speed increases with each evolution level.
- **Procedural Audio**: 8-bit style sound effects (Jump, Hit, Point, Upgrade, Powerup, Explosion) synthesized via Web Audio API.
- **Themes**: Atmospheric background gradients cycle every 30 points.
- **Health System**: 3 hearts with 1s invulnerability frames. Hearts refill upon evolution.
- **Persistence**: Local storage tracks your all-time high score.
- **Modern UI**: Polished start screen, game over screen, and dynamic message overlays.

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
- `src/PowerupManager.js`: Bone and Diamond powerup lifecycle.
- `src/AudioManager.js`: On-the-fly sound effect synthesis.
- `src/Constants.js`: Centralized game configuration.
- `src/style.css`: UI layout and background themes.

---
Enjoy the hunt, Ian!
