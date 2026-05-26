# 📺 TV-Watchlist — TV Schedule Tracker

A beautiful, fully self-contained TV show tracker. Search from a built-in database of 65 shows, look up any show live on the internet, organize shows into two tabs, drag to reorder, and track next-season return dates — all in a single HTML file with no account, no API keys, and no installation required.

🔗 **Live app:** <a href="https://davidfliesen.github.io/tv-watchlist" target="_blank">davidfliesen.github.io/tv-watchlist</a>

-----

## ✨ Features

### 🔍 Show Search & Lookup

- **65-show built-in database** — instant results for popular shows with all details pre-filled
- **Live internet search** — automatically queries the free [TVmaze API](https://www.tvmaze.com/api) when a show isn’t found locally; works for virtually any TV show ever made, worldwide
- **Smart fuzzy search** — finds shows from partial names or keywords, no exact spelling required
- **Two-tier results** — local “In Database” results appear instantly; “Found Online 🌐” internet results load automatically after a short pause
- **Duplicate detection** — if you try to add a show already on your list, the app warns you and directs you to the edit button instead of creating a duplicate
- **Manual entry fallback** — if a show isn’t found anywhere, enter all details yourself

### 📋 Show Cards

- **Colored show cards** — each show gets a unique color theme (purple, green, teal, gold, etc.) for easy visual scanning
- **Next Season banner** — prominent display of estimated return date, TBD, in production, or ended status with matching icons (📅 ⏳ 🎬 🏁)
- **Air day & time** — shows the broadcast day and ET time for network shows
- **Color-coded status badges** — Renewed (green), Airing (purple), In Production (blue), Final Season (gold), Ended (red), Cancelled (orange)
- **Similar show recommendations** — 3 suggestions per show based on genre; internet-found shows get genre-matched recommendations automatically from a 27-genre recommendation map

### 📝 Show Management

- **Two tabs** — **Now Watching** for shows you’re currently following, **Awaiting** for shows between seasons; count badge on each tab
- **Move between tabs** — every card has a **→ Awaiting** or **→ Watching** button to shift it with one tap
- **Tab & Position in edit** — open any card’s edit form to change its tab and exact position in the list from a dropdown; no dragging required
- **Add shows** — type a name and pick from search results; all fields populate automatically; new shows are added to whichever tab is active
- **Edit shows** — update any field, including tab and position, with the ✏️ button
- **Delete shows** — remove individual shows with the 🗑️ button and a confirmation prompt
- **Filter by network** — filter your list by any network or streaming service, independently per tab
- **Starts empty** — the app opens with a clean slate so you build your own personal list

### 🔀 Drag to Reorder

- **Desktop** — drag any card with the mouse to reorder it within the tab
- **iPad / iPhone** — tap and hold the **⠿ grab handle** in the top-right of any card, then drag to reorder; uses non-passive touch events so dragging doesn’t scroll the page
- Card order is saved automatically

### 💾 Data Management

- **Auto-saved** — every change is saved to browser `localStorage` automatically
- **Save Data** — exports your full watchlist as a dated `.json` backup file; on iPad/iPhone opens a copy-to-clipboard modal since iOS blocks file downloads
- **Upload Data** — restore any previously saved `.json` file to reload your watchlist
- **Clear All** — wipe your entire watchlist with a confirmation prompt and a reminder to save first

### 🔍 View Controls

- **Zoom** — − / 100% / + bar in the view toolbar to zoom the whole page from 60% to 150%; click the percentage to reset to 100%
- **Full Screen** — enters fullscreen using the browser API (desktop Chrome, Firefox, Safari 16.4+); falls back to CSS fixed-viewport fullscreen for Chrome on iOS and older browsers that block the API; button label updates to reflect state

### 📱 Design & Accessibility

- **Mobile & tablet friendly** — responsive grid layout works on phone, tablet, and desktop
- **Large readable text** — Inter font at comfortable sizes optimized for all screen sizes
- **Sticky toolbar** — tabs and network filter bar stay at the top while you scroll
- **Zero dependencies** — single `.html` file, no build step, no server, no npm

-----

## 🚀 Getting Started

### Option A — GitHub Pages (recommended)

1. Fork or clone this repository
1. Rename the file to `index.html` in the root of your repo (if not already)
1. Go to **Settings → Pages → Source → Deploy from branch → main**
1. Your app will be live at `https://yourusername.github.io/your-repo-name` within a minute

### Option B — Run locally

Double-click `tv-watchlist.html` (or `index.html`) in any modern browser — Chrome, Firefox, Safari, or Edge. No web server, no setup, no internet required (except for TVmaze show lookups).

### Option C — Share the file directly

Send the HTML file to anyone. They open it in their browser and it works immediately. Their watchlist is saved in their own browser, completely separate from yours.

-----

## 📋 How To Use

|Action                              |How                                                                                                    |
|------------------------------------|-------------------------------------------------------------------------------------------------------|
|**Switch tabs**                     |Click **Now Watching** or **Awaiting** at the top                                                      |
|**Move a show between tabs**        |Click **→ Awaiting** or **→ Watching** on any card                                                     |
|**Reorder cards (desktop)**         |Click and drag any card to a new position                                                              |
|**Reorder cards (iPad/iPhone)**     |Touch and hold the **⠿** handle on the card, then drag                                                 |
|**Change tab or position precisely**|Click ✏️ edit — Tab and Position dropdowns are at the top of the form                                   |
|**Add a show**                      |Click **+ ADD SHOW**, type a name — local results appear instantly, internet results load automatically|
|**Show found online**               |Results labeled **Found Online 🌐** pull live data from TVmaze                                          |
|**Show not found anywhere**         |Click “None of these — enter manually”                                                                 |
|**Duplicate show**                  |App warns you and points to the edit button instead                                                    |
|**Edit a show**                     |Click the ✏️ pencil icon on any card                                                                    |
|**Delete a show**                   |Click the 🗑️ trash icon and confirm                                                                     |
|**Filter by network**               |Click any network pill in the sticky toolbar (per tab)                                                 |
|**Zoom in/out**                     |Use − / 100% / + in the view toolbar; click 100% to reset                                              |
|**Full Screen**                     |Click **⛶ Full Screen** in the view toolbar                                                            |
|**Save Data**                       |Click 💾 **Save Data** — downloads `.json` on desktop; copy modal on iPad/iPhone                        |
|**Upload Data**                     |Click 📂 **Upload Data** — loads a previously saved `.json` file                                        |
|**Clear All**                       |Click 🗑️ **Clear All** — removes all shows after confirmation                                           |
|**Learn more**                      |Click 📖 **More About App** in the header                                                               |

-----

## 📂 Now Watching vs Awaiting

The two tabs let you split your list into shows you’re actively watching and shows you’re waiting on.

**Now Watching** — shows currently airing that you follow week to week.

**Awaiting** — shows between seasons, renewed but not yet returned, or ones you plan to start when they come back.

Three ways to move a show between tabs:

1. Tap **→ Awaiting** / **→ Watching** on the card for a one-tap move
1. Open ✏️ edit and change the **Tab** dropdown — also set the exact **Position** at the same time
1. Drag the card to reorder within the same tab (cross-tab moves use the button or edit form)

-----

## 🌐 Internet Show Lookup

When you type a show name that isn’t in the built-in database, the app automatically searches the internet via the [TVmaze API](https://www.tvmaze.com/api) after a short pause. Results appear in a **“Found Online 🌐”** section with a blue **WEB** badge.

Selecting an internet result auto-fills:

- Show title and network/streaming service
- Air day and time
- Current status (Airing, Ended, In Production, etc.)
- Show description
- **3 similar show recommendations** generated automatically from the show’s genre tags using a built-in 27-genre map covering Drama, Crime, Comedy, Thriller, Sci-Fi, Fantasy, Mystery, Western, Medical, Legal, Espionage, Religion, War, and more

The “Next Season” field is left for you to fill in, since TVmaze doesn’t track future season dates.

-----

## 🗄️ Built-in Show Database

The built-in database includes 65 popular shows across all major networks and streaming services. Searching these is instant and fully offline.

**Broadcast:** ABC, CBS, NBC, FOX  
**Streaming:** Netflix, Prime Video, Hulu, Max, Paramount+, Apple TV+, Disney+, Peacock, FX / Hulu

For any show not in the database, the live TVmaze search covers essentially every TV show ever broadcast or streamed anywhere in the world.

-----

## 💾 Data Management

Your watchlist saves automatically to browser `localStorage` on every change. The data toolbar provides three additional controls:

**💾 Save Data** — exports your full watchlist (both tabs, card order) as a dated `.json` file. On desktop this downloads directly. On **iPad/iPhone**, a modal opens with a **Copy to Clipboard** button — paste into Notes to keep a backup, then use Upload Data to restore.

**📂 Upload Data** — loads a previously saved `.json` file, replacing the current watchlist. The app validates the file before applying it.

**🗑️ Clear All** — removes every show after a two-step confirmation with a reminder to save first.

> **Tip:** Before switching browsers or clearing your list, use **Save Data** first. Tab assignments, card order, and all show data are preserved in the backup.

-----

## 🔒 Privacy

- **Your watchlist data never leaves your device** — stored only in your browser’s `localStorage`
- No analytics, no tracking, no cookies, no ads
- No account, no login, no email address required
- Show **search queries** go to the free [TVmaze API](https://www.tvmaze.com/api) — no personal data included, no account needed
- Clearing your browser’s site data will reset the watchlist to empty

-----

## 🛠️ Technical Details

|Item               |Detail                                                                                  |
|-------------------|----------------------------------------------------------------------------------------|
|Stack              |Vanilla HTML + CSS + React 18 (via CDN)                                                 |
|JSX transpilation  |Babel Standalone (via CDN)                                                              |
|Storage            |Browser `localStorage` (auto-save + manual export/import)                               |
|Fonts              |Google Fonts — Inter + Bebas Neue                                                       |
|Show database      |65 hardcoded shows with full metadata                                                   |
|Internet search    |[TVmaze API](https://www.tvmaze.com/api) — free, no key required, CORS-enabled          |
|Recommendations    |27-genre built-in map for genre-matched suggestions                                     |
|Tabs               |Now Watching / Awaiting — stored per show, persisted in localStorage                    |
|Drag & drop        |HTML5 drag events (desktop) + non-passive touch events on ⠿ handle (iPad/iPhone)        |
|Fullscreen         |Real Fullscreen API (desktop) + webkit prefix + CSS fixed-viewport fallback (iOS Chrome)|
|iOS save           |Copy-to-clipboard modal fallback when browser blocks file downloads                     |
|Tab & Position edit|Dropdowns in edit form for precise tab switching and list positioning                   |
|Zoom               |CSS `zoom` property, 60%–150% in 10% steps                                              |
|External calls     |Google Fonts (cosmetic only) + TVmaze API (show search only)                            |
|File size          |~89 KB (single file, everything included)                                               |
|Browser support    |Chrome, Firefox, Safari, Edge (any modern browser)                                      |
|Starts with        |Empty list — users build their own from scratch                                         |

-----

## 📄 License

MIT License — see [License Text](#-license-text) below.

This software is provided **“as is”**, without warranty of any kind. You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies for any purpose.

-----

## 👨‍💻 About the Developer

**David Fliesen** — *SunTzu* — Sole Proprietor, **Cibola Studios**  
Summerville, South Carolina

David is a Hybrid Generative AI Multimedia Developer with a background spanning U.S. Navy Combat Camera photojournalism, 20+ years in multimedia production, and DoD simulation and virtual agent development. He completed Purdue Online / Simplilearn’s Applied Generative AI Specialization and actively builds AI-powered applications across web, mobile, and immersive platforms.

**Background & Skills**

- 🎖️ U.S. Navy Combat Camera — photojournalism and visual media
- 🎮 DoD simulation & virtual agents — Army Research Lab, Sonalysts (MEDATAR, Sim Wars, Project MOSES, MMOWGLI)
- 🤖 Generative AI development — LangChain, LangGraph, Groq, OpenAI, Anthropic
- 🎵 Suno AI music creator
- 🎙️ Voice over artist & character animator
- 📰 Creator of *Sisters of Summerville* — a daily AI-generated comic strip

**Find David Online**

|Platform   |Link                                                                        |
|-----------|----------------------------------------------------------------------------|
|Portfolio  |[davidfliesen.github.io](https://davidfliesen.github.io)                    |
|LinkedIn   |[linkedin.com/in/fliesen](https://linkedin.com/in/fliesen)                  |
|GitHub     |[github.com/DavidFliesen](https://github.com/DavidFliesen)                  |
|Comic Strip|[sisters-of-summerville.github.io](https://sisters-of-summerville.github.io)|

-----

## 📜 License Text

```
MIT License

Copyright (c) 2026 David Fliesen / Cibola Studios

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```