#!/usr/bin/env node
/**
 * NexCore Games — Daily Game Generator
 * ------------------------------------
 * Calls the Gemini API to generate one new, self-contained, playable
 * HTML5 canvas/JS game every time it runs. Designed to be triggered daily
 * by a GitHub Actions cron job (see .github/workflows/daily-game.yml).
 *
 * What it does each run:
 *  1. Picks a genre/theme (rotates so games don't repeat within a cycle).
 *  2. Asks Gemini to generate a complete, single-file HTML game.
 *  3. Saves it to /games/<date>-<slug>.html
 *  4. Regenerates /games/index.json and the gallery /index.html
 *
 * Requires: GEMINI_API_KEY env var (set as a GitHub Actions secret).
 */

const fs = require("fs");
const path = require("path");

const GAMES_DIR = path.join(__dirname, "..", "games");
const INDEX_JSON = path.join(GAMES_DIR, "index.json");
const GALLERY_HTML = path.join(__dirname, "..", "index.html");

const THEMES = [
  "a fast-paced reflex/tapping arcade game",
  "a top-down dodge-the-obstacles survival game",
  "a physics-based puzzle game with gravity or momentum",
  "a memory/pattern-matching game",
  "a runner game with increasing speed and obstacles",
  "a tower-defense-lite game on a small grid",
  "a color/shape sorting speed game",
  "a maze navigation game with a time limit",
  "a rhythm/timing based tapping game",
  "a simple roguelike with one room and one enemy type",
  "a stacking/balance game",
  "a bubble-shooter style matching game",
];

function pickTheme() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const base = THEMES[dayOfYear % THEMES.length];
  return base;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

async function callGemini(theme) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const systemPrompt = `You are a senior HTML5 game developer working for NexCore Games, an Indian indie game studio. You write complete, single-file, dependency-free browser games (HTML+CSS+JS in one file, using <canvas> where relevant). Rules:
- Output ONLY the raw HTML file content, starting with <!DOCTYPE html>. No markdown fences, no commentary.
- The game must be fully playable with mouse/touch AND keyboard where relevant, mobile-responsive, and have a visible score/restart UI.
- Include a short in-page title and 1-line instructions.
- Use a distinct, modern visual style (gradients, rounded UI, a coherent color palette) — not default browser styling.
- Keep total file size reasonable (aim under 15KB of code).
- Do not use any external libraries, fonts, or network requests — everything inline.
- Add a small "NexCore Games" footer credit line in the page.`;

  const userPrompt = `Create a brand new original browser game: ${theme}. Give it a catchy 2-3 word name. Make sure it's genuinely fun and has a clear win/lose/score loop, not just a tech demo.`;

  const model = "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 8000,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const candidate = data.candidates && data.candidates[0];
  const part =
    candidate && candidate.content && candidate.content.parts
      ? candidate.content.parts.find((p) => p.text)
      : null;
  if (!part) throw new Error("No text content returned by the model.");

  let html = part.text.trim();
  html = html.replace(/^```html\s*/i, "").replace(/```$/i, "").trim();

  return html;
}

function extractTitle(html, fallback) {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match ? match[1].trim() : fallback;
}

async function main() {
  const theme = pickTheme();
  console.log(`[nexcore-daily-game] Generating game for theme: ${theme}`);

  const html = await callGemini(theme);

  const today = new Date().toISOString().slice(0, 10);
  const roughTitle = extractTitle(html, theme.split(" ").slice(0, 3).join(" "));
  const slug = slugify(roughTitle) || slugify(theme);
  const filename = `${today}-${slug}.html`;
  const filepath = path.join(GAMES_DIR, filename);

  if (!fs.existsSync(GAMES_DIR)) fs.mkdirSync(GAMES_DIR, { recursive: true });
  fs.writeFileSync(filepath, html, "utf8");
  console.log(`[nexcore-daily-game] Wrote ${filepath}`);

  let index = [];
  if (fs.existsSync(INDEX_JSON)) {
    try {
      index = JSON.parse(fs.readFileSync(INDEX_JSON, "utf8"));
    } catch {
      index = [];
    }
  }
  index.unshift({
    title: roughTitle,
    file: `games/${filename}`,
    date: today,
    theme,
  });
  fs.writeFileSync(INDEX_JSON, JSON.stringify(index, null, 2), "utf8");

  regenerateGallery(index);

  console.log(`[nexcore-daily-game] Done. Total games in catalog: ${index.length}`);
}

function regenerateGallery(index) {
  const cards = index
    .map(
      (g) => `      <a class="card" href="${g.file}" target="_blank" rel="noopener">
        <div class="card-title">${escapeHtml(g.title)}</div>
        <div class="card-meta">${g.date} · ${escapeHtml(g.theme)}</div>
      </a>`
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>NexCore Games — Daily Game Catalog</title>
<style>
  :root { --bg:#0f1117; --card:#171a23; --accent:#7c5cff; --text:#f2f2f7; --muted:#9a9aa8; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); }
  header { padding: 48px 24px 24px; text-align:center; }
  header h1 { margin:0 0 8px; font-size: 2.2rem; background: linear-gradient(90deg,#7c5cff,#ff5ca8); -webkit-background-clip:text; background-clip:text; color:transparent; }
  header p { color: var(--muted); margin:0; }
  .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap:16px; padding: 24px; max-width: 1100px; margin: 0 auto; }
  .card { background: var(--card); border-radius: 14px; padding: 20px; text-decoration:none; color: var(--text); border: 1px solid #262a38; transition: transform .15s ease, border-color .15s ease; }
  .card:hover { transform: translateY(-4px); border-color: var(--accent); }
  .card-title { font-weight:600; font-size:1.05rem; margin-bottom:6px; }
  .card-meta { color: var(--muted); font-size:0.85rem; }
  footer { text-align:center; padding: 40px; color: var(--muted); font-size:0.85rem; }
</style>
</head>
<body>
  <header>
    <h1>NexCore Games</h1>
    <p>A new browser game, generated and shipped every day. ${index.length} games and counting.</p>
  </header>
  <div class="grid">
${cards}
  </div>
  <footer>Built by NexCore Games · Automated daily via Gemini API + GitHub Actions</footer>
</body>
</html>
`;

  fs.writeFileSync(GALLERY_HTML, html, "utf8");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((err) => {
  console.error("[nexcore-daily-game] FAILED:", err.message);
  process.exit(1);
});
