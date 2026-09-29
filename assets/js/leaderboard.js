import levels from "../../levels/manifest.js";

import {
  waitForAuthState,
} from "../../firebase/AuthService.js";

import {
  getLevelLeaderboard,
  getOverallLeaderboard,
} from "../../firebase/LeaderboardService.js";

import {
  clearGuestSession,
  getGuestPlayer,
} from "../../shared/js/GuestSession.js";

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

const settingsStore = createSettingsStore(
  guestMode ? "guest" : user.id,
);

/* =========================================================
   DOM
========================================================= */

const levelTabs = document.getElementById("levelTabs");
const leaderboardLevelBadge = document.getElementById("leaderboardLevelBadge");
const leaderboardTitle = document.getElementById("leaderboardTitle");
const playerRankBadge = document.getElementById("playerRankBadge");
const leaderboardBody = document.getElementById("leaderboardBody");
const leaderboardEmpty = document.getElementById("leaderboardEmpty");
const leaderboardPodium = document.getElementById("leaderboardPodium");
const leaderboardPlayers = document.getElementById("leaderboardPlayers");
const leaderboardBestScore = document.getElementById("leaderboardBestScore");
const leaderboardBestScoreLabel = document.getElementById(
  "leaderboardBestScoreLabel",
);
const leaderboardFastestTime = document.getElementById(
  "leaderboardFastestTime",
);
const leaderboardFastestTimeLabel = document.getElementById(
  "leaderboardFastestTimeLabel",
);
const leaderboardYourRank = document.getElementById("leaderboardYourRank");
const leaderboardScoreHeader = document.getElementById(
  "leaderboardScoreHeader",
);
const leaderboardTimeHeader = document.getElementById(
  "leaderboardTimeHeader",
);
const leaderboardAttemptsHeader = document.getElementById(
  "leaderboardAttemptsHeader",
);
const standingsTitle = document.getElementById("standingsTitle");
const standingsNote = document.getElementById("standingsNote");
const viewerModeBadge = document.getElementById("viewerModeBadge");
const settingsDialog = document.getElementById("settingsDialog");
const soundSetting = document.getElementById("soundSetting");
const hintSetting = document.getElementById("hintSetting");

const implementedLevels = levels
  .filter((level) => level.implemented)
  .sort((a, b) => a.id - b.id);

const implementedLevelIds = implementedLevels.map((level) => level.id);

const params = new URLSearchParams(window.location.search);
const requestedLevelId = Number(params.get("level"));

let activeLevelId = implementedLevels.some(
  (level) => level.id === requestedLevelId,
)
  ? requestedLevelId
  : null;

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
});

viewerModeBadge.textContent = guestMode
  ? "Guest view • leaderboard is read-only"
  : `Signed in as ${user.name}`;

viewerModeBadge.classList.toggle("guest", guestMode);

/* =========================================================
   HELPERS
========================================================= */

function formatTime(seconds) {
  const numeric = Number(seconds);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return "—";
  }

  const total = Math.floor(numeric);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitials(name) {
  return String(name || "Player")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "P";
}

function isOverallView() {
  return activeLevelId === null;
}

function getRowScore(row) {
  return isOverallView()
    ? Number(row.overallScore) || 0
    : Number(row.bestScore) || 0;
}

function getRowTime(row) {
  return isOverallView()
    ? row.overallTimeSeconds
    : row.bestTimeSeconds;
}

/* =========================================================
   TABS
========================================================= */

