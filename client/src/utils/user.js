/**
 * Returns a stable anonymous user identity stored in localStorage.
 * Shape: { userId, name, initials }
 */

const ADJECTIVES = [
  "Swift", "Bright", "Calm", "Bold", "Keen", "Wise", "Cool", "Sharp",
];
const NOUNS = [
  "Panda", "Falcon", "Otter", "Eagle", "Lynx", "Koala", "Raven", "Bison",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateUser() {
  const adj = randomFrom(ADJECTIVES);
  const noun = randomFrom(NOUNS);
  const name = `${adj} ${noun}`;
  const initials = `${adj[0]}${noun[0]}`;
  const userId = `user-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  return { userId, name, initials };
}

const STORAGE_KEY = "clf_user";

export function getOrCreateUser() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.userId && parsed.name && parsed.initials) return parsed;
    }
  } catch (_) {
    // ignore
  }
  const user = generateUser();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (_) {
    // ignore
  }
  return user;
}
