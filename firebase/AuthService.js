import {
  auth,
  db,
} from "./FirebaseConfig.js";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/* =========================================================
   PLAYER MAPPING
========================================================= */

function cleanName(user) {
  const displayName = String(user?.displayName || "").trim();

  if (displayName) {
    return displayName;
  }

  const emailName = String(user?.email || "")
    .split("@")[0]
    .trim();

  return emailName || "Player";
}

export function mapFirebaseUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.uid,
    name: cleanName(user),
    email: user.email || "",
    isGuest: false,
  };
}

/* =========================================================
   REGISTER
========================================================= */

export async function registerPlayer({
  displayName,
  email,
  password,
}) {
  const trimmedName = String(displayName || "").trim();

  if (!trimmedName) {
    throw new Error("Please enter a display name.");
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
    String(email || "").trim(),
    password,
  );

  await updateProfile(credential.user, {
    displayName: trimmedName,
  });

  await setDoc(
    doc(db, "users", credential.user.uid),
    {
      displayName: trimmedName,
      email: credential.user.email || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  return mapFirebaseUser(credential.user);
}

/* =========================================================
   LOGIN
========================================================= */

export async function loginPlayer({
  email,
  password,
}) {
  const credential = await signInWithEmailAndPassword(
    auth,
    String(email || "").trim(),
    password,
  );

  return mapFirebaseUser(credential.user);
}

/* =========================================================
   CURRENT SESSION
========================================================= */

export function getCurrentPlayer() {
  return mapFirebaseUser(auth.currentUser);
}

export function waitForAuthState() {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};

    unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        unsubscribe();

        resolve(mapFirebaseUser(firebaseUser));
      },
      (error) => {
        unsubscribe();

        reject(error);
      },
    );
  });
}

export async function requirePlayer(
  redirectHref = "./index.html",
) {
  const player = await waitForAuthState();

  if (player) {
    return player;
  }

  window.location.replace(redirectHref);

  return null;
}

/* =========================================================
   LOGOUT
========================================================= */

export async function logoutPlayer() {
  await signOut(auth);
}

/* =========================================================
   INITIALS
========================================================= */

export function getInitials(name) {
  const parts = String(name || "Player")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "P"
  );
}
