# Ian's Flappy Dino

A modern, high-performance "Flappy Bird" clone featuring evolving dinosaurs, DNA strand obstacles, and dynamic difficulty scaling.

## 🦖 Features

- **Evolution System**: Play as a Raptor, Pterosaur, and T-Rex. Evolution occurs every 10 points.
- **Dynamic Difficulty**: Horizontal speed increases with every evolution.
- **Visuals**: High-fidelity procedural sprites drawn via Canvas API.
- **Procedural Audio**: 8-bit style synthesized sound effects (Jump, Hit, Point, Upgrade, Powerup) using the Web Audio API.
- **Dino Bone Powerup**: Randomly appearing bone that grants +5 points and a temporary 50% speed boost.
- **Themes**: Background gradients cycle every 30 points.
- **Health System**: 3 hearts with invulnerability frames (1s) on damage. Hearts refill on evolution.
- **Persistence**: High score is saved locally via `localStorage`.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository or extract the project files.
2. Open a terminal in the project root.
3. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the development server with hot-reloading:
```bash
npm run dev
```
Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

To create an optimized production build in the `dist/` folder:
```bash
npm run build
```

## 🛠 Maintenance & Tuning

The project is designed for easy maintenance. Most gameplay settings can be tweaked in a single file:

### `src/Constants.js`

Open this file to adjust:
- **Physics**: Gravity, jump strength, and max fall speed.
- **Difficulty**: Base speed and speed increment per evolution.
- **Gameplay**: Evolution thresholds, max hearts, and scoring logic.
- **Colors**: Dino colors, DNA obstacle colors, and theme class names.

## 📁 Code Structure

- `index.html`: Main UI layout and game container.
- `src/main.js`: Bootstraps the game logic.
- `src/Game.js`: The "brain" of the game; manages state, score, and the main loop.
- `src/Dino.js`: Handles dinosaur physics, state (health/evo), and rendering.
- `src/ObstacleManager.js`: Manages spawning and animation of the DNA strands.
- `src/style.css`: Project styling and theme definitions.

---
Created for Ian. Enjoy the evolution!
