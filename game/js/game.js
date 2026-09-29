import GameModel from "./models/GameModel.js";
import GameView from "./views/GameView.js";
import GameController from "./controllers/GameController.js";

import {
  loadLevel,
} from "./LevelLoader.js";

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

import levels from "../../levels/manifest.js";

/* =========================================================
   LEVEL / PLAYER MODE
========================================================= */

const params = new URLSearchParams(window.location.search);
const levelNumber = params.get("level") || "1";

const firebasePlayer = await waitForAuthState();

if (firebasePlayer) {
  clearGuestSession();
}

const user = firebasePlayer || getGuestPlayer();

if (!user) {
  window.location.replace("../index.html");

  throw new Error("A player session is required to play.");
}

const guestMode = Boolean(user.isGuest);

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
   SETTINGS
========================================================= */

const settingsDialog = document.getElementById("settingsDialog");
const soundSetting = document.getElementById("soundSetting");
const hintSetting = document.getElementById("hintSetting");

function openSettings() {
  const settings = settingsStore.get();

  soundSetting.checked = settings.soundEnabled;
  hintSetting.checked = settings.showHints;

  settingsDialog.showModal();
}

mountAppHeader({
  container: document.getElementById("appHeader"),
  user,
  homeHref: "../home.html",
  leaderboardHref: "../leaderboard.html",
  logoutHref: "../index.html",
  showHomeButton: true,
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

  document.body.classList.toggle(
    "hide-game-hints",
    !hintSetting.checked,
  );
});

document.body.classList.toggle(
  "hide-game-hints",
  !settingsStore.get().showHints,
);

/* =========================================================
   START GAME
========================================================= */

async function startGame() {
  const view = new GameView();

  try {
    const levelData = await loadLevel(levelNumber);

    const manifestLevel = implementedLevels.find(
      (level) => level.id === Number(levelData.id),
    );

    if (!manifestLevel) {
      window.location.replace("../home.html#levels");

      return;
    }

    /*
      Both registered and guest players follow the same
      sequential unlock path.

      Registered progress comes from Firebase.
      Guest progress comes from sessionStorage.

      Neither mode can bypass a locked level through the URL.
    */

    const state = progressStore.getSnapshot();
    const savedLevel =
      state.levels?.[String(levelData.id)] ||
      state.levels?.[levelData.id];

    if (!savedLevel?.unlocked) {
      window.location.replace("../home.html#levels");

      return;
    }

    await progressStore.startLevel(levelData.id);

    const model = new GameModel(levelData);

    new GameController(
      model,
      view,
      {
        user,
        progressStore,
        guestMode,
      },
    );
  } catch (error) {
    console.error("Unable to load level:", error);

    view.showLoadError();
  }
}

startGame();
