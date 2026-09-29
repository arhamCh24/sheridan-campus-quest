import {
  getInitials,
  logoutPlayer,
} from "../../firebase/AuthService.js";

import {
  clearGuestSession,
} from "./GuestSession.js";

/* =========================================================
   ICONS
========================================================= */

function icon(name) {
  const icons = {
    home: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/>
      </svg>
    `,

    trophy: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h10v3h3v2c0 3-2 5-5 5.8A5.5 5.5 0 0 1 13 16v2h4v3H7v-3h4v-2a5.5 5.5 0 0 1-2-2.2C6 13 4 11 4 8V6h3V3Zm10 5V6h1v2c0 1.4-.6 2.5-1.7 3.2.4-1 .7-2.1.7-3.2ZM6 8V6h1v2c0 1.1.2 2.2.7 3.2C6.6 10.5 6 9.4 6 8Z"/>
      </svg>
    `,

    grid: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1"/>
        <rect x="14" y="4" width="6" height="6" rx="1"/>
        <rect x="4" y="14" width="6" height="6" rx="1"/>
        <rect x="14" y="14" width="6" height="6" rx="1"/>
      </svg>
    `,

    sound: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9z"/>
        <path class="sound-wave" d="M16 8c1.2 1 1.8 2.3 1.8 4S17.2 15 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path class="sound-wave" d="M18.5 5.5C20.2 7.2 21 9.4 21 12s-.8 4.8-2.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,

    settings: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.4 13a7.7 7.7 0 0 0 .1-1 7.7 7.7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.8-1L15 3.5h-4L10.6 6a7.7 7.7 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5a7.7 7.7 0 0 0-.1 1 7.7 7.7 0 0 0 .1 1l-2 1.5 2 3.4 2.4-1a7.7 7.7 0 0 0 1.8 1l.4 2.5h4l.4-2.5a7.7 7.7 0 0 0 1.8-1l2.4 1 2-3.4zM13 15.5A3.5 3.5 0 1 1 13 8a3.5 3.5 0 0 1 0 7.5z"/>
      </svg>
    `,
  };

  return icons[name] || "";
}

function makeIconLink({
  href,
  label,
  name,
  className = "",
}) {
  const link = document.createElement("a");

  link.href = href;
  link.className = `app-icon-button ${className}`.trim();
  link.setAttribute("aria-label", label);
  link.title = label;
  link.innerHTML = icon(name);

  return link;
}

function makeIconButton({
  label,
  name,
  className = "",
}) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = `app-icon-button ${className}`.trim();
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = icon(name);

  return button;
}

/* =========================================================
   PLAYER PROFILE
========================================================= */

function makeUserProfile(user, logoutHref) {
  const profile = document.createElement("div");

  profile.className = "escape-user-profile";

  if (user?.isGuest) {
    profile.classList.add("guest-mode");
  }

  const avatar = document.createElement("span");

  avatar.className = "escape-user-profile__avatar";
  avatar.textContent = getInitials(user?.name || "Player");

  const name = document.createElement("span");

  name.className = "escape-user-profile__name";
  name.textContent = user?.name || "Player";

  const logoutButton = document.createElement("button");

  logoutButton.type = "button";
  logoutButton.className = "escape-user-profile__logout";
  const guestMode = Boolean(user?.isGuest);

  logoutButton.textContent = guestMode ? "Exit Guest" : "Logout";

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = guestMode ? "Exiting..." : "Logging out...";

    try {
      if (guestMode) {
        clearGuestSession();
      } else {
        await logoutPlayer();
      }

      window.location.href = logoutHref;
    } catch (error) {
      console.error("Session exit error:", error);

      logoutButton.disabled = false;
      logoutButton.textContent = guestMode ? "Exit Guest" : "Logout";
    }
  });

  profile.append(
    avatar,
    name,
    logoutButton,
  );

  return profile;
}

/* =========================================================
   SHARED APPLICATION HEADER
========================================================= */

export function mountAppHeader({
  container,
  user,
  homeHref = "./home.html",
  leaderboardHref = "./leaderboard.html",
  logoutHref = "./index.html",
  showHomeButton = false,
  settingsStore = null,
  onOpenSettings = null,
}) {
  if (!container) {
    return null;
  }

  const header = document.createElement("header");

  header.className = "escape-app-header";

  const left = document.createElement("div");

  left.className = "escape-app-header__left";

  const brand = document.createElement("a");

  brand.href = homeHref;
  brand.className = "escape-game-brand";

  /*
    This is a custom game mark, not Sheridan's official logo.
  */

  brand.innerHTML = `
    <span class="escape-game-brand__mark">S</span>

    <span>
      <strong>Sheridan Campus Quest</strong>
      <small>Explore • Solve • Unlock</small>
    </span>
  `;

  left.appendChild(brand);

  if (showHomeButton) {
    left.appendChild(
      makeIconLink({
        href: homeHref,
        label: "Game home",
        name: "grid",
        className: "game-home",
      }),
    );
  }

  left.appendChild(
    makeIconLink({
      href: leaderboardHref,
      label: "Leaderboard",
      name: "trophy",
      className: "leaderboard-link",
    }),
  );

  const right = document.createElement("div");

  right.className = "escape-app-header__right";

  const sound = makeIconButton({
    label: "Toggle sound",
    name: "sound",
    className: "sound-toggle",
  });

  const settings = settingsStore?.get?.() || {
    soundEnabled: true,
  };

  sound.classList.toggle(
    "is-muted",
    !settings.soundEnabled,
  );

  sound.addEventListener("click", () => {
    if (!settingsStore) {
      return;
    }

    const current = settingsStore.get();

    const next = settingsStore.update({
      soundEnabled: !current.soundEnabled,
    });

    sound.classList.toggle(
      "is-muted",
      !next.soundEnabled,
    );
  });

  right.appendChild(sound);

  const settingsButton = makeIconButton({
    label: "Game settings",
    name: "settings",
    className: "settings-button",
  });

  settingsButton.addEventListener("click", () => {
    onOpenSettings?.();
  });

  right.appendChild(settingsButton);

  right.appendChild(
    makeUserProfile(user, logoutHref),
  );

  header.append(left, right);

  container.replaceChildren(header);

  return header;
}
