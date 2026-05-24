# Hand Over Foot 🃏

<p align="center">
  <img src="assets/splash-reference.png" alt="Hand Over Foot opening screen" width="100%">
</p>

<p align="center">
  <strong>A polished browser card game inspired by classic Hand and Foot Canasta partner play.</strong><br>
  Built for GitHub Pages, desktop browsers, iPad, Android tablets, and mobile screens.
</p>

---

## ▶ Play Now on GitHub Pages

**https://davidfliesen.github.io/handoverfoot/**

---

## What This Version Changes

This rebuild separates the app into clean files instead of one large generated HTML file:

```text
index.html
styles.css
game.js
assets/
  felt-bg.png
  hand-badge.png
  foot-badge.png
  hero-logo.png
  splash-reference.png
```

The opening screen now uses the green card-table background, the hand badge, the foot badge, and a cropped hero logo image so the buttons are real HTML buttons instead of invisible hyperlink boxes over a flat image.

That should make the home screen much more stable across PC, Mac, Android, iPad, Chrome, Safari, Firefox, and Edge.

---

## Game Style

Hand Over Foot is built around four-player partner play:

- You and a robot partner
- Two robot opponents
- Four hands per game
- 11 cards in hand
- 11 cards in foot
- Team melds and books
- Robot-filled seats, inspired by virtual-world table play

---

## Rules Summary

### Turn

At the start of each turn, draw 2 from the stock or take the discard pile.

To take the discard pile:

- You need 2 natural cards matching the top discard.
- The top discard cannot be a 3.
- The top discard cannot be a wild card.
- Your team cannot already have a set or book of that face.
- Taking the pile gives you up to the top 7 cards.

### Opening Melds

Each team must first meld at least:

| Hand | Opening Meld |
|---|---:|
| 1 | 50 |
| 2 | 90 |
| 3 | 120 |
| 4 | 150 |

### Sets and Books

- Sets are 3 or more cards of the same rank from 4 through Ace.
- 2s and Jokers are wild.
- 3s cannot be melded.
- Wild-only sets are not allowed.
- A set with no wild cards is a red/clean set.
- A set with wild cards is a black/dirty set.
- A set becomes a book at 7 cards.
- Red books score +500.
- Black books score +300.

### Foot and Going Out

When a player empties their hand, they pick up their foot.

When a player empties their foot, the hand ends and scores are counted.

The settings screen includes an optional variant requiring one red book and one black book before going out.

### Scoring

| Cards | Points |
|---|---:|
| 4-7 | 5 |
| 8-K | 10 |
| A, 2 | 20 |
| Joker | 50 |
| Black 3 left in hand/foot | -300 |
| Red 3 left in hand/foot | -500 |

---

## Code Review Notes

### Improvements Made

- Rebuilt the home screen so it no longer depends on fragile invisible click overlays.
- Split the app into separate HTML, CSS, and JavaScript files.
- Added a more faithful partner-table structure with four seats.
- Updated discard pile behavior to draw up to 7 cards.
- Added rule checks for pile pickup, opening melds, sets, books, wilds, and 3 penalties.
- Added responsive breakpoints for desktop, tablet, and phone layouts.
- Added cache-busting query strings to CSS and JS references.

### Known Limitations

- Multiplayer networking is not included in this rebuild yet.
- Robot AI is functional but can still be improved with deeper strategy.
- Drag-and-drop card movement is not included yet; this version uses tap/click selection.
- Rule variations differ between families and tables, so some options may need additional settings later.

---

## Recommended Upload

Upload the contents of this folder directly into the root of your GitHub repository named:

```text
handoverfoot
```

The repository root should contain:

```text
index.html
styles.css
game.js
README.md
assets/
```

Then GitHub Pages should load at:

```text
https://davidfliesen.github.io/handoverfoot/
```

---

## Credits

Developed by **David Fliesen / Cibola Studios** with AI-assisted development.

