# Hand Over Foot 🃏

<p align="center">
  <img src="assets/splash-reference.png" alt="Hand Over Foot opening screen" width="100%">
</p>

A polished browser-based **Hand and Foot Canasta** experience inspired by classic virtual-world tabletop games.

Built by David Fliesen / Cibola Studios.

---

## 🎮 Play Online

👉 https://davidfliesen.github.io/hand-over-foot/

No installs. No accounts. No subscriptions.

Playable directly in your browser on iPad, iPhone, Android, Mac, Windows, Linux, and ChromeOS.

---

## ✨ Features

- Beautiful casino-style green felt interface
- Classic Hand and Foot gameplay
- 4-player team format
- AI teammates and opponents
- Three AI difficulty levels
- AI players pause between actions so turns feel more natural
- Responsive tablet-friendly layout
- Zoom controls for large hands
- Red and black book scoring
- Hand + Foot gameplay system
- Round winner splash screens
- Subtle audio effects with volume controls
- Browser-based gameplay with no server required

---

## 🃏 Game Rules Overview

### Goal

Work with your partner to create melds and books while scoring more points than the opposing team over four hands.

### Starting the Game

Each player receives:

- 11 cards in their Hand
- 11 cards in their Foot

You must finish your hand before picking up your foot.

### Opening Meld Requirements

| Hand | Minimum Meld |
|---|---:|
| 1 | 50 |
| 2 | 90 |
| 3 | 120 |
| 4 | 150 |

Your opening meld may combine multiple legal sets.

Example:

- 4 Kings = 40
- 4 Aces = 60
- Total = 100, which is valid for Hand 2

### Turn Flow

On your turn:

1. Draw 2 cards from the stock pile  
   **or**
2. Take the top 7 cards from the discard pile

To take the discard pile:

- You need 2 natural matching cards
- The top discard cannot be a 3 or wild card

Then:

- Create sets
- Add to melds
- Discard 1 card to end your turn

---

## 📚 Sets & Books

### Natural / Red Books

- No wild cards
- Worth 500 points

### Wild / Black Books

- Contain wild cards
- Worth 300 points

Books are completed with 7 cards.

Wild cards:

- 2s
- Jokers

---

## 💰 Card Values

| Cards | Points |
|---|---:|
| 4–7 | 5 |
| 8–K | 10 |
| Aces & 2s | 20 |
| Jokers | 50 |

Penalty cards:

- Black 3s = -300
- Red 3s = -500

---

## 🏆 Going Out

You may go out after:

- Emptying your Hand
- Picking up and emptying your Foot

Once a player goes out:

- Scores are calculated
- Round winner splash screen appears
- Teams advance to the next hand

Highest score after 4 hands wins.

---

## 🔊 Audio

Hand Over Foot includes subtle browser-generated audio effects for:

- Card draws
- Card movement
- Melds
- Discards
- Victory sounds

Audio can be adjusted or disabled in Settings.

---

## 🤖 AI Timing

AI turns are intentionally paced so the game feels less instant and more like playing at a table.

Approximate robot pacing:

| Difficulty | Timing Feel |
|---|---|
| Easy | Slower, more casual |
| Club | Balanced |
| Shark | Faster, more decisive |

AI players take between about 2 and 5 seconds depending on move difficulty and selected AI level.

---

## 🛠 Technology

Built with:

- HTML5
- CSS3
- Vanilla JavaScript
- Responsive browser-first design

No frameworks. No backend servers. No tracking.

---

## 📂 Repository Structure

```text
/
├── index.html
├── styles.css
├── game.js
├── README.md
├── assets/
│   ├── splash-reference.png
│   ├── hof-logo.png
│   ├── hand-badge.png
│   ├── foot-badge.png
│   └── felt-bg.png
```

---

## 🚀 GitHub Pages Deployment

This project is designed for GitHub Pages hosting.

Main entry point:

```text
index.html
```

Recommended repository name:

```text
hand-over-foot
```

---

## 👤 Creator

Created by David Fliesen  
Cibola Studios

Portfolio:  
https://davidfliesen.github.io/
