# Hand Over Foot 🃏

> A classic rummy-style card game for 1–2 players — playable in any modern browser on tablet, phone, or desktop.

-----

## Overview

**Hand Over Foot** is a browser-based implementation of the Hand and Foot card game, built as a single self-contained HTML file. No installation, no server, no app store required. Play solo against an AI opponent at one of three difficulty levels, or invite a friend to play online via a peer-to-peer invite link — all from GitHub Pages.

The game is played over **4 rounds**. Players build melds, complete books, and race to go out while avoiding the penalty 3 cards. The player with the highest total score after all four rounds wins.

-----

## Features

- ✅ **1-player vs AI** — three difficulty levels (Easy / Club / Shark)
- ✅ **2-player online multiplayer** — peer-to-peer via invite link (no server, works on GitHub Pages)
- ✅ Fully responsive — optimized for iPad, Android tablets, phones, and desktop
- ✅ 4 complete rounds with increasing minimum meld requirements
- ✅ 3s as penalty cards: Red 3s (−200 pts) and Black 3s (−100 pts)
- ✅ 2s as the only wild cards; Jokers are high-value natural cards
- ✅ Clean, Dirty, and Wild book detection with visual badges
- ✅ Foot pile auto-pickup when Hand is exhausted
- ✅ Full round-by-round scoring with end-of-round summary
- ✅ In-game How to Play and Scoring reference guides
- ✅ Works offline after initial load (Google Fonts only require internet)

-----

## AI Difficulty Levels

|Level         |Name              |Emoji|Description                                                                                                                                                                                                                            |
|--------------|------------------|-----|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|🟢 Easy        |**Grandma’s Pace**|😊    |Draws from stock every turn — never takes the pile. Melds only when 3+ naturals are available. Discards randomly. No wild card strategy. Great for learning the rules.                                                                 |
|🟡 Intermediate|**Club Player**   |🃏    |Completes existing melds before starting new ones. Takes the discard pile when holding 2+ matching naturals. Dumps 3s first. Uses wilds to finish near-complete melds. Goes out when conditions are met.                               |
|🔴 Advanced    |**Card Shark**    |🦈    |Tracks your meld ranks and avoids discarding cards you need. Takes the pile aggressively. Saves wilds for book completion. Plays Black 3s to block you when you’re close to going out. Targets going out quickly over maximizing score.|

-----

## How to Play

### Setup

- Each player is dealt **11 cards** as their **Hand** and **11 cards** face-down as their **Foot**
- 5 standard decks (260 cards + 10 Jokers = 270 total) are shuffled together
- One card is flipped to start the discard pile (re-flipped if it’s a wild 2)

### Turn Structure

On your turn, **first do one of these**:

|Action       |Requirement                                                                                                         |
|-------------|--------------------------------------------------------------------------------------------------------------------|
|**Draw 2**   |Take 2 cards from the stock pile                                                                                    |
|**Take Pile**|Pick up the entire discard pile — requires 2 matching natural cards in hand for the top card; top card cannot be a 3|

Then **meld** and/or **add to melds** as desired, and finally **discard** one card to end your turn.

### Melds

- A meld is **3–7 cards of the same rank**
- **Natural cards** (any rank except 2s and 3s) must always **outnumber wild cards (2s)**
- Each rank can only have one meld per player on the table
- Jokers are **natural cards** worth 50 pts — they meld at face value

### Books (Completed Melds)

A meld of exactly **7 cards** becomes a book:

|Type            |Description                          |Bonus     |
|----------------|-------------------------------------|----------|
|🔵 **Clean Book**|7 natural cards, no wilds            |+500 pts  |
|🟣 **Dirty Book**|Has wild 2s (naturals still majority)|+300 pts  |
|🟠 **Wild Book** |All wild 2s                          |+1,500 pts|

### Card Rules

#### Wild Cards

Only **2s** are wild cards. They can substitute for any natural rank in a meld, as long as naturals outnumber them.

#### 3s — Penalty Cards ⚠️

**3s cannot be melded.** They are penalty cards you want out of your hand as fast as possible.

|Card       |Effect                                                                                                                              |
|-----------|------------------------------------------------------------------------------------------------------------------------------------|
|**Red 3**  |−200 pts at end of round if left in hand or foot                                                                                    |
|**Black 3**|−100 pts at end of round if left in hand or foot. Discarding a Black 3 also **blocks the next player** from taking the discard pile.|

#### Jokers

Jokers are **natural cards** worth 50 pts each. They can be melded normally in a meld of their own rank or treated as any natural card. They are **not wild**.

### The Foot Pile

When your Hand is empty, you automatically pick up your **Foot** pile and continue playing.

### Going Out

To end a round a player must:

1. Be playing from their **Foot** pile
1. Have at least **1 clean book** and **1 dirty book** completed
1. Discard their final card (or meld it)

