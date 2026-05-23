import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/**
 * Pi extension: read_tweet tool
 *
 * Fetches tweet content from X/Twitter URLs using the fxtwitter API (no auth required).
 * Supports regular tweets, quote tweets, threads, and X articles.
 */

interface FxAuthor {
	name: string;
	screen_name: string;
	followers: number;
	description: string;
	verified: boolean;
}

interface FxMedia {
	all?: {
		type: string;
		url: string;
		thumbnail_url?: string;
		alt_text?: string;
		width?: number;
		height?: number;
		duration?: number;
	}[];
	photos?: { url: string; alt_text?: string; width?: number; height?: number }[];
	videos?: { url: string; thumbnail_url?: string; width?: number; height?: number; duration?: number }[];
}

interface FxArticleBlock {
	text: string;
	type: string;
	inlineStyleRanges?: { style: string; offset: number; length: number }[];
	data?: { urls?: { text: string; fromIndex: number; toIndex: number }[] };
}

interface FxArticle {
	title: string;
	preview_text?: string;
	content?: {
		blocks?: FxArticleBlock[];
	};
}

interface FxTweet {
	url: string;
	id: string;
	text: string;
	author: FxAuthor;
	created_at: string;
	likes: number;
	retweets: number;
	replies: number;
	views: number;
	bookmarks?: number;
	quotes?: number;
	lang?: string;
	media?: FxMedia;
	quote?: FxTweet;
	replying_to?: string;
	replying_to_status?: string;
	article?: FxArticle;
	is_note_tweet?: boolean;
	community_note?: { text?: string } | null;
	poll?: { choices: { label: string; count: number; percentage: number }[]; total_votes: number; ends_at: string };
}

function extractTweetInfo(url: string): { username: string; tweetId: string } | null {
	// Handles x.com, twitter.com, fxtwitter.com, vxtwitter.com, fixupx.com URLs
	const match = url.match(/(?:x\.com|twitter\.com|fxtwitter\.com|vxtwitter\.com|fixupx\.com)\/([^/]+)\/status\/(\d+)/);
	if (!match) return null;
	return { username: match[1], tweetId: match[2] };
}

function formatArticle(article: FxArticle): string {
	const parts: string[] = [];
	parts.push(`\n--- Article: ${article.title} ---\n`);

	if (article.content?.blocks) {
		for (const block of article.content.blocks) {
			if (!block.text || block.text.trim() === "") continue;

			switch (block.type) {
				case "header-one":
					parts.push(`# ${block.text}`);
					break;
				case "header-two":
					parts.push(`## ${block.text}`);
					break;
				case "header-three":
					parts.push(`### ${block.text}`);
					break;
				case "blockquote":
					parts.push(`> ${block.text}`);
					break;
				case "code-block":
					parts.push(`\`\`\`\n${block.text}\n\`\`\``);
					break;
				case "ordered-list-item":
					parts.push(`1. ${block.text}`);
					break;
				case "unordered-list-item":
					parts.push(`- ${block.text}`);
					break;
				case "atomic":
					// Usually embedded media, skip
					break;
				default:
					parts.push(block.text);
					break;
			}
		}
	} else if (article.preview_text) {
		parts.push(article.preview_text);
	}

	return parts.join("\n");
}

function formatMedia(media: FxMedia): string {
	const parts: string[] = [];
	const items = media.all ?? [];

	for (const item of items) {
		if (item.type === "photo") {
			const alt = item.alt_text ? ` (alt: ${item.alt_text})` : "";
			const size = item.width && item.height ? ` [${item.width}x${item.height}]` : "";
			parts.push(`[Image${size}${alt}]: ${item.url}`);
		} else if (item.type === "video" || item.type === "gif") {
			const dur = item.duration ? ` ${Math.round(item.duration)}s` : "";
			const size = item.width && item.height ? ` [${item.width}x${item.height}]` : "";
			parts.push(`[${item.type === "gif" ? "GIF" : "Video"}${size}${dur}]: ${item.url}`);
		}
	}

	// Fallback if .all is missing
	if (items.length === 0) {
		for (const photo of media.photos ?? []) {
			const alt = photo.alt_text ? ` (alt: ${photo.alt_text})` : "";
			parts.push(`[Image${alt}]: ${photo.url}`);
		}
		for (const video of media.videos ?? []) {
			parts.push(`[Video]: ${video.url}`);
		}
	}

	return parts.join("\n");
}

