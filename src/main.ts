import "./styles/base.css";
import "./styles/layout.css";
import "./styles/ui.css";
import "./styles/animations.css";
import { Game } from "./core/Game";

window.addEventListener("load", () => {
	const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
	if (canvas) {
		new Game(canvas);
	}
});