function renderTabs() {
  levelTabs.innerHTML = "";

  const overallButton = document.createElement("button");

  overallButton.type = "button";
  overallButton.className = `level-tab overall-tab ${isOverallView() ? "active" : ""}`;
  overallButton.setAttribute("role", "tab");
  overallButton.setAttribute(
    "aria-selected",
    String(isOverallView()),
  );

  overallButton.innerHTML = `
    <span>OVERALL</span>
    <strong>All Challenges</strong>
  `;

  overallButton.addEventListener("click", () => {
    activeLevelId = null;

    const url = new URL(window.location.href);
    url.searchParams.delete("level");
    url.searchParams.set("view", "overall");
    window.history.replaceState({}, "", url);

    renderTabs();
    renderLeaderboard();
  });

  levelTabs.appendChild(overallButton);

  implementedLevels.forEach((level) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = `level-tab ${level.id === activeLevelId ? "active" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute(
      "aria-selected",
      String(level.id === activeLevelId),
    );

    button.innerHTML = `
      <span>LEVEL ${level.id}</span>
      <strong>${escapeHtml(level.title)}</strong>
    `;

    button.addEventListener("click", () => {
      activeLevelId = level.id;

      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      url.searchParams.set("level", String(level.id));
      window.history.replaceState({}, "", url);

      renderTabs();
      renderLeaderboard();
    });

    levelTabs.appendChild(button);
  });
}

/* =========================================================
   PODIUM
========================================================= */

function podiumCard(row, rank) {
  const medals = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
  };

  const currentPlayer = !guestMode && row.userId === user.id;
  const score = getRowScore(row);
  const time = getRowTime(row);

  return `
    <article class="podium-card rank-${rank} ${currentPlayer ? "current-player" : ""}">
      <div class="podium-medal" aria-hidden="true">${medals[rank] || ""}</div>

      <div class="podium-avatar">
        ${escapeHtml(getInitials(row.displayName || "Player"))}
      </div>

      <span class="podium-rank">#${rank}</span>
      <strong class="podium-name">${escapeHtml(row.displayName || "Player")}</strong>

      <div class="podium-result">
        <strong>${score}</strong>
        <span>${isOverallView() ? "TOTAL POINTS" : "POINTS"}</span>
      </div>

      <small>
        ${
          isOverallView()
            ? `${Number(row.levelsScored) || 0} challenges • ${formatTime(time)} combined time`
            : `${formatTime(time)} best time`
        }
      </small>

      ${currentPlayer ? '<span class="podium-you">YOU</span>' : ""}
    </article>
  `;
}

function renderPodium(rows) {
  leaderboardPodium.innerHTML = "";

  if (!rows.length) {
    leaderboardPodium.classList.add("hidden");

    return;
  }

  const topThree = rows.slice(0, 3);
  const displayOrder = [
    topThree[1] ? { row: topThree[1], rank: 2 } : null,
    topThree[0] ? { row: topThree[0], rank: 1 } : null,
    topThree[2] ? { row: topThree[2], rank: 3 } : null,
  ].filter(Boolean);

  leaderboardPodium.innerHTML = displayOrder
    .map(({ row, rank }) => podiumCard(row, rank))
    .join("");

  leaderboardPodium.classList.remove("hidden");
}

/* =========================================================
   SUMMARY
========================================================= */

function renderSummary(rows) {
  leaderboardPlayers.textContent = String(rows.length);

  leaderboardBestScoreLabel.textContent = isOverallView()
    ? "TOP OVERALL SCORE"
    : "TOP SCORE";

  leaderboardFastestTimeLabel.textContent = isOverallView()
    ? "LEADER COMBINED TIME"
    : "FASTEST TOP RUN";

  if (!rows.length) {
    leaderboardBestScore.textContent = "—";
    leaderboardFastestTime.textContent = "—";
    leaderboardYourRank.textContent = guestMode ? "GUEST" : "—";

    return;
  }

  const topScore = getRowScore(rows[0]);

  leaderboardBestScore.textContent = isOverallView()
    ? String(topScore)
    : `${topScore} / 100`;

  if (isOverallView()) {
    leaderboardFastestTime.textContent = formatTime(
      rows[0]?.overallTimeSeconds,
    );
  } else {
    const topScoreRows = rows.filter(
      (row) => getRowScore(row) === topScore,
    );

    const fastestTopRun = topScoreRows.reduce(
      (best, row) => {
        const value = Number(row.bestTimeSeconds);

        if (!Number.isFinite(value)) {
          return best;
        }

        return best === null || value < best
          ? value
          : best;
      },
      null,
    );

    leaderboardFastestTime.textContent = formatTime(fastestTopRun);
  }

  if (guestMode) {
    leaderboardYourRank.textContent = "GUEST";

    return;
  }

  const currentRank = rows.findIndex(
    (row) => row.userId === user.id,
  ) + 1;

  leaderboardYourRank.textContent = currentRank > 0
    ? `#${currentRank}`
    : "—";
}

/* =========================================================
   VIEW LABELS
========================================================= */

function configureViewLabels(level = null) {
  if (isOverallView()) {
    leaderboardLevelBadge.textContent = "ALL CHALLENGES";
    leaderboardTitle.textContent = "Overall Standings";

    standingsTitle.textContent = "Overall player rankings";
    standingsNote.textContent =
      "Best score from every completed challenge is added together";

    leaderboardScoreHeader.textContent = "Overall Score";
    leaderboardTimeHeader.textContent = "Challenges Completed";
    leaderboardAttemptsHeader.textContent = "Combined Best Time";

    return;
  }

  leaderboardLevelBadge.textContent = `LEVEL ${level.id}`;
  leaderboardTitle.textContent = level.title;

  standingsTitle.textContent = "Top players for this challenge";
  standingsNote.textContent = "Best run per signed-in player";

  leaderboardScoreHeader.textContent = "Best Score";
  leaderboardTimeHeader.textContent = "Best Time";
  leaderboardAttemptsHeader.textContent = "Attempts";
}

/* =========================================================
   TABLE ROW
========================================================= */

function renderRow(row, index) {
  const tr = document.createElement("tr");
  const currentPlayer = !guestMode && row.userId === user.id;

  if (currentPlayer) {
    tr.classList.add("current-player");
  }

  if (index < 3) {
    tr.classList.add(`top-${index + 1}`);
  }

  const rankSymbol = index === 0
    ? "🥇"
    : index === 1
      ? "🥈"
      : index === 2
        ? "🥉"
        : "";

  const scoreValue = isOverallView()
    ? `${Number(row.overallScore) || 0}`
    : `${Number(row.bestScore) || 0} / 100`;

  const middleValue = isOverallView()
    ? `${Number(row.levelsScored) || 0}`
    : formatTime(row.bestTimeSeconds);

  const finalValue = isOverallView()
    ? formatTime(row.overallTimeSeconds)
    : `${Number(row.attempts) || 0}`;

  tr.innerHTML = `
    <td class="rank-cell">
      <span>${rankSymbol}</span>
      <strong>#${index + 1}</strong>
    </td>

    <td class="player-cell">
      <span class="table-avatar">${escapeHtml(getInitials(row.displayName || "Player"))}</span>

      <span>
        <strong>${escapeHtml(row.displayName || "Player")}</strong>
        <small>${currentPlayer ? "YOU" : "PLAYER"}</small>
      </span>
    </td>

    <td class="score-cell">${scoreValue}</td>
    <td class="time-cell">${middleValue}</td>
    <td>${finalValue}</td>
  `;

  leaderboardBody.appendChild(tr);
}

/* =========================================================
   LEADERBOARD
========================================================= */

async function renderLeaderboard() {
  const level = isOverallView()
    ? null
    : implementedLevels.find(
        (item) => item.id === activeLevelId,
      );

  if (!isOverallView() && !level) {
    return;
  }

  configureViewLabels(level);

  leaderboardBody.innerHTML = "";
  leaderboardEmpty.classList.add("hidden");
  playerRankBadge.classList.add("hidden");
  leaderboardPodium.classList.add("hidden");

  try {
    const rows = isOverallView()
      ? await getOverallLeaderboard(implementedLevelIds)
      : await getLevelLeaderboard(level.id);

    renderSummary(rows);
    renderPodium(rows);

    if (!rows.length) {
      leaderboardEmpty.innerHTML = `
        <strong>No scores yet</strong>
        <p>Be the first signed-in player to complete a challenge.</p>
      `;

      leaderboardEmpty.classList.remove("hidden");

      return;
    }

    if (!guestMode) {
      const currentRank =
        rows.findIndex((row) => row.userId === user.id) + 1;

      if (currentRank > 0) {
        playerRankBadge.textContent = isOverallView()
          ? `Your overall rank: #${currentRank}`
          : `Your rank: #${currentRank}`;

        playerRankBadge.classList.remove("hidden");
      }
    }

    rows.slice(0, 50).forEach((row, index) => {
      renderRow(row, index);
    });
  } catch (error) {
    console.error("Unable to load leaderboard:", error);

    renderSummary([]);

    leaderboardEmpty.innerHTML = `
      <strong>Leaderboard unavailable</strong>
      <p>Please check your Firebase configuration and Firestore rules.</p>
    `;

    leaderboardEmpty.classList.remove("hidden");
  }
}

renderTabs();
renderLeaderboard();
