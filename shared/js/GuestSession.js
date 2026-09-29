import {
  clearGuestProgress,
} from "./GuestProgressStore.js";

const GUEST_SESSION_KEY = "sheridanCampusQuestGuest:v1";

/* =========================================================
   CREATE GUEST PLAYER
========================================================= */

function makeGuestPlayer() {
  return {
    id: "guest",
    name: "Guest Player",
    email: "",
    isGuest: true,
  };
}

/* =========================================================
   START GUEST SESSION

   If the same browser tab is already in guest mode, keep the
   temporary progression so "Continue as Guest" really resumes.

   A brand-new guest session starts from Level 1.
========================================================= */

export function startGuestSession() {
  const existingGuest = getGuestPlayer();

  if (!existingGuest) {
    clearGuestProgress();
  }

  const guest = makeGuestPlayer();

  sessionStorage.setItem(
    GUEST_SESSION_KEY,
    JSON.stringify({
      active: true,
      startedAt: new Date().toISOString(),
    }),
  );

  return guest;
}

/* =========================================================
   READ GUEST SESSION
========================================================= */

export function getGuestPlayer() {
  try {
    const raw = sessionStorage.getItem(GUEST_SESSION_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!parsed?.active) {
      return null;
    }

    return makeGuestPlayer();
  } catch {
    return null;
  }
}

/* =========================================================
   CLEAR GUEST SESSION

   Guest progression belongs only to the active browser-tab
   session. Exiting guest mode clears both identity and progress.
========================================================= */

export function clearGuestSession() {
  sessionStorage.removeItem(GUEST_SESSION_KEY);

  clearGuestProgress();
}