function formatTweet(tweet: FxTweet, depth = 0): string {
	const indent = depth > 0 ? "  ".repeat(depth) : "";
	const prefix = depth > 0 ? `${indent}> ` : "";
	const parts: string[] = [];

	// Author line
	const verified = tweet.author.verified ? " ✓" : "";
	parts.push(`${prefix}@${tweet.author.screen_name} (${tweet.author.name}${verified})`);
	parts.push(`${prefix}${tweet.created_at}`);

	if (tweet.replying_to) {
		parts.push(`${prefix}Replying to @${tweet.replying_to}`);
	}

	parts.push("");

	// Tweet text
	if (tweet.text) {
		for (const line of tweet.text.split("\n")) {
			parts.push(`${prefix}${line}`);
		}
	}

	// Article (X long-form posts)
	if (tweet.article) {
		parts.push(formatArticle(tweet.article));
	}

	// Media
	if (tweet.media) {
		const mediaStr = formatMedia(tweet.media);
		if (mediaStr) {
			parts.push("");
			for (const line of mediaStr.split("\n")) {
				parts.push(`${prefix}${line}`);
			}
		}
	}

	// Poll
	if (tweet.poll) {
		parts.push("");
		parts.push(`${prefix}Poll (${tweet.poll.total_votes} votes):`);
		for (const choice of tweet.poll.choices) {
			parts.push(`${prefix}  ${choice.label}: ${choice.percentage}% (${choice.count})`);
		}
	}

	// Community note
	if (tweet.community_note?.text) {
		parts.push("");
		parts.push(`${prefix}Community Note: ${tweet.community_note.text}`);
	}

	// Engagement
	parts.push("");
	const stats = [
		`${tweet.likes} likes`,
		`${tweet.retweets} retweets`,
		`${tweet.replies} replies`,
		`${tweet.views} views`,
	];
	if (tweet.bookmarks) stats.push(`${tweet.bookmarks} bookmarks`);
	if (tweet.quotes) stats.push(`${tweet.quotes} quotes`);
	parts.push(`${prefix}${stats.join(" | ")}`);

	// Quote tweet
	if (tweet.quote) {
		parts.push("");
		parts.push(`${prefix}--- Quoted tweet ---`);
		parts.push(formatTweet(tweet.quote, depth + 1));
	}

	return parts.join("\n");
}

export default function xReaderExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "read_tweet",
		label: "Read Tweet",
		description:
			"Fetch and read the content of an X/Twitter post given its URL. Returns the tweet text, author, date, engagement stats, media descriptions, articles, and quoted tweets.",
		promptSnippet: "Fetch and read X/Twitter post content from a URL",
		promptGuidelines: [
			"Use read_tweet when the user shares an x.com or twitter.com URL and you need to see the tweet content.",
		],
		parameters: Type.Object({
			url: Type.String({ description: "X/Twitter post URL (x.com or twitter.com)" }),
		}),

		async execute(_toolCallId, params, signal) {
			const info = extractTweetInfo(params.url);
			if (!info) {
				throw new Error(
					`Invalid tweet URL: ${params.url}. Expected format: https://x.com/username/status/1234567890`,
				);
			}

			const apiUrl = `https://api.fxtwitter.com/${info.username}/status/${info.tweetId}`;

			const response = await fetch(apiUrl, { signal: signal ?? undefined });
			if (!response.ok) {
				throw new Error(`fxtwitter API returned ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as { code: number; message: string; tweet?: FxTweet };

			if (data.code !== 200 || !data.tweet) {
				throw new Error(`Tweet not found or unavailable. API response: ${data.message}`);
			}

			const formatted = formatTweet(data.tweet);

			return {
				content: [{ type: "text" as const, text: formatted }],
				details: {
					tweetId: data.tweet.id,
					author: data.tweet.author.screen_name,
					url: data.tweet.url,
				},
			};
		},
	});
}
