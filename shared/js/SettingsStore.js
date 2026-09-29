const PREFIX = "sheridanCampusQuestSettings:v1";

export function createSettingsStore(userId = "guest") {
  const key = `${PREFIX}:${userId || "guest"}`;

  const defaults = {
    soundEnabled: true,
    showHints: true,
  };

  function get() {
    try {
      const raw = localStorage.getItem(key);

      return raw
        ? {
            ...defaults,
            ...JSON.parse(raw),
          }
        : {
            ...defaults,
          };
    } catch {
      return {
        ...defaults,
      };
    }
  }

  function update(patch) {
    const next = {
      ...get(),
      ...patch,
    };

    try {
      localStorage.setItem(
        key,
        JSON.stringify(next),
      );
    } catch {}

    return next;
  }

  return {
    get,
    update,
  };
}
