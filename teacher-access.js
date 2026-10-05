/* Bloqueio da interface. Os arquivos de um site estático continuam públicos. */
(() => {
  "use strict";
  const duration = 4 * 60 * 60 * 1000;
  async function passwordDigest(password, salt, cryptoProvider = window.crypto) {
    const bytes = new TextEncoder().encode(`${salt}:${password}`);
    const digest = await cryptoProvider.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }
  function createSession({ config, storage, now = Date.now, schedule = setTimeout, cancel = clearTimeout, digest = passwordDigest }) {
    const storageKey = "senai-teacher-access-v1";
    const fingerprint = `${config.salt}:${config.passwordHash}`;
    const configured = Boolean(config.salt && /^[a-f0-9]{64}$/.test(config.passwordHash));
    const listeners = new Set();
    let expiresAt = 0, timer, epoch = 0;
    try {
      const saved = JSON.parse(storage?.getItem(storageKey) || "null");
      if (configured && saved?.fingerprint === fingerprint && Number.isFinite(saved.expiresAt) && saved.expiresAt > now() && saved.expiresAt <= now() + duration) expiresAt = saved.expiresAt;
      else storage?.removeItem(storageKey);
    } catch { /* Sem armazenamento, o desbloqueio vale enquanto a página fica aberta. */ }
    const isUnlocked = () => configured && expiresAt > now() && expiresAt <= now() + duration;
    const snapshot = () => ({ unlocked: isUnlocked(), expiresAt: isUnlocked() ? expiresAt : 0 });
    const notify = reason => listeners.forEach(callback => callback({ ...snapshot(), reason }));
    function lock(reason = "manual") {
      epoch++; expiresAt = 0; cancel(timer);
      try { storage?.removeItem(storageKey); } catch { /* A memória também é limpa. */ }
      notify(reason);
    }
    function checkExpiry() {
      if (expiresAt && !isUnlocked()) lock("expired");
      return isUnlocked();
    }
    function armTimer() {
      cancel(timer);
      if (!expiresAt) return;
      timer = schedule(() => { if (checkExpiry()) armTimer(); }, Math.max(1, expiresAt - now()));
    }
    async function unlock(password) {
      if (!configured) throw new Error("Senha dos professores ainda não configurada.");
      const attempt = epoch;
      if (await digest(password, config.salt) !== config.passwordHash || epoch !== attempt) return false;
      expiresAt = now() + duration;
      try { storage?.setItem(storageKey, JSON.stringify({ fingerprint, expiresAt })); } catch { /* Sessão em memória. */ }
      armTimer(); notify("unlocked"); return true;
    }
    armTimer();
    return { isUnlocked, snapshot, checkExpiry, unlock, lock, subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); } };
  }
  window.SENAI_TEACHER_ACCESS = { createSession, passwordDigest, duration };
})();
