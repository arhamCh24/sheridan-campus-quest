import {
  db,
} from "./FirebaseConfig.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const GAME_ID = "sheridanCampusQuest";

/* =========================================================
   HELPERS
========================================================= */

function leaderboardCollection(levelId) {
  return collection(
    db,
    "leaderboards",
    `level-${Number(levelId)}`,
    "players",
  );
}

function leaderboardPlayerRef(levelId, userId) {
  return doc(
    db,
    "leaderboards",
    `level-${Number(levelId)}`,
    "players",
    userId,
  );
}

function normalizeTime(value) {
  const numeric = Number(value);

  return Number.isFinite(numeric) && numeric >= 0
    ? numeric
    : null;
}

function isBetterRun(
  newScore,
  newTime,
  oldScore,
  oldTime,
) {
  if (newScore > oldScore) {
    return true;
  }

  if (newScore < oldScore) {
    return false;
  }

  if (newTime === null) {
    return false;
  }

  if (oldTime === null) {
    return true;
  }

  return newTime < oldTime;
}

function sortLeaderboard(rows) {
  return [...rows].sort((a, b) => {
    const scoreDifference =
      (Number(b.bestScore) || 0) -
      (Number(a.bestScore) || 0);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    const aTime = normalizeTime(a.bestTimeSeconds);
    const bTime = normalizeTime(b.bestTimeSeconds);

    if (aTime === null && bTime === null) {
      return String(a.displayName || "")
        .localeCompare(String(b.displayName || ""));
    }

    if (aTime === null) {
      return 1;
    }

    if (bTime === null) {
      return -1;
    }

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return String(a.displayName || "")
      .localeCompare(String(b.displayName || ""));
  });
}

/* =========================================================
   SUBMIT COMPLETED LEVEL

   One leaderboard document exists per player per level.

   Ranking rules:
   1. Higher best score
   2. Faster best time when scores tie
========================================================= */

export async function submitLevelScore({
  user,
  levelId,
  score,
  timeSeconds,
}) {
  if (!user?.id) {
    throw new Error(
      "An authenticated player is required to save a score.",
    );
  }

  const numericLevel = Number(levelId);
  const numericScore = Math.max(
    0,
    Math.round(Number(score) || 0),
  );

  const numericTime = normalizeTime(timeSeconds);

  const scoreRef = leaderboardPlayerRef(
    numericLevel,
    user.id,
  );

  await runTransaction(
    db,
    async (transaction) => {
      const snapshot = await transaction.get(scoreRef);
      const previous = snapshot.exists()
        ? snapshot.data()
        : null;

      const previousScore =
        Number(previous?.bestScore) || 0;

      const previousTime = normalizeTime(
        previous?.bestTimeSeconds,
      );

      const better = !previous || isBetterRun(
        numericScore,
        numericTime,
        previousScore,
        previousTime,
      );

      transaction.set(
        scoreRef,
        {
          gameId: GAME_ID,
          userId: user.id,
          displayName: user.name || "Player",
          levelId: numericLevel,

          bestScore: better
            ? numericScore
            : previousScore,

          bestTimeSeconds: better
            ? numericTime
            : previousTime,

          attempts:
            (Number(previous?.attempts) || 0) + 1,

          lastScore: numericScore,
          lastTimeSeconds: numericTime,
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        },
      );
    },
  );

  const rows = await getLevelLeaderboard(numericLevel);

  const rank =
    rows.findIndex((row) => row.userId === user.id) + 1;

  const player = rows.find(
    (row) => row.userId === user.id,
  );

  return {
    saved: true,
    rank: rank || null,
    player: player || null,
  };
}

/* =========================================================
   READ LEADERBOARD
========================================================= */

export async function getLevelLeaderboard(levelId) {
  const snapshot = await getDocs(
    leaderboardCollection(levelId),
  );

  const rows = snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }));

  return sortLeaderboard(rows);
}

export async function getPlayerLevelScore(
  levelId,
  userId,
) {
  const snapshot = await getDoc(
    leaderboardPlayerRef(levelId, userId),
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/* =========================================================
   OVERALL LEADERBOARD

   Overall score is calculated from each registered player's
   BEST saved score on every implemented level.

   Example:
   Level 1 best = 100
   Level 2 best = 80
   Overall score = 180

   Ranking rules:
   1. Higher overall score
   2. More levels completed when totals tie
   3. Faster combined best time when still tied
========================================================= */

function sortOverallLeaderboard(rows) {
  return [...rows].sort((a, b) => {
    const scoreDifference =
      (Number(b.overallScore) || 0) -
      (Number(a.overallScore) || 0);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    const levelDifference =
      (Number(b.levelsScored) || 0) -
      (Number(a.levelsScored) || 0);

    if (levelDifference !== 0) {
      return levelDifference;
    }

    const aTime = normalizeTime(a.overallTimeSeconds);
    const bTime = normalizeTime(b.overallTimeSeconds);

    if (aTime === null && bTime === null) {
      return String(a.displayName || "")
        .localeCompare(String(b.displayName || ""));
    }

    if (aTime === null) {
      return 1;
    }

    if (bTime === null) {
      return -1;
    }

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return String(a.displayName || "")
      .localeCompare(String(b.displayName || ""));
  });
}

export async function getOverallLeaderboard(levelIds = []) {
  const ids = [...new Set(
    levelIds
      .map(Number)
      .filter(Number.isInteger),
  )].sort((a, b) => a - b);

  const boards = await Promise.all(
    ids.map((levelId) => getLevelLeaderboard(levelId)),
  );

  const players = new Map();

  boards.forEach((rows) => {
    rows.forEach((row) => {
      const existing = players.get(row.userId) || {
        userId: row.userId,
        displayName: row.displayName || "Player",
        overallScore: 0,
        overallTimeSeconds: 0,
        levelsScored: 0,
        attempts: 0,
        timedLevels: 0,
      };

      existing.displayName = row.displayName || existing.displayName;
      existing.overallScore += Number(row.bestScore) || 0;
      existing.levelsScored += 1;
      existing.attempts += Number(row.attempts) || 0;

      const bestTime = normalizeTime(row.bestTimeSeconds);

      if (bestTime !== null) {
        existing.overallTimeSeconds += bestTime;
        existing.timedLevels += 1;
      }

      players.set(row.userId, existing);
    });
  });

  const rows = [...players.values()].map((row) => ({
    ...row,
    overallTimeSeconds:
      row.timedLevels > 0
        ? row.overallTimeSeconds
        : null,
  }));

  return sortOverallLeaderboard(rows);
}
