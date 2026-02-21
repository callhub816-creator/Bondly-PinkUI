export type StoredPersona = {
  id: string;
  name: string;
  description?: string;
  gender?: string;
  mode: string;
  defaultLanguage?: 'hinglish'; // Only Hinglish is default
  avatarUrl?: string;
  tags?: string[];
  createdAt: number;
  expiresAt?: number;
};

const KEY = "bondly_user_personas_v1";

export function saveUserPersona(p: StoredPersona) {
  const now = Date.now();
  // ensure timestamps
  if (!p.createdAt) p.createdAt = now;
  if (!p.expiresAt) p.expiresAt = p.createdAt + 7 * 24 * 60 * 60 * 1000;

  const list = getAllUserPersonas();
  list.unshift(p);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getAllUserPersonas(): StoredPersona[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteUserPersona(id: string) {
  const list = getAllUserPersonas().filter(p => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function pruneOldPersonas(days = 7) {
  const cutoff = Date.now() - days * 24 * 3600 * 1000;
  const kept = getAllUserPersonas().filter(p => p.createdAt >= cutoff);
  localStorage.setItem(KEY, JSON.stringify(kept));
}

/**
 * Alias for getAllUserPersonas() - returns filtered list of non-expired personas
 */
export function getStoredPersonas(): StoredPersona[] {
  const all = getAllUserPersonas();
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return all.filter(p => (p.createdAt + sevenDaysMs) > now);
}
