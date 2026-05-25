# Hand Over Foot 🃏

<p align="center">
  <img src="assets/splash-reference.png" alt="Hand Over Foot opening screen" width="100%">
</p>

A polished browser-based **Hand and Foot Canasta** style card game.

This version is intentionally simplified as a **two-player game: Player vs AI only**.

---

## 🎮 Play Online

👉 https://davidfliesen.github.io/handoverfoot/

---

## ✨ Features

- Player vs AI only
- Three AI skill levels: Easy, Club, and Shark
- AI turns take roughly 5 to 10 seconds so play feels more natural
- Clean two-player interface
- Larger, easier-to-read playing table
- Draw 2 and Take 7 cards appear at the far right of your hand
- Manual Sort button so you can inspect new cards first
- Red and black books
- Automatic going out when your foot is emptied
- Round winner splash screens
- Subtle audio effects with volume controls
- Runs fully in the browser from GitHub Pages

---

## 🃏 Basic Rules

Each player receives:

- 11 cards in Hand
- 11 cards in Foot

At the start of each turn, you must either:

1. Draw 2 cards from the stock pile  
   **or**
2. Take up to 7 cards from the discard pile

After drawing or taking the pile, you may:

- Set new melds
- Add cards to existing melds/books
- Discard 1 card to end your turn

---

## 🎯 Opening Meld Requirements

| Hand | Minimum Opening Meld |
|---|---:|
| 1 | 50 |
| 2 | 90 |
| 3 | 120 |
| 4 | 150 |

Your opening meld may combine multiple legal sets.

Example:

- 4 Kings = 40 points
- 4 Aces = 80 points
- Total = 120 points

That would open Hand 2, because Hand 2 requires 90.

---

## 📚 Sets and Books

- Sets must be 3 or more cards of the same rank from 4 through Ace.
- 2s and Jokers are wild.
- 3s cannot be melded.
- A set becomes a book at 7 cards.

Books:

- Red book / clean book: no wild cards, worth 500 points
- Black book / dirty book: includes wild cards, worth 300 points

---

## 💰 Card Values

| Cards | Points |
|---|---:|
| 3 through 9 | 5 |
| 10, Jack, Queen, King | 10 |
| Ace | 20 |
| 2 wild card | 20 |
| Joker | 50 |

Penalty cards left in hand or foot:

| Card | Penalty |
|---|---:|
| Black 3 | -300 |
| Red 3 | -500 |

---

## 🏆 Going Out

There is no Go Out button in this version.

Going out happens automatically when you empty your Foot.

When the hand ends:

- Scores are calculated
- A winner splash screen appears
- Next Hand appears if another hand remains

Highest score after four hands wins.

---

## 🤖 AI Timing

The AI is intentionally paced to feel more like playing at a table.

Approximate timing:

| Difficulty | Timing Feel |
|---|---|
| Easy | Slower and more casual |
| Club | Balanced |
| Shark | Faster and sharper |

AI turns take roughly 5 to 10 seconds depending on difficulty.

---

## 🔊 Audio

Hand Over Foot includes subtle browser-generated audio effects for:

- Card movement
- Drawing
- Melding
- Discarding
- Winning

Audio can be adjusted or disabled in Settings.

---

## 📂 Files

```text
index.html
styles.css
game.js
README.md
assets/
  splash-reference.png
  hof-logo.png
  hand-badge.png
  foot-badge.png
  felt-bg.png
```

---

## Notes

Multiplayer was removed from this stable version. It can be explored separately without affecting this playable AI build.

Created by David Fliesen / Cibola Studios.
