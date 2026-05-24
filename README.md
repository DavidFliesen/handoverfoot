# Hand Over Foot 🃏

<p align="center">
  <img src="assets/hand-over-foot-hero.png" alt="Hand Over Foot opening screen" width="100%">
</p>

<p align="center">
  <strong>A polished browser card game inspired by classic Hand and Foot.</strong><br>
  Built for GitHub Pages, desktop browsers, iPad, iPhone, Android tablets, and modern phones.
</p>

---

## ▶ Play Now on GitHub Pages

**https://davidfliesen.github.io/handoverfoot/**

Your repository is named `handoverfoot`, so this is the correct GitHub Pages project URL.

---

## What This Version Includes

- New responsive home screen using the premium green felt artwork style
- Cleaner desktop, tablet, and mobile layout
- Solo play against AI
- Pass-and-play mode
- Four-round scoring
- Opening meld minimums of 50, 90, 120, and 150 points
- Hand and Foot piles, 11 cards each
- Clean, dirty, and wild books
- 2s and Jokers as wild cards, matching common Hand and Foot expectations
- 3s as penalty/blocking cards
- Improved AI difficulty settings
- GitHub Pages ready structure

---

## File Structure

```text
handoverfoot/
├── index.html
├── styles.css
├── game.js
├── README.md
└── assets/
    └── hand-over-foot-hero.png
```

Upload all of these files to the root of the `handoverfoot` repository.

---

## Rules Summary

Each player receives an 11-card Hand and an 11-card Foot. Players draw two cards or take the discard pile, build melds, complete seven-card books, and race to go out.

A player normally needs at least one clean book and one dirty book before going out. The game runs for four rounds, and the highest total score wins.

### Wild Cards

- 2s are wild
- Jokers are wild
- Wild cards can help build dirty books
- Seven wild cards form a wild book if enabled

### 3s

- 3s cannot be melded
- Red 3s are strong penalties
- Black 3s block the next player from taking the pile

---

## Deployment Notes

For GitHub Pages, make sure the repository root contains `index.html`. Then check:

`Settings → Pages → Deploy from branch → main → /root`

After GitHub finishes deployment, open:

**https://davidfliesen.github.io/handoverfoot/**

---

## Credits

Developed by **David Fliesen / Cibola Studios** with AI-assisted design and development.

Released as a browser-playable web app for GitHub Pages.