Going out earns a **+100 point bonus**.

-----

## Scoring

Points are tallied at the end of each round:

**Add:**

- Card values in all melds (complete and incomplete)
- Clean book bonus: +500 per book
- Dirty book bonus: +300 per book
- Wild book bonus: +1,500 per book
- Going out bonus: +100

**Subtract:**

- Face value of cards remaining in Hand and Foot
- Red 3 penalty: −200 per card
- Black 3 penalty: −100 per card

### Card Values

|Cards            |Points     |
|-----------------|-----------|
|3, 4, 5, 6, 7    |5 pts each |
|8, 9, 10, J, Q, K|10 pts each|
|Ace, 2           |20 pts each|
|Joker            |50 pts each|

### Minimum First Meld by Round

|Round|Minimum|
|-----|-------|
|1    |50 pts |
|2    |90 pts |
|3    |120 pts|
|4    |150 pts|

-----

## Multiplayer (Invite Link)

Hand Over Foot supports **peer-to-peer online multiplayer** using [PeerJS](https://peerjs.com/) — no server required, fully compatible with GitHub Pages.

### How to Host

1. Open the game and tap **Play Now → Host Multiplayer**
1. A unique invite link is generated (e.g. `https://yourusername.github.io/hand-over-foot/?join=abc123xyz`)
1. Copy and share the link with your opponent via text, email, or any messaging app
1. When they open the link and join, the game starts automatically

### How to Join

- Open the invite link directly — the game auto-detects the `?join=` parameter and prompts you to connect
- Or tap **Play Now → Join with Code** and paste the link or room code manually

### Notes

- Both players must be online simultaneously
- The host (Player 1) always goes first
- Game state syncs automatically on every action
- If the connection drops, both players will need to rejoin

-----

## Controls

|Button       |Action                                                  |
|-------------|--------------------------------------------------------|
|**Draw 2**   |Draw 2 cards from the stock pile                        |
|**Take Pile**|Pick up the full discard pile                           |
|**New Meld** |Start a new meld with your selected cards               |
|**Add**      |Add selected cards to an existing meld                  |
|**Discard**  |Discard the selected card and end your turn             |
|**Go Out**   |End the round (enabled only when all conditions are met)|
|**⌂**        |Return to the home screen                               |

**Tips:**

- Tap directly on a meld on the table to add your selected cards to it
- 3s sort to the front of your hand as a reminder to discard them
- Hover/long-press a 3 for a tooltip showing the penalty

-----

## File Structure

```
hand-over-foot.html    Single self-contained game file
README.md              This file
```

All game logic, styles, and markup live in one HTML file. Zero build tools, zero frameworks, zero runtime dependencies beyond an internet connection for fonts and the PeerJS CDN.

-----

## Technical Notes

- **Vanilla HTML5 / CSS3 / JavaScript** — no frameworks
- **CSS `clamp()`** — cards and UI scale fluidly across screen sizes
- **`touch-action: manipulation`** — eliminates 300ms tap delay on Android
- **`-webkit-overflow-scrolling: touch`** — smooth horizontal card row scrolling on iOS
- **`user-scalable=no`** — prevents accidental pinch-zoom during play
- **PeerJS 1.5.2** via CDN — WebRTC peer-to-peer multiplayer signaling
- **Google Fonts** — Oswald, Playfair Display, DM Mono (loaded via CDN)

### Tested On

- iPad Safari
- Android tablet (Chrome)
- iPhone Safari
- Desktop Chrome, Firefox, Edge

-----

## IP & Trademark Notes

**Hand Over Foot** is an original title. Prior to use, a USPTO trademark search was conducted for Class 028 (Games and Sporting Goods). No active registration exists for the exact phrase “Hand Over Foot” in this class.

The underlying game mechanics are based on the traditional folk card game **Hand and Foot**, a variant of Canasta. Under U.S. copyright law, game mechanics and rules are not protectable expression (*DaVinci Editrice S.r.l. v. Ziko Games*, S.D. Tex. 2012). All code, UI design, AI logic, branding, and original rule variations in this project are original works.

**Rule variations unique to this implementation:**

- Only 2s are wild (Jokers are naturals)
- 3s are penalty cards (Red 3 = −200, Black 3 = −100) rather than bonus cards
- Three-tier AI opponent system (Easy / Club / Shark)

-----

## License

Released under the **MIT License**.

```
MIT License

Copyright (c) 2025 Cibola Studios

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
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

-----

## Credits

Developed by **David Fliesen / Cibola Studios**
Built with Claude AI (Anthropic) — Hybrid Generative AI Multimedia Development

Portfolio: [davidfliesen.github.io](https://davidfliesen.github.io)
LinkedIn: [linkedin.com/in/fliesen](https://linkedin.com/in/fliesen)

-----

*“Hand over Foot — a classic rummy card game, reimagined.”*