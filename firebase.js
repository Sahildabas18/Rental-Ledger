// =============================================================================
// Rental Ledger - Firebase Modular Configuration & Auth Engine (v10+)
// =============================================================================
// 
// STEP 1: Go to Firebase Console (https://console.firebase.google.com/)
// STEP 2: Select your project -> Project Settings (gear icon) -> General
// STEP 3: Scroll to "Your apps" -> Web app (</>) -> Copy the firebaseConfig object
// STEP 4: Replace the placeholder values below with your real project credentials:
//
// =============================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyB-IHWUEy_Z3ntPBqDyj7Q03qMIthI7cio",
  authDomain: "rental-ledger-227b4.firebaseapp.com",
  projectId: "rental-ledger-227b4",
  storageBucket: "rental-ledger-227b4.firebasestorage.app",
  messagingSenderId: "671817465949",
  appId: "1:671817465949:web:6280bd2dd1cd20fe370db4",
  measurementId: "G-9Q174JZ4QE"
};

// =============================================================================
// Imports from Official Google Firebase Modular ES Module CDN
// =============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Check if credentials have been replaced
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && 
         !firebaseConfig.apiKey.includes("PASTE_YOUR_") &&
         firebaseConfig.projectId && 
         !firebaseConfig.projectId.includes("PASTE_YOUR_");
};

// Initialize Firebase App
let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Persist login state across Safari PWA closes/reopens on iOS
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("[Firebase] Could not set browserLocalPersistence:", err);
    });

    // Initialize Firestore with robust multi-tab IndexedDB offline persistence
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
    console.log("[Firebase] Initialized with multi-tab offline persistence.");
  } catch (err) {
    console.error("[Firebase] Initialization error:", err);
  }
} else {
  console.info("[Firebase] Running with placeholder configuration. Paste your real keys into firebase.js.");
}

export { app, auth, db };

// =============================================================================
// Username & Synthetic Email Helpers
// =============================================================================

export const SYNTHETIC_DOMAIN = "users.myapp.local";

/**
 * Validates username: 3-20 characters, alphanumeric and underscore only.
 */
export function validateUsername(username) {
  if (!username) {
    return { valid: false, message: "Username is required." };
  }
  const trimmed = username.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return { valid: false, message: "Username must be between 3 and 20 characters." };
  }
  const regex = /^[a-z0-9_]+$/;
  if (!regex.test(trimmed)) {
    return { valid: false, message: "Username can only contain letters, numbers, and underscores (_)." };
  }
  return { valid: true, username: trimmed };
}

/**
 * Validates password: minimum 8 characters.
 */
export function validatePassword(password) {
  if (!password) {
    return { valid: false, message: "Password is required." };
  }
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  return { valid: true };
}

/**
 * Maps a username to synthetic email address.
 */
export function toSyntheticEmail(username) {
  const clean = username.trim().toLowerCase();
  return `${clean}@${SYNTHETIC_DOMAIN}`;
}

/**
 * Extracts username from synthetic email.
 */
export function fromSyntheticEmail(email) {
  if (!email) return "";
  return email.split("@")[0];
}

// =============================================================================
// =============================================================================
// Local Offline Auth Engine (Automatic Fallback when Firebase is not yet configured)
// =============================================================================

const LOCAL_USERS_KEY = "rental_ledger_local_auth_users";
const LOCAL_ACTIVE_USER_KEY = "rental_ledger_local_active_user";
let localAuthCallback = null;

function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

function saveLocalUsers(users) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {}
}

function getLocalActiveUser() {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// =============================================================================
// Friendly Error Message Translation
// =============================================================================

export function getFriendlyErrorMessage(err) {
  if (!err) return "An unexpected error occurred.";
  const code = err.code || "";
  const msg = err.message || "";

  if (!navigator.onLine || code === "auth/network-request-failed" || msg.includes("network")) {
    return "You are currently offline. Please check your internet connection.";
  }

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect username or password. Please try again.";
    case "auth/email-already-in-use":
      return "This username is already taken. Please choose another username.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 8 characters with letters and numbers.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Access temporarily disabled for security. Please try again later.";
    case "auth/requires-recent-login":
      return "For security, changing your password requires recent re-authentication. Please log in again.";
    default:
      return err.message || "Authentication error. Please check your details.";
  }
}

// =============================================================================
// Authentication Operations
// =============================================================================

/**
 * Creates a new user with username and password.
 */
export async function signUpWithUsername(rawUsername, password) {
  const userCheck = validateUsername(rawUsername);
  if (!userCheck.valid) throw new Error(userCheck.message);

  const passCheck = validatePassword(password);
  if (!passCheck.valid) throw new Error(passCheck.message);

  const email = toSyntheticEmail(userCheck.username);

  // If Firebase is fully configured, use Firebase Auth
  if (auth && isFirebaseConfigured()) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return {
        user: cred.user,
        username: userCheck.username,
        uid: cred.user.uid,
        isLocal: false
      };
    } catch (err) {
      throw new Error(getFriendlyErrorMessage(err));
    }
  }

  // Fallback to Local Offline Auth Engine
  console.info("[Auth] Using Local Offline Auth Engine for sign-up.");
  const users = getLocalUsers();
  if (users[userCheck.username]) {
    throw new Error("This username is already taken. Please choose another username.");
  }

  const localUser = {
    username: userCheck.username,
    password: password,
    uid: "local_" + userCheck.username,
    email: email,
    createdAt: new Date().toISOString()
  };

  users[userCheck.username] = localUser;
  saveLocalUsers(users);
  localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(localUser));

  if (localAuthCallback) {
    localAuthCallback({
      uid: localUser.uid,
      username: localUser.username,
      email: localUser.email,
      isLocal: true
    });
  }

  return {
    user: localUser,
    username: localUser.username,
    uid: localUser.uid,
    isLocal: true
  };
}

/**
 * Signs in an existing user with username and password.
 */
export async function logInWithUsername(rawUsername, password) {
  const userCheck = validateUsername(rawUsername);
  if (!userCheck.valid) throw new Error(userCheck.message);

  if (!password) throw new Error("Password is required.");

  const email = toSyntheticEmail(userCheck.username);

  // If Firebase is fully configured, use Firebase Auth
  if (auth && isFirebaseConfigured()) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return {
        user: cred.user,
        username: userCheck.username,
        uid: cred.user.uid,
        isLocal: false
      };
    } catch (err) {
      throw new Error(getFriendlyErrorMessage(err));
    }
  }

  // Fallback to Local Offline Auth Engine
  console.info("[Auth] Using Local Offline Auth Engine for sign-in.");
  const users = getLocalUsers();
  const existing = users[userCheck.username];

  if (!existing || existing.password !== password) {
    throw new Error("Incorrect username or password. Please try again.");
  }

  localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(existing));

  if (localAuthCallback) {
    localAuthCallback({
      uid: existing.uid,
      username: existing.username,
      email: existing.email,
      isLocal: true
    });
  }

  return {
    user: existing,
    username: existing.username,
    uid: existing.uid,
    isLocal: true
  };
}

/**
 * Signs out the current user.
 */
export async function logOutUser() {
  if (auth && isFirebaseConfigured()) {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("[Firebase] Sign-out error:", err);
    }
  }
  localStorage.removeItem(LOCAL_ACTIVE_USER_KEY);
  if (localAuthCallback) {
    localAuthCallback(null);
  }
}

/**
 * Changes password with required re-authentication.
 */
export async function changeUserPassword(currentPassword, newPassword) {
  const passCheck = validatePassword(newPassword);
  if (!passCheck.valid) throw new Error(passCheck.message);

  if (auth && auth.currentUser && isFirebaseConfigured()) {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    try {
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      return { success: true };
    } catch (err) {
      throw new Error(getFriendlyErrorMessage(err));
    }
  }

  // Local user change password
  const active = getLocalActiveUser();
  if (!active) throw new Error("No active user session.");
  const users = getLocalUsers();
  const userRecord = users[active.username];
  if (!userRecord || userRecord.password !== currentPassword) {
    throw new Error("Incorrect current password. Please try again.");
  }
  userRecord.password = newPassword;
  users[active.username] = userRecord;
  saveLocalUsers(users);
  localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(userRecord));
  return { success: true };
}

/**
 * Registers an auth state listener.
 */
export function onAuthChange(callback) {
  localAuthCallback = callback;
  if (!isFirebaseConfigured() || !auth) {
    // Check if a local user is logged in
    const active = getLocalActiveUser();
    setTimeout(() => {
      if (active) {
        callback({
          uid: active.uid,
          username: active.username,
          email: active.email,
          isLocal: true
        });
      } else {
        callback(null);
      }
    }, 50);
    return () => { localAuthCallback = null; };
  }

  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        username: fromSyntheticEmail(user.email),
        isLocal: false
      });
    } else {
      callback(null);
    }
  });
}

// =============================================================================
// Firestore User Data Storage Operations
// =============================================================================

/**
 * References document: users/{uid}/data/portfolio
 */
export function getPortfolioDocRef(uid) {
  if (!db) return null;
  return doc(db, "users", uid, "data", "portfolio");
}

/**
 * References document: users/{uid}/data/statements
 */
export function getStatementsDocRef(uid) {
  if (!db) return null;
  return doc(db, "users", uid, "data", "statements");
}

/**
 * Saves user portfolio data (buildings and rooms) to Firestore.
 */
export async function savePortfolioToFirestore(uid, buildings, rooms) {
  if (!db) return;
  const ref = getPortfolioDocRef(uid);
  if (!ref) return;

  const payload = {
    buildings: buildings || [],
    rooms: rooms || [],
    updatedAt: new Date().toISOString()
  };

  await setDoc(ref, payload, { merge: true });
}

/**
 * Saves statements and payment history to Firestore.
 */
export async function saveStatementsToFirestore(uid, statements, payments, utilityBills) {
  if (!db) return;
  const ref = getStatementsDocRef(uid);
  if (!ref) return;

  const payload = {
    statements: statements || [],
    payments: payments || [],
    utilityBills: utilityBills || [],
    updatedAt: new Date().toISOString()
  };

  await setDoc(ref, payload, { merge: true });
}

/**
 * Loads all user data from Firestore (or local IndexedDB offline cache).
 */
export async function loadUserDataFromFirestore(uid) {
  if (!db) return null;
  try {
    const portRef = getPortfolioDocRef(uid);
    const stmtRef = getStatementsDocRef(uid);

    const [portSnap, stmtSnap] = await Promise.all([
      getDoc(portRef),
      getDoc(stmtRef)
    ]);

    const portfolio = portSnap.exists() ? portSnap.data() : null;
    const statements = stmtSnap.exists() ? stmtSnap.data() : null;

    return {
      portfolio,
      statements,
      hasData: Boolean(portfolio || statements)
    };
  } catch (err) {
    console.error("[Firestore] Error reading user data:", err);
    throw err;
  }
}

/**
 * Subscribes to real-time updates for user data.
 */
export function subscribeToUserData(uid, onUpdate) {
  if (!db) return () => {};

  const portRef = getPortfolioDocRef(uid);
  const stmtRef = getStatementsDocRef(uid);

  let currentPortfolio = null;
  let currentStatements = null;

  const unsubPort = onSnapshot(portRef, (snap) => {
    currentPortfolio = snap.exists() ? snap.data() : null;
    onUpdate({ portfolio: currentPortfolio, statements: currentStatements });
  }, (err) => {
    console.warn("[Firestore] Portfolio snapshot listener warning:", err);
  });

  const unsubStmt = onSnapshot(stmtRef, (snap) => {
    currentStatements = snap.exists() ? snap.data() : null;
    onUpdate({ portfolio: currentPortfolio, statements: currentStatements });
  }, (err) => {
    console.warn("[Firestore] Statements snapshot listener warning:", err);
  });

  return () => {
    unsubPort();
    unsubStmt();
  };
}

// Attach to window for seamless integration across all scripts
if (typeof window !== "undefined") {
  window.rentalFirebase = {
    firebaseConfig,
    isFirebaseConfigured,
    validateUsername,
    validatePassword,
    toSyntheticEmail,
    fromSyntheticEmail,
    getFriendlyErrorMessage,
    signUpWithUsername,
    logInWithUsername,
    logOutUser,
    changeUserPassword,
    onAuthChange,
    savePortfolioToFirestore,
    saveStatementsToFirestore,
    loadUserDataFromFirestore,
    subscribeToUserData
  };
}
