import levels from "../../levels/manifest.js";

import {
  waitForAuthState,
} from "../../firebase/AuthService.js";

import {
  createProgressStore,
} from "../../firebase/ProgressService.js";

import {
  clearGuestSession,
  getGuestPlayer,
} from "../../shared/js/GuestSession.js";

import {
  createGuestProgressStore,
} from "../../shared/js/GuestProgressStore.js";

import {
  createSettingsStore,
} from "../../shared/js/SettingsStore.js";

import {
  mountAppHeader,
} from "../../shared/js/AppHeader.js";

/* =========================================================
   PLAYER MODE
========================================================= */

const firebasePlayer = await waitForAuthState();

if (firebasePlayer) {
  clearGuestSession();
}

const user = firebasePlayer || getGuestPlayer();

if (!user) {
  window.location.replace("./index.html");

  throw new Error("A player session is required.");
}

const guestMode = Boolean(user.isGuest);

/* =========================================================
   LEVELS / STORES
========================================================= */

const implementedLevels = levels
  .filter((level) => level.implemented)
  .sort((a, b) => a.id - b.id);

const levelIds = implementedLevels.map((level) => level.id);

const progressStore = guestMode
  ? createGuestProgressStore(levelIds)
  : await createProgressStore(
      user.id,
      levelIds,
    );

const settingsStore = createSettingsStore(
  guestMode ? "guest" : user.id,
);

/* =========================================================
   DOM
========================================================= */

const continueButton = document.getElementById("continueButton");
const continueEyebrow = document.getElementById("continueEyebrow");
const continueLabel = document.getElementById("continueLabel");
const completedStat = document.getElementById("completedStat");
const completedStatLabel = document.getElementById("completedStatLabel");
const unlockedStat = document.getElementById("unlockedStat");
const unlockedStatLabel = document.getElementById("unlockedStatLabel");
const attemptStat = document.getElementById("attemptStat");
const attemptStatLabel = document.getElementById("attemptStatLabel");
const progressKicker = document.getElementById("progressKicker");
const progressTitle = document.getElementById("progressTitle");
const progressMessage = document.getElementById("progressMessage");
const progressStatusLabel = document.getElementById("progressStatusLabel");
const progressStatusValue = document.getElementById("progressStatusValue");
const progressStatusNote = document.getElementById("progressStatusNote");
const levelGrid = document.getElementById("levelGrid");
const levelsHeading = document.getElementById("levelsHeading");
const levelsDescription = document.getElementById("levelsDescription");
const howToPlayButton = document.getElementById("howToPlayButton");
const howToPlayDialog = document.getElementById("howToPlayDialog");
const settingsDialog = document.getElementById("settingsDialog");
const soundSetting = document.getElementById("soundSetting");
const hintSetting = document.getElementById("hintSetting");
const heroBestScore = document.getElementById("heroBestScore");
const heroPlayerName = document.getElementById("heroPlayerName");
const guestNotice = document.getElementById("guestNotice");

/* =========================================================
   HEADER
========================================================= */

function openSettings() {
  const settings = settingsStore.get();

  soundSetting.checked = settings.soundEnabled;
  hintSetting.checked = settings.showHints;

  settingsDialog.showModal();
}

mountAppHeader({
  container: document.getElementById("appHeader"),
  user,
  homeHref: "./home.html",
  leaderboardHref: "./leaderboard.html",
  logoutHref: "./index.html",
  showHomeButton: false,
  settingsStore,
  onOpenSettings: openSettings,
});

soundSetting.addEventListener("change", () => {
  settingsStore.update({
    soundEnabled: soundSetting.checked,
  });
});

hintSetting.addEventListener("change", () => {
  settingsStore.update({
    showHints: hintSetting.checked,
  });
});

howToPlayButton.addEventListener("click", () => {
  howToPlayDialog.showModal();
});

/* =========================================================
   HELPERS
========================================================= */

function getLevelState(state, levelId) {
  return (
    state?.levels?.[String(levelId)] ||
    state?.levels?.[levelId] ||
    null
  );
}

