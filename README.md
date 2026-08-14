# Hand Over Foot v3.9.6

![Hand Over Foot](assets/splash-reference.jpg)

A modern browser-based single-player adaptation of the classic Hand and Foot Canasta card game.

Play online: https://davidfliesen.github.io/handoverfoot/

## Features

- Single Player vs AI
- Easy, Club, and Shark AI difficulty levels
- AI thinking pauses between actions
- Four-hand game structure
- Opening meld requirements
- Red and black books
- Fullscreen support
- Zoom controls
- Touch-friendly layout
- Subtle sound effects with controls
- Hamburger navigation menu
- Scores, Settings, How to Play, Source Code, and About Developer sections
- Optional Learning Tips mode for new players
- Help button with plain-English guidance and strategy tips

## How to Play

Hand Over Foot is a card-matching game. Build groups of matching cards, turn those groups into books, and empty your Hand and then your Foot before the AI opponent does.

Each hand has an opening meld requirement:

| Hand | Opening Meld |
|---|---:|
| 1 | 50 |
| 2 | 90 |
| 3 | 120 |
| 4 | 150 |

A set needs at least three matching cards. When a set reaches seven cards, it becomes a book.

- Clean/red books have no wild cards and score a 500-point bonus.
- Black books use wild cards and score a 300-point bonus.
- 2s and Jokers are wild.
- 3s cannot be used in sets.

## Safe Navigation

To prevent accidental loss of progress, clicking the **HAND over FOOT** title during a game displays a confirmation dialog before returning to the home screen.

## Developer

<img src="assets/developer.png" width="220" alt="David Fliesen">

**David Fliesen**

Veteran multimedia creator, AI developer, animator, educator, and browser-tool builder.

- Portfolio: https://davidfliesen.github.io/
- GitHub: https://github.com/DavidFliesen
- LinkedIn: https://www.linkedin.com/in/fliesen

## Version

Current Version: **3.9.6**


## Learning Tips

Learning Tips are off by default. They can be turned on from Settings to show small coaching prompts inside the Your Turn panel during play.

The Help button gives plain-English guidance for new players, including what to do next and simple strategy reminders such as when to think about keeping matching cards, when wild cards can be used, and why 3s are usually bad cards to keep.


## AI Timing Fix

AI turns now take one total thinking pause between 2 and 6 seconds, depending on difficulty, instead of stacking several pauses during the same turn.

The AI opening meld logic was also improved so the opponent can combine multiple legal sets to reach the required opening meld, just like the player can.


## Meld Sorting

Melds are now displayed in card value order, making it easier to see which ranks have already been played.


## AI Delay Restore

AI turns now use one guarded thinking timer per full turn. The opponent waits 2–6 seconds depending on difficulty, while preserving the v3.7.0 fix that prevents stacked delays and allows multi-set opening melds.


## v3.8.0 Gameplay Upgrade

- Added clear **Draw 2** and **Take 7** buttons to the bottom action bar while keeping both piles clickable.
- Locked card selection until the player completes the draw step.
- Added visual **Hand → Foot** progress for the player and AI opponent.
- Added a compact **Classic Rules** indicator and active-rules summary.
- Added a simple Game Style selector with Classic enabled and Kentucky marked for later verification.
- Added three simple options: adding to completed books, confirmation before going out, and Learning Help.
- Improved Shark AI discard safety, discard-pile judgment, wild-card use, and book-building priorities.
- Preserved the v3.7.0 single 2–6 second AI turn delay and multi-set opening logic.


## v3.9.0 Kentucky Rules

**Standard Rules remain the default.** New Game now also offers **Kentucky Rules**, adapted from the supplied four-player rule sheet for the current one-player-vs-AI game.

Kentucky mode includes:
- 13-card Hand and 13-card Foot.
- Two decks for the two-player digital adaptation (one deck per player, including Jokers).
- Draw 2 each turn.
- Red or black 3 freezes the discard pile.
- Discard-pile pickup requires the top card to be immediately playable with a natural pair, natural + wild, or an existing meld/book.
- Player can take the top card only or the top + next 7 (up to 8 total).
- One clean and one dirty book required to finish.
- Dirty books may never contain more wild cards than natural cards.
- Cards may be added to completed books.
- A playable card may not be discarded.
- Playing the whole Foot without a legal final discard puts the player into **Floating** status.
- Kentucky scoring: clean book 500, dirty book 300, going out 500; 4–9 = 5, 10–K = 10, A/2 = 20, Joker = 50, leftover black 3 = −5, leftover red 3 = −500.
- Completed books use their book value rather than also adding every card value inside the closed book.
- Four opening levels remain 50 / 90 / 120 / 150.

The physical four-player dealer-estimation bonus and partner permission are intentionally omitted from the single-player adaptation.


## v3.9.1 Layout Refinement

- Reduced the vertical height of the Hand/Foot status areas.
- Hand and Foot now sit side-by-side instead of stacking vertically.
- Applied the same compact treatment to the AI opponent status.
- Freed vertical space in the center of the board so Learning Help hints remain readable.
- Prevented center hints from being clipped on tablet layouts.


## v3.9.2 ARTEZIQ Branding

- Removed **Source Code** from the hamburger menu.
- Removed open-source wording.
- Refocused the About area on **ARTEZIQ**.
- Added the ARTEZIQ logo and website: https://arteziq.com
- Added the ARTEZIQ description: “where ART and IQ meet to make things EZ with AI-powered apps and creative technology that simplify everyday things.”


## v3.9.3 About ARTEZIQ Layout

- Updated the About ARTEZIQ modal layout so the logo appears first and the description sits below it for full readability.
- Switched the inner content cards to a black background for stronger contrast.
- Set body text to white and links/buttons to gold.
- Kept the developer section with LinkedIn and Portfolio links.


## v3.9.4 Global Footer

Added a bottom-center footer to every app view:

**ARTEZIQ • Hand Over Foot • v3.9.4**

The footer version should be updated with every future release.

## v3.9.5 Board Controls & Layout

- README title now includes the release version and will be updated with every release.
- Removed the hamburger menu.
- The top **Standard Rules / Kentucky Rules** button now opens the complete How to Play instructions for the active ruleset.
- Added **Settings** to the bottom action bar after Clear.
- Added **Scores** to the bottom action bar before Help.
- Removed the About Developer screen.
- Reformatted the AI Opponent status to mirror the player status with **Hand on the left and Foot on the right**, reducing its vertical height.
- Footer updated to **ARTEZIQ • Hand Over Foot • v3.9.5**.

## v3.9.6 Rules Comparison & Play Options

- The How to Play screen now includes **Standard Rules** and **Kentucky Rules** selector buttons so players can compare both rulesets regardless of whether they open instructions from the Play screen or the game board.
- Viewing another ruleset in How to Play does **not** change the active game.
- The currently active game style is identified when viewing rules during a game.
- **Simple Options** on the Play screen are now expanded by default so players can see their choices before dealing.
- Footer updated to **ARTEZIQ • Hand Over Foot • v3.9.6**.
