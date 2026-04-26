import {
	DynamoDBClient,
	QueryCommand,
	UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({});
const TABLE_NAME = "game-leaderboard";
const GAME_ID = "jurassic_escape";
const MAX_ENTRIES = 20;
const MAX_PLAUSIBLE_SCORE = 50000;
const VALID_DINOS = ["raptor", "ptero", "trex", "spino", "mosa", "allo"];

const ALLOWED_ORIGINS = [
	"https://taylormichaelhall.com",
	"http://localhost:5173",
];

function getCorsHeaders(event) {
	const origin = event?.headers?.origin || "";
	return {
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
			? origin
			: ALLOWED_ORIGINS[0],
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};
}

function response(statusCode, body, event) {
	return { statusCode, headers: getCorsHeaders(event), body: JSON.stringify(body) };
}

async function getLeaderboard() {
	const result = await dynamo.send(
		new QueryCommand({
			TableName: TABLE_NAME,
			KeyConditionExpression: "gameId = :g",
			ExpressionAttributeValues: { ":g": { S: GAME_ID } },
		}),
	);
	const items = result.Items || [];

	let totalPlays = 0;
	const entries = [];

	for (const item of items) {
		totalPlays += Number(item.plays?.N || 0);
		// Only include entries that have submitted a score
		if (item.score && item.initials) {
			entries.push({
				initials: item.initials.S,
				score: Number(item.score.N),
				date: item.date.S,
				...(item.dino?.S && { dino: item.dino.S }),
				...(item.glow?.BOOL && { glow: true }),
			});
		}
	}

	entries.sort((a, b) => b.score - a.score);
	return { entries: entries.slice(0, MAX_ENTRIES), totalPlays };
}

export async function handler(event) {
	const method = event.requestContext?.http?.method;

	if (method === "OPTIONS") {
		return response(200, {}, event);
	}

	if (method === "GET") {
		const { entries, totalPlays } = await getLeaderboard();
		return response(200, { entries, totalPlays }, event);
	}

	if (method === "POST") {
		let body;
		try {
			body = JSON.parse(event.body);
		} catch {
			return response(400, { error: "Invalid JSON" }, event);
		}

		const { initials, score, playerId, dino } = body;

		if (typeof playerId !== "string" || playerId.length === 0 || playerId.length > 64) {
			return response(400, { error: "Invalid playerId" }, event);
		}

		const key = {
			gameId: { S: GAME_ID },
			playerId: { S: playerId },
		};

		// Score submission: increment plays + conditionally update score in one call
		if (initials !== undefined && score !== undefined) {
			if (
				typeof initials !== "string" ||
				!/^[A-Z]{3}$/.test(initials)
			) {
				return response(400, { error: "Initials must be exactly 3 uppercase letters" }, event);
			}

			if (
				typeof score !== "number" ||
				!Number.isInteger(score) ||
				score < 1 ||
				score > MAX_PLAUSIBLE_SCORE
			) {
				return response(400, { error: "Invalid score" }, event);
			}

			try {
				await dynamo.send(
					new UpdateItemCommand({
						TableName: TABLE_NAME,
						Key: key,
						UpdateExpression: "SET score = :score, initials = :initials, #d = :date, dino = :dino ADD plays :one",
						ConditionExpression: "attribute_not_exists(score) OR score < :score",
						ExpressionAttributeNames: { "#d": "date" },
						ExpressionAttributeValues: {
							":score": { N: String(score) },
							":initials": { S: initials },
							":date": { S: new Date().toISOString() },
							":dino": { S: VALID_DINOS.includes(dino) ? dino : "raptor" },
							":one": { N: "1" },
						},
					}),
				);
			} catch (err) {
				if (err.name !== "ConditionalCheckFailedException") {
					throw err;
				}
				// Score wasn't higher, but still count the play
				await dynamo.send(
					new UpdateItemCommand({
						TableName: TABLE_NAME,
						Key: key,
						UpdateExpression: "ADD plays :one",
						ExpressionAttributeValues: { ":one": { N: "1" } },
					}),
				);
			}
		} else {
			// Play-only: just increment counter
			await dynamo.send(
				new UpdateItemCommand({
					TableName: TABLE_NAME,
					Key: key,
					UpdateExpression: "ADD plays :one",
					ExpressionAttributeValues: { ":one": { N: "1" } },
				}),
			);
		}

		const { entries, totalPlays } = await getLeaderboard();
		return response(200, { entries, totalPlays }, event);
	}

	return response(405, { error: "Method not allowed" }, event);
}
