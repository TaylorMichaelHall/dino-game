import type { ILeaderboardService, LeaderboardEntry } from "../types";

const PLAYER_ID_KEY = "jurassicEscapePlayerId";
const INITIALS_KEY = "jurassicEscapeInitials";
const TIMEOUT_MS = 5000;

interface LeaderboardResponse {
	entries: LeaderboardEntry[];
	totalPlays: number;
}

export class LeaderboardService implements ILeaderboardService {
	private apiUrl: string | undefined;
	private cache: LeaderboardEntry[] | null = null;
	private playerId: string;

	constructor() {
		this.apiUrl = import.meta.env.VITE_LEADERBOARD_URL;
		// Pre-existing players have a high score but no playerId — reset so they start fresh
		if (
			!localStorage.getItem(PLAYER_ID_KEY) &&
			localStorage.getItem("jurassicEscapeHighScore")
		) {
			localStorage.removeItem("jurassicEscapeHighScore");
		}
		this.playerId = this.getOrCreatePlayerId();
	}

	private getOrCreatePlayerId(): string {
		let id = localStorage.getItem(PLAYER_ID_KEY);
		if (!id) {
			id = crypto.randomUUID();
			localStorage.setItem(PLAYER_ID_KEY, id);
		}
		return id;
	}

	private async request(
		method: "GET" | "POST",
		body?: object,
	): Promise<LeaderboardResponse | null> {
		if (!this.apiUrl) return null;
		try {
			const res = await fetch(this.apiUrl, {
				method,
				...(body && {
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				}),
				signal: AbortSignal.timeout(TIMEOUT_MS),
			});
			if (!res.ok) return null;
			return await res.json();
		} catch {
			return null;
		}
	}

	isAvailable(): boolean {
		return !!this.apiUrl;
	}

	async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
		const data = await this.request("GET");
		if (data) this.cache = data.entries;
		return this.cache || [];
	}

	async recordPlay(): Promise<void> {
		await this.request("POST", { playerId: this.playerId });
	}

	async submitScore(
		initials: string,
		score: number,
	): Promise<LeaderboardEntry[]> {
		const data = await this.request("POST", {
			initials: initials.toUpperCase(),
			score,
			playerId: this.playerId,
		});
		if (data) this.cache = data.entries;
		return this.cache || [];
	}

	getSavedInitials(): string {
		return localStorage.getItem(INITIALS_KEY) || "";
	}

	saveInitials(initials: string): void {
		localStorage.setItem(INITIALS_KEY, initials.toUpperCase());
	}

	qualifies(score: number): boolean {
		if (score <= 0) return false;
		if (!this.cache) return true;
		if (this.cache.length < 20) return true;
		const lowestScore = this.cache[this.cache.length - 1]?.score ?? 0;
		return score > lowestScore;
	}
}
