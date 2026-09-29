import {
  db,
} from "./FirebaseConfig.js";

import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const GAME_ID = "sheridanCampusQuest";
const STATE_VERSION = 1;

/* =========================================================
   HELPERS
========================================================= */

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeLevelIds(levelIds) {
  return [...new Set(levelIds.map(Number).filter(Number.isInteger))]
    .sort((a, b) => a - b);
}

function makeLevelState(id, unlocked = false) {
  return {
    id,
    unlocked,
    completed: false,
    attempts: 0,
    bestScore: 0,
    bestTimeSeconds: null,
    completedAt: null,
    lastPlayedAt: null,
  };
}

function createDefaultState(userId, levelIds) {
  const ids = normalizeLevelIds(levelIds);
  const levels = {};

  ids.forEach((id, index) => {
    levels[id] = makeLevelState(id, index === 0);
  });

  return {
    version: STATE_VERSION,
    gameId: GAME_ID,
    userId,
    currentLevel: ids[0] || 1,
    highestUnlockedLevel: ids[0] || 1,
    totalScore: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    levels,
  };
}

/* =========================================================
   PROGRESS STORE

   Firestore path:
   users/{uid}/games/sheridanCampusQuest
========================================================= */

export async function createProgressStore(
  userId,
  levelIds = [1],
) {
  if (!userId) {
    throw new Error(
      "A Firebase user ID is required to load game progress.",
    );
  }

  const ids = normalizeLevelIds(levelIds);

  const progressRef = doc(
    db,
    "users",
    userId,
    "games",
    GAME_ID,
  );

  let state = createDefaultState(userId, ids);

  function normalize(existing) {
    const base =
      existing && typeof existing === "object"
        ? {
            ...existing,
            levels: {
              ...(existing.levels || {}),
            },
          }
        : createDefaultState(userId, ids);

    base.version = STATE_VERSION;
    base.gameId = GAME_ID;
    base.userId = userId;
    base.levels ||= {};

    base.currentLevel =
      Number(base.currentLevel) ||
      (ids[0] || 1);

    base.highestUnlockedLevel =
      Number(base.highestUnlockedLevel) ||
      (ids[0] || 1);

    ids.forEach((id, index) => {
      const current =
        base.levels[String(id)] ||
        base.levels[id] ||
        {};

      base.levels[id] = {
        ...makeLevelState(id, index === 0),
        ...current,
        id,
        unlocked: Boolean(
          current.unlocked ||
          current.completed ||
          index === 0 ||
          id <= base.highestUnlockedLevel
        ),
        completed: Boolean(current.completed),
        attempts: Number(current.attempts) || 0,
        bestScore: Number(current.bestScore) || 0,
        bestTimeSeconds:
          current.bestTimeSeconds === null ||
          current.bestTimeSeconds === undefined
            ? null
            : Number(current.bestTimeSeconds),
      };
    });

    /*
      A completed level always unlocks the next implemented
      level for THIS Firebase player only.
    */

    ids.forEach((id, index) => {
      const current = base.levels[id];
      const nextId = ids[index + 1];

      if (current?.completed && nextId) {
        base.levels[nextId].unlocked = true;
        base.highestUnlockedLevel = Math.max(
          base.highestUnlockedLevel,
          nextId,
        );
      }
    });

    Object.keys(base.levels).forEach((key) => {
      if (!ids.includes(Number(key))) {
        delete base.levels[key];
      }
    });

    base.totalScore = Object.values(base.levels).reduce(
      (sum, level) => sum + (Number(level.bestScore) || 0),
      0,
    );

    base.createdAt ||= nowIso();
    base.updatedAt ||= nowIso();

    return base;
  }

  async function write(nextState) {
    const normalized = normalize(nextState);

    normalized.updatedAt = nowIso();

    await setDoc(
      progressRef,
      normalized,
      {
        merge: false,
      },
    );

    state = normalized;

    return clone(state);
  }

  async function refresh() {
    const snapshot = await getDoc(progressRef);

    if (snapshot.exists()) {
      state = normalize(snapshot.data());

      /*
        Re-save normalized data so newly added implemented
        levels are represented correctly.
      */

      await write(state);

      return clone(state);
    }

    state = createDefaultState(userId, ids);

    await write(state);

    return clone(state);
  }

  function getSnapshot() {
    return clone(state);
  }

  async function startLevel(levelId) {
    const id = Number(levelId);
    const nextState = clone(state);

    const level =
      nextState.levels[id] ||
      makeLevelState(
        id,
        id <= nextState.highestUnlockedLevel,
      );

    if (!level.unlocked) {
      throw new Error(`Level ${id} is still locked.`);
    }

    level.attempts = (Number(level.attempts) || 0) + 1;
    level.lastPlayedAt = nowIso();

    nextState.levels[id] = level;
    nextState.currentLevel = id;

    return write(nextState);
  }

  async function completeLevel(
    levelId,
    {
      score = 0,
      timeSeconds = null,
    } = {},
  ) {
    const id = Number(levelId);
    const nextState = clone(state);

    const level =
      nextState.levels[id] ||
      makeLevelState(id, true);

    const numericScore = Math.max(
      0,
      Number(score) || 0,
    );

    const numericTime =
      Number.isFinite(Number(timeSeconds))
        ? Math.max(0, Number(timeSeconds))
        : null;

    level.unlocked = true;
    level.completed = true;
    level.bestScore = Math.max(
      Number(level.bestScore) || 0,
      numericScore,
    );

    level.completedAt = nowIso();
    level.lastPlayedAt = nowIso();

    if (numericTime !== null) {
      level.bestTimeSeconds =
        level.bestTimeSeconds === null
          ? numericTime
          : Math.min(
              Number(level.bestTimeSeconds),
              numericTime,
            );
    }

    nextState.levels[id] = level;

    const currentIndex = ids.indexOf(id);
    const nextId = ids[currentIndex + 1];

    if (nextId && nextState.levels[nextId]) {
      nextState.levels[nextId].unlocked = true;
      nextState.highestUnlockedLevel = Math.max(
        nextState.highestUnlockedLevel,
        nextId,
      );
    }

    nextState.currentLevel = nextId || id;

    return write(nextState);
  }

  await refresh();

  return {
    refresh,
    getSnapshot,
    startLevel,
    completeLevel,
  };
}

export const SHERIDAN_GAME_ID = GAME_ID;
