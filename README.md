# Sheridan Campus Quest

Standalone HTML/CSS/JavaScript version of the hidden-object challenge game.

## Included

- Firebase Email/Password authentication
- Guest mode
- Separate progress for every signed-in Firebase user
- Sequential level unlocking for registered players
- Sequential temporary level unlocking for guest players
- Replay any already-unlocked level
- Guest progression stored only in `sessionStorage`
- Guest scores are never submitted to Firebase leaderboards
- Existing MVC gameplay architecture
- 100-point scoring system
- Wrong-click penalties
- Three chances per challenge
- Stronger hint at 1 chance
- Correct-object highlight at 0 chances
- Timer and time penalty
- Random object selection support
- Shared Firestore leaderboard by level
- Overall leaderboard that adds each registered player's best score from every completed level
- Per-level ranking: best score first, faster time breaks ties
- Overall ranking: highest total score, then more completed levels, then faster combined best time
- Podium-style leaderboard UI
- Sheridan-inspired Double Blue visual theme
- GitHub Pages-friendly relative paths

## Flexible level system

The UI does not describe the game as having a fixed total number of levels.
Add future levels to `levels/manifest.js` and create the matching level folder.

Both registered players and guests follow the same sequential unlock path:

```text
Level 1 unlocked
Level 2 locked
Level 3 locked
...

Complete Level 1 → unlock Level 2
Complete Level 2 → unlock Level 3
...
```

Registered progression is stored in Firebase. Guest progression is temporary
and stays only in the current browser-tab session.

## Firestore layout

```text
users/{uid}
users/{uid}/games/sheridanCampusQuest

leaderboards/level-{id}/players/{uid}
```

Each signed-in player gets independent unlock/progress data. Each level keeps
one best leaderboard record per registered player.

The **Overall** leaderboard is calculated from those per-level best records, so
no duplicate overall-score document is required. For example:

```text
Level 1 best score: 100
Level 2 best score: 80
Overall score:      180
```

Leaderboard standings are publicly readable so guests can view them, but only
the authenticated owner can write that player's leaderboard record.

## Guest mode

Guest mode uses `sessionStorage` for both the temporary guest identity and the
guest's temporary progression.

Guest players:

- begin with only the first implemented level unlocked
- unlock the next level by completing the current level
- can replay any level already unlocked during the session
- keep temporary session best scores, times, and attempts while the tab remains open
- can view the shared leaderboard
- never submit a score to the leaderboard
- never create a Firebase progress document
- lose temporary progression when they exit guest mode or close the browser tab

## Leaderboard

The leaderboard now opens with an **Overall** view and also includes one tab for
each implemented level.

### Overall score

A registered player's overall score is the sum of their **best saved score** on
every level they have completed.

Example:

```text
Player A
Level 1: 100
Level 2: 80
Overall: 180
```

Other registered players and guest viewers can see that overall score on the
shared leaderboard.

## Pages

- `index.html` — sign in / create account / play as guest
- `home.html` — player dashboard + challenge selection
- `game/game.html?level=1` — gameplay
- `leaderboard.html` — overall + per-level shared leaderboard
