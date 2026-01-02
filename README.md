# Ian’s Jurassic Escape

A small browser game I built with my 8-year-old.

It’s a fast, physics-based arcade game where you guide a dinosaur through increasingly dangerous obstacles, collect power-ups, and evolve into bigger, more chaotic forms. The goal was simple: make something that feels good to play and is fun to come back to.

The game is still evolving.

Play it here: <your link>

---

## Why this exists

This started as a collaborative project where my kid acted as the product manager and I handled implementation. I focused on:

- Responsive, forgiving physics
- Clear visual feedback
- Short feedback loops (“one more try” gameplay)
- Shipping something complete and playable

It’s intentionally lightweight and not over-engineered.

---

## Current highlights

- Multiple dinosaur evolutions with changing difficulty
- Power-ups that meaningfully alter gameplay
- Polished UI with keyboard, mouse, and touch support
- Persistent high score stored locally
- Runs entirely in the browser (no backend)

---

## Tech

- Vanilla JavaScript
- HTML Canvas
- Vite for local development and builds
- Fully static output suitable for any static host

---

## Running locally

1. Install dependencies  
   npm install

2. Start the dev server  
   npm run dev

3. Build for production  
   npm run build

The production build is fully static and lives in the dist/ directory.

---

## Status

This is an active side project. Features, balance, and polish are still being iterated as we playtest and refine the game.
