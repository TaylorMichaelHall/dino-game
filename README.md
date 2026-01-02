# Ian’s Jurassic Escape

A fast, physics-heavy arcade game built for the browser.

This started as a side project with my 8-year-old son. He acts as the product manager (dinosaurs, power-ups, “cool factor”), and I handle the implementation. The goal is simple: build something that feels good to play, is easy to pick up, and makes people want one more run.

Play it here: https://taylormichaelhall.com/dino

---

## The vibe

Tight controls, quick feedback, and short runs. You guide a dinosaur through DNA obstacles, evolve as you score points, and try to survive long enough to see the world change around you.

### What’s in the game
- Multiple dinosaurs that you evolve into during a run
- Power-ups that meaningfully change how the game plays
- “Super” modes that let you smash through obstacles for a short time
- Subtle physics that reward timing and momentum
- Controls that feel native on keyboard, mouse, and touch
- Local high scores saved in the browser

---

## Tech

Kept intentionally lightweight to stay fast and portable:

- Vanilla JavaScript
- HTML5 Canvas
- Web Audio API for music and sound effects
- Vite for local development and static builds

---

## Running it locally

Install dependencies:
`npm install`

Start the dev server:
`npm run dev`

Build for production:
`npm run build`

The output is a fully static site in the dist/ directory and can be hosted anywhere.

---

## Where it’s going

This is an active, ongoing project. We’re still tweaking feel and balance and adding new ideas as we playtest. Current ideas include new dinos, more power-ups, and small surprise challenges during runs.

---

## Status

Actively developed and playtested. If something feels off, it probably got changed after the last play session.
