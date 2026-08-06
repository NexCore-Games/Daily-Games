# NexCore Games — Daily Game Bot

Automates what you've been doing manually: ships one new playable HTML5 game
per day, and keeps a live gallery page (`index.html`) listing all of them.

## How it works

- `scripts/generate-game.js` calls the Claude API with a rotating theme and
  writes a new self-contained `.html` game into `/games`.
- It updates `games/index.json` (machine-readable catalog) and regenerates
  `index.html` (the gallery page you can host with GitHub Pages).
- `.github/workflows/daily-game.yml` runs that script automatically every
  day at 03:00 UTC (~8:30 AM IST), commits, and pushes — zero manual work
  once it's set up.

## Setup (10 minutes, one time)

1. **Create a new repo** in your org, e.g. `NexCore-Games/daily-games`
   (or drop these files into an existing repo — doesn't have to be new).
2. **Copy these files in** preserving the folder structure:
   ```
   .github/workflows/daily-game.yml
   scripts/generate-game.js
   games/index.json
   README.md
   ```
3. **Get an Anthropic API key**: console.anthropic.com → API Keys → Create Key.
4. **Add it as a repo secret**: repo → Settings → Secrets and variables →
   Actions → New repository secret → name it `ANTHROPIC_API_KEY`, paste the key.
5. **Enable GitHub Pages** (optional but recommended so the gallery is a
   live site, not just a file): repo → Settings → Pages → Source: `main`
   branch, `/ (root)`. You'll get a URL like
   `https://nexcore-games.github.io/daily-games/`.
6. **Test it manually**: repo → Actions tab → "Daily Game Generator" →
   Run workflow. Check that a new file appears in `/games` and `index.html`
   updates.

After that it runs itself daily. No server, no cron machine, no cost beyond
the Anthropic API usage for one short generation call per day.

## Costs

Each run is one Claude API call (~8K output tokens max). At current Sonnet
pricing this is roughly a few cents per day — check
console.anthropic.com/settings/billing for exact current rates.

## Extending this later

- Swap the theme rotation for genre requests from Instagram/Discord polls,
  so the community picks tomorrow's game.
- Add a step that also posts the new game link to Discord/Twitter/Instagram
  via webhook, for a real daily-drop marketing loop.
- Add basic analytics (simple visit counter) to see which games actually
  get played, and double down on what works instead of generating blind.
