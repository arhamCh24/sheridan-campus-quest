const GUEST_PROGRESS_KEY = "sheridanCampusQuestGuestProgress:v1";
const STATE_VERSION = 1;
const GAME_ID = "sheridanCampusQuest";

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

function createDefaultState(levelIds) {
  const ids = normalizeLevelIds(levelIds);
  const levels = {};

  ids.forEach((id, index) => {
    levels[id] = makeLevelState(id, index === 0);
  });

  return {
    version: STATE_VERSION,
    gameId: GAME_ID,
    playerMode: "guest",
    currentLevel: ids[0] || 1,
    highestUnlockedLevel: ids[0] || 1,
    totalScore: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    levels,
  };
}

function safeParse(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* =========================================================
   GUEST PROGRESS STORE

   Guest progression is intentionally stored in sessionStorage.

   This means:
   - guests unlock levels in the same order as registered players
   - refresh/navigation keeps the current guest session
   - closing the browser tab clears the temporary progression
   - nothing is written to Firebase
   - nothing is submitted to the leaderboard
========================================================= */

export function createGuestProgressStore(levelIds = [1]) {
  const ids = normalizeLevelIds(levelIds);

  let state = createDefaultState(ids);

  function normalize(existing) {
    const base =
      existing && typeof existing === "object"
        ? {
            ...existing,
            levels: {
              ...(existing.levels || {}),
            },
          }
        : createDefaultState(ids);

    base.version = STATE_VERSION;
    base.gameId = GAME_ID;
    base.playerMode = "guest";
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
      A completed guest level unlocks the next implemented level
      for this browser session only.
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

  function write(nextState) {
    const normalized = normalize(nextState);

    normalized.updatedAt = nowIso();

    sessionStorage.setItem(
      GUEST_PROGRESS_KEY,
      JSON.stringify(normalized),
    );

    state = normalized;

    return clone(state);
  }

  function refresh() {
    const stored = safeParse(
      sessionStorage.getItem(GUEST_PROGRESS_KEY),
    );

    state = normalize(stored);

    return write(state);
  }

  function getSnapshot() {
    return clone(state);
  }

  function startLevel(levelId) {
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

  function completeLevel(
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

  refresh();

  return {
    refresh,
    getSnapshot,
    startLevel,
    completeLevel,
  };
}

/* =========================================================
   CLEAR TEMPORARY GUEST PROGRESS
========================================================= */

export function clearGuestProgress() {
  sessionStorage.removeItem(GUEST_PROGRESS_KEY);
}