function formatTime(seconds) {
  if (!Number.isFinite(Number(seconds))) {
    return "—";
  }

  const total = Math.max(0, Math.floor(Number(seconds)));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function getPreviousLevel(levelId) {
  const index = implementedLevels.findIndex(
    (level) => level.id === Number(levelId),
  );

  return index > 0
    ? implementedLevels[index - 1]
    : null;
}

/* =========================================================
   CONTINUE LEVEL
========================================================= */

function findContinueLevel(state) {
  const firstIncompleteUnlocked = implementedLevels.find((level) => {
    const saved = getLevelState(state, level.id);

    return saved?.unlocked && !saved?.completed;
  });

  if (firstIncompleteUnlocked) {
    return firstIncompleteUnlocked;
  }

  const current = implementedLevels.find(
    (level) => level.id === Number(state.currentLevel),
  );

  if (current && getLevelState(state, current.id)?.unlocked) {
    return current;
  }

  return implementedLevels[0] || null;
}

/* =========================================================
   LEVEL CARDS
========================================================= */

function renderLevels(state) {
  levelGrid.innerHTML = "";

  implementedLevels.forEach((level) => {
    const saved = getLevelState(state, level.id);

    const unlocked = Boolean(saved?.unlocked);
    const completed = Boolean(saved?.completed);
    const previousLevel = getPreviousLevel(level.id);

    const card = document.createElement("article");

    card.className = `level-card ${unlocked ? "unlocked" : "locked"}`;

    const bestScore = completed
      ? `${Number(saved.bestScore) || 0} / 100`
      : "—";

    const bestTime = completed
      ? formatTime(saved.bestTimeSeconds)
      : "—";

    const attempts = Number(saved?.attempts) || 0;

    const statusLabel = unlocked
      ? completed
        ? "COMPLETED"
        : "UNLOCKED"
      : "LOCKED";

    const scoreLabel = guestMode
      ? "SESSION BEST"
      : "BEST SCORE";

    const timeLabel = guestMode
      ? "SESSION TIME"
      : "BEST TIME";

    card.innerHTML = `
      <div class="level-card-image">
        <img src="${level.image}" alt="${level.title} preview" />

        <span class="level-number">LEVEL ${level.id}</span>

        <span class="level-lock">
          ${statusLabel}
        </span>
      </div>

      <div class="level-card-body">
        <div class="level-card-top">
          <h3>${level.title}</h3>
          <span class="difficulty-pill">${level.difficulty}</span>
        </div>

        <p>${level.description}</p>

        <div class="level-meta">
          <div>
            <span>${scoreLabel}</span>
            <strong>${bestScore}</strong>
          </div>

          <div>
            <span>${timeLabel}</span>
            <strong>${bestTime}</strong>
          </div>

          <div>
            <span>ATTEMPTS</span>
            <strong>${attempts}</strong>
          </div>
        </div>

        ${
          unlocked
            ? `
              <a class="level-action play" href="${level.href}">
                ${completed ? "Play Again" : "Play Level"}
              </a>
            `
            : `
              <span class="level-action locked">
                Complete ${previousLevel ? `Level ${previousLevel.id}` : "the previous challenge"} to unlock
              </span>
            `
        }
      </div>
    `;

    levelGrid.appendChild(card);
  });
}

/* =========================================================
   GUEST PAGE
========================================================= */

function renderGuest() {
  const state = progressStore.getSnapshot();

  const completed = implementedLevels.filter(
    (level) => getLevelState(state, level.id)?.completed,
  ).length;

  const attempts = implementedLevels.reduce(
    (sum, level) =>
      sum +
      (Number(getLevelState(state, level.id)?.attempts) || 0),
    0,
  );

  const bestScore = Math.max(
    0,
    ...implementedLevels.map(
      (level) => Number(getLevelState(state, level.id)?.bestScore) || 0,
    ),
  );

  const unlockedLevels = implementedLevels.filter(
    (level) => getLevelState(state, level.id)?.unlocked,
  );

  const highestUnlocked = unlockedLevels.at(-1) || implementedLevels[0];

  const nextLocked = implementedLevels.find(
    (level) => !getLevelState(state, level.id)?.unlocked,
  );

  heroPlayerName.textContent = "Guest Player";
  heroBestScore.textContent = bestScore > 0 ? `${bestScore}` : "—";
  guestNotice.classList.remove("hidden");

  completedStat.textContent = String(completed);
  completedStatLabel.textContent = "Session challenges completed";

  unlockedStat.textContent = highestUnlocked
    ? `Level ${highestUnlocked.id}`
    : "—";
  unlockedStatLabel.textContent = "Highest unlocked this session";

  attemptStat.textContent = String(attempts);
  attemptStatLabel.textContent = "Session attempts";

  progressKicker.textContent = "GUEST PROGRESSION";

  if (nextLocked) {
    const previousLevel = getPreviousLevel(nextLocked.id);

    progressTitle.textContent = `${nextLocked.title} is next to unlock`;
    progressMessage.textContent = previousLevel
      ? `Complete Level ${previousLevel.id} to open Level ${nextLocked.id}. Guest progress stays only in this browser tab and is never added to the leaderboard.`
      : "Complete your current challenge to keep moving forward.";

    progressStatusLabel.textContent = "NEXT UNLOCK";
    progressStatusValue.textContent = `Level ${nextLocked.id}`;
    progressStatusNote.textContent = previousLevel
      ? `Complete Level ${previousLevel.id} to continue.`
      : "Complete the current challenge.";
  } else {
    progressTitle.textContent = "Latest available challenge reached";
    progressMessage.textContent =
      "Replay any unlocked level during this guest session. Closing or exiting guest mode clears this temporary progression.";

    progressStatusLabel.textContent = "GUEST STATUS";
    progressStatusValue.textContent = "Keep exploring";
    progressStatusNote.textContent = "Guest results never appear on the leaderboard.";
  }

  levelsHeading.textContent = "Choose an unlocked level";
  levelsDescription.textContent =
    "Guest players follow the same unlock path as registered players, but progress and scores stay only in this browser-tab session and are not sent to Firebase.";

  const continueLevel = findContinueLevel(state);

  if (continueLevel) {
    const saved = getLevelState(state, continueLevel.id);

    continueButton.href = continueLevel.href;
    continueEyebrow.textContent = saved?.completed
      ? "PLAY AGAIN"
      : "CONTINUE AS GUEST";

    continueLabel.textContent = continueLevel.title;
  }

  renderLevels(state);
}

/* =========================================================
   SIGNED-IN PAGE
========================================================= */

function renderSignedIn() {
  const state = progressStore.getSnapshot();

  const completed = implementedLevels.filter(
    (level) => getLevelState(state, level.id)?.completed,
  ).length;

  const attempts = implementedLevels.reduce(
    (sum, level) =>
      sum +
      (Number(getLevelState(state, level.id)?.attempts) || 0),
    0,
  );

  const bestScore = Math.max(
    0,
    ...implementedLevels.map(
      (level) => Number(getLevelState(state, level.id)?.bestScore) || 0,
    ),
  );

  const unlockedLevels = implementedLevels.filter(
    (level) => getLevelState(state, level.id)?.unlocked,
  );

  const highestUnlocked = unlockedLevels.at(-1) || implementedLevels[0];

  const nextLocked = implementedLevels.find(
    (level) => !getLevelState(state, level.id)?.unlocked,
  );

  heroPlayerName.textContent = user.name;
  heroBestScore.textContent = bestScore > 0 ? `${bestScore}` : "—";

  completedStat.textContent = String(completed);
  completedStatLabel.textContent = "Challenges completed";

  unlockedStat.textContent = highestUnlocked
    ? `Level ${highestUnlocked.id}`
    : "—";
  unlockedStatLabel.textContent = "Highest unlocked";

  attemptStat.textContent = String(attempts);
  attemptStatLabel.textContent = "Total attempts";

  if (nextLocked) {
    const previousLevel = getPreviousLevel(nextLocked.id);

    progressTitle.textContent = `${nextLocked.title} is next to unlock`;
    progressMessage.textContent = previousLevel
      ? `Complete Level ${previousLevel.id} to open Level ${nextLocked.id}. Every level you already unlocked remains available to replay.`
      : "Complete your current challenge to keep moving forward.";

    progressStatusLabel.textContent = "NEXT UNLOCK";
    progressStatusValue.textContent = `Level ${nextLocked.id}`;
    progressStatusNote.textContent = previousLevel
      ? `Complete Level ${previousLevel.id} to continue.`
      : "Complete the current challenge.";
  } else {
    progressTitle.textContent = "Latest available challenge reached";
    progressMessage.textContent =
      "Replay any unlocked level to improve your best score and time while new challenges can be added to the quest.";

    progressStatusLabel.textContent = "CURRENT STATUS";
    progressStatusValue.textContent = "Keep competing";
    progressStatusNote.textContent = "Replay a challenge or visit the leaderboard.";
  }

  const continueLevel = findContinueLevel(state);

  if (continueLevel) {
    const saved = getLevelState(state, continueLevel.id);

    continueButton.href = continueLevel.href;
    continueEyebrow.textContent = saved?.completed
      ? "PLAY AGAIN"
      : "CONTINUE QUEST";

    continueLabel.textContent = continueLevel.title;
  }

  renderLevels(state);
}

/* =========================================================
   PAGE RENDER
========================================================= */

if (guestMode) {
  renderGuest();
} else {
  renderSignedIn();
}
