/**
 * storage.js
 * 极简 localStorage 封装。整个 demo 没有后端，
 * 所有数据（偏好、局、打卡、攻略）都只存在当前浏览器里。
 * 后续接入真实后端时，只需要把这里的 get/set 换成 API 调用即可，
 * 上层业务代码（app.js）基本不用动。
 */
const CWStore = (() => {
  const PREFIX = "cw_";

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[CWStore] read failed", key, e);
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn("[CWStore] write failed (可能是图片太大超过 localStorage 限额)", key, e);
    }
  }

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return { get, set, uid };
})();
