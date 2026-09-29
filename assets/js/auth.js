import {
  loginPlayer,
  registerPlayer,
  waitForAuthState,
} from "../../firebase/AuthService.js";

import {
  clearGuestSession,
  getGuestPlayer,
  startGuestSession,
} from "../../shared/js/GuestSession.js";

/* =========================================================
   DOM
========================================================= */

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authForm = document.getElementById("authForm");
const displayNameField = document.getElementById("displayNameField");
const confirmPasswordField = document.getElementById("confirmPasswordField");
const displayName = document.getElementById("displayName");
const email = document.getElementById("email");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const authMessage = document.getElementById("authMessage");
const submitButton = document.getElementById("submitButton");
const guestButton = document.getElementById("guestButton");

let mode = "login";

/* =========================================================
   EXISTING SESSION
========================================================= */

try {
  const existingPlayer = await waitForAuthState();

  if (existingPlayer) {
    clearGuestSession();

    window.location.replace("home.html");
  }
} catch (error) {
  console.error("Unable to check Firebase session:", error);
}

if (getGuestPlayer()) {
  const guestLabel = guestButton.querySelector("strong");

  if (guestLabel) {
    guestLabel.textContent = "Continue as Guest";
  }
}

/* =========================================================
   MODE
========================================================= */

function setMode(nextMode) {
  mode = nextMode;

  const registering = mode === "register";

  loginTab.classList.toggle("active", !registering);
  registerTab.classList.toggle("active", registering);

  loginTab.setAttribute(
    "aria-selected",
    String(!registering),
  );

  registerTab.setAttribute(
    "aria-selected",
    String(registering),
  );

  displayNameField.classList.toggle(
    "hidden",
    !registering,
  );

  confirmPasswordField.classList.toggle(
    "hidden",
    !registering,
  );

  displayName.required = registering;
  confirmPassword.required = registering;

  password.autocomplete = registering
    ? "new-password"
    : "current-password";

  authTitle.textContent = registering
    ? "Create your player account"
    : "Welcome back";

  authSubtitle.textContent = registering
    ? "Save your progress, scores, and leaderboard results."
    : "Sign in to continue your challenge.";

  submitButton.textContent = registering
    ? "Create Account"
    : "Sign In";

  authMessage.textContent = "";
  authMessage.classList.remove("success");
}

loginTab.addEventListener("click", () => {
  setMode("login");
});

registerTab.addEventListener("click", () => {
  setMode("register");
});

/* =========================================================
   GUEST MODE
========================================================= */

guestButton.addEventListener("click", () => {
  startGuestSession();

  window.location.href = "home.html";
});

/* =========================================================
   ERROR MESSAGE
========================================================= */

function friendlyError(error) {
  const code = String(error?.code || "");

  const messages = {
    "auth/email-already-in-use":
      "That email already has an account. Try signing in instead.",

    "auth/invalid-email":
      "Please enter a valid email address.",

    "auth/invalid-credential":
      "The email or password is incorrect.",

    "auth/weak-password":
      "Please use a stronger password with at least 6 characters.",

    "auth/too-many-requests":
      "Too many attempts. Please wait a moment and try again.",
  };

  return (
    messages[code] ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

/* =========================================================
   SUBMIT
========================================================= */

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  authMessage.textContent = "";
  authMessage.classList.remove("success");

  if (mode === "register" && password.value !== confirmPassword.value) {
    authMessage.textContent = "The two passwords do not match.";

    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = mode === "register"
    ? "Creating account..."
    : "Signing in...";

  try {
    clearGuestSession();

    if (mode === "register") {
      await registerPlayer({
        displayName: displayName.value,
        email: email.value,
        password: password.value,
      });
    } else {
      await loginPlayer({
        email: email.value,
        password: password.value,
      });
    }

    window.location.replace("home.html");
  } catch (error) {
    console.error("Authentication error:", error);

    authMessage.textContent = friendlyError(error);

    submitButton.disabled = false;
    submitButton.textContent = mode === "register"
      ? "Create Account"
      : "Sign In";
  }
});
