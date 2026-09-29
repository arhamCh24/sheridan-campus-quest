import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAFXT3YyN8Huqyau_uHPfMCtsVYr3uPxV4",
  authDomain: "sheridan-campus-quest.firebaseapp.com",
  projectId: "sheridan-campus-quest",
  storageBucket: "sheridan-campus-quest.firebasestorage.app",
  messagingSenderId: "590026001484",
  appId: "1:590026001484:web:81ece2c045359d8a8ef8e9",
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);
