/* Espera antes de conferir as respostas; os arquivos estáticos continuam públicos. */
(() => {
  "use strict";
  const duration = 4 * 60 * 60 * 1000;
  const delay = 20 * 1000;
  function createSession({ storage, now = Date.now, schedule = setTimeout, cancel = clearTimeout } = {}) {
    const storageKey = "senai-answer-access-v1";
    const listeners = new Set();
    let expiresAt = 0, readyAt = 0, timer;
    try {
      storage?.removeItem("senai-teacher-access-v1");
      const saved = JSON.parse(storage?.getItem(storageKey) || "null");
      if (Number.isFinite(saved?.expiresAt) && saved.expiresAt > now() && saved.expiresAt <= now() + duration) expiresAt = saved.expiresAt;
      else if (Number.isFinite(saved?.readyAt) && saved.readyAt > 0 && saved.readyAt <= now() + delay && saved.readyAt + duration > now()) readyAt = saved.readyAt;
      else storage?.removeItem(storageKey);
    } catch { /* Sem armazenamento, a liberação vale enquanto a página fica aberta. */ }
    const isUnlocked = () => expiresAt > now() && expiresAt <= now() + duration;
    const snapshot = () => ({ unlocked: isUnlocked(), expiresAt: isUnlocked() ? expiresAt : 0,
      waiting: Boolean(readyAt), remainingSeconds: readyAt ? Math.max(0, Math.ceil((readyAt - now()) / 1000)) : 0 });
    const notify = reason => listeners.forEach(callback => callback({ ...snapshot(), reason }));
    function save() {
      try {
        if (expiresAt || readyAt) storage?.setItem(storageKey, JSON.stringify({ expiresAt, readyAt }));
        else storage?.removeItem(storageKey);
      } catch { /* A sessão também funciona em memória. */ }
    }
    function lock(reason = "manual") {
      expiresAt = 0; readyAt = 0; cancel(timer); save(); notify(reason);
    }
    function checkExpiry() {
      if (readyAt && now() >= readyAt) {
        expiresAt = readyAt + duration; readyAt = 0;
        if (isUnlocked()) { save(); armTimer(); notify("unlocked"); }
      }
      if (expiresAt && !isUnlocked()) lock("expired");
      return isUnlocked();
    }
    function armTimer() {
      cancel(timer);
      const deadline = readyAt || expiresAt;
      if (!deadline) return;
      timer = schedule(() => {
        checkExpiry();
        if (readyAt) notify("waiting");
        armTimer();
      }, Math.max(1, readyAt ? Math.min(1000, readyAt - now()) : expiresAt - now()));
    }
    function startUnlock() {
      if (checkExpiry()) return snapshot();
      if (!readyAt) { readyAt = now() + delay; save(); }
      armTimer(); notify("waiting"); return snapshot();
    }
    function cancelUnlock() { if (readyAt) lock("cancelled"); }
    checkExpiry(); armTimer();
    return { isUnlocked, snapshot, checkExpiry, startUnlock, cancelUnlock, lock,
      subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); } };
  }
  window.SENAI_ANSWER_ACCESS = { createSession, duration, delay };
})();
