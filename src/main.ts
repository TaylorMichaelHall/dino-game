import "./styles/style.css";
import { Game } from "./core/Game";

window.addEventListener("load", () => {
	const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
	if (canvas) {
		new Game(canvas);
	}
});
