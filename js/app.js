/**
 * app.js
 * CoWeekend 前端 demo 的主逻辑。纯原生 JS + localStorage，没有构建步骤，
 * 用 VS Code 打开、装个 Live Server 插件（或任意静态服务器）就能跑，
 * 也能直接部署到 GitHub Pages。
 *
 * 模块划分（对应产品方案里的四大功能）：
 *  - 推荐引擎：computeScore() + renderFeed()
 *  - 组局：renderGroup() + 发起局/搭子广场/举手报名
 *  - 足迹：renderTrace() + 打卡
 *  - 攻略：renderGuide() + 写攻略 / 一键复用
 */

// ---------------- 全局状态 ----------------
let prefs = CWStore.get("prefs", null);
let favorites = CWStore.get("favorites", []);
let dismissed = CWStore.get("dismissed", []);
let plans = CWStore.get("plans", []);
let checkins = CWStore.get("checkins", []);
let guides = CWStore.get("guides", []);
let currentWeather = null;
let feedOffset = 0; // “换一批”用的游标

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), 2000);
}

function groupLabel(v) {
  return { solo: "单人", small: "2-3人", large: "4人以上" }[v] || "不限";
}

// ---------------- 初始化 ----------------
document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindNav();
  bindSettingsModal();
  bindPlanModal();
  bindCheckinModal();
  bindGuideModal();

  if (!prefs) {
    prefs = { name: "", city: "上海", interests: [], budget: 150, groupSize: "solo" };
    openSettings(true);
  } else {
    $("#city-label").textContent = prefs.city || "上海";
    updateStatusBar();
  }

  await refreshWeather();
  renderFeed(true);
  renderGroup();
  renderTrace();
  renderGuide();
  handleJoinLink();

  $("#btn-city").addEventListener("click", () => openSettings(false));
  $("#btn-refresh").addEventListener("click", () => {
    feedOffset += 6;
    renderFeed(false);
  });
}

function updateStatusBar() {
  $("#budget-info").textContent = `预算 ¥${prefs.budget}`;
  $("#group-info").textContent = groupLabel(prefs.groupSize);
}

// ---------------- 底部导航 ----------------
function bindNav() {
  $$(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      $$(".view").forEach((v) => v.classList.remove("active"));
      $("#view-" + btn.dataset.view).classList.add("active");
    });
  });

  $$(".subtabs").forEach((group) => {
    const buttons = group.querySelectorAll(".subtab");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const section = group.parentElement;
        section.querySelectorAll(".list").forEach((l) => (l.hidden = true));
        const target = section.querySelector(
          `#${section.id.replace("view-", "")}-${btn.dataset.sub}`
        );
        if (target) target.hidden = false;
      });
    });
  });
}

// ---------------- 偏好设置 ----------------
function bindSettingsModal() {
  const tagWrap = $("#set-tags");
  CW_INTEREST_TAGS.forEach((tag) => {
    const b = document.createElement("button");
    b.className = "tag-btn";
    b.textContent = tag;
    b.dataset.tag = tag;
    b.addEventListener("click", () => b.classList.toggle("active"));
    tagWrap.appendChild(b);
  });

  $("#set-budget").addEventListener("input", (e) => {
    $("#set-budget-val").textContent = e.target.value;
  });

  $$("#set-group .tag-btn").forEach((b) => {
    b.addEventListener("click", () => {
      $$("#set-group .tag-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
    });
  });

  $("#set-save").addEventListener("click", async () => {
    prefs.name = $("#set-name").value.trim() || "我";
    prefs.city = $("#set-city").value.trim() || "上海";
    prefs.interests = $$("#set-tags .tag-btn.active").map((b) => b.dataset.tag);
    prefs.budget = Number($("#set-budget").value);
    const g = $("#set-group .tag-btn.active");
    prefs.groupSize = g.length ? g[0].dataset.val : "solo";
    CWStore.set("prefs", prefs);

    $("#city-label").textContent = prefs.city;
    updateStatusBar();
    closeModal("modal-settings");
    await refreshWeather();
    feedOffset = 0;
    renderFeed(true);
    toast("偏好已保存");
  });
}

function openSettings(isFirstRun) {
  $("#set-name").value = prefs.name || "";
  $("#set-city").value = prefs.city || "上海";
  $$("#set-tags .tag-btn").forEach((b) =>
    b.classList.toggle("active", prefs.interests.includes(b.dataset.tag))
  );
  $("#set-budget").value = prefs.budget;
  $("#set-budget-val").textContent = prefs.budget;
  $$("#set-group .tag-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.val === prefs.groupSize)
  );
  $("#modal-settings").classList.add("open");
  if (!isFirstRun) {
    $("#modal-settings").addEventListener(
      "click",
      function bgClose(e) {
        if (e.target.id === "modal-settings") {
          closeModal("modal-settings");
          $("#modal-settings").removeEventListener("click", bgClose);
        }
      }
    );
  }
}

function closeModal(id) {
  $("#" + id).classList.remove("open");
}

// ---------------- 天气 ----------------
async function refreshWeather() {
  $("#weather-info").textContent = "正在获取天气…";
  currentWeather = await CWWeather.fetchWeather(prefs.city || "上海");
  const icon = currentWeather.isRainy ? "🌧️" : "☀️";
  $("#weather-info").textContent = `${icon} ${currentWeather.city} ${currentWeather.tempC}℃ ${currentWeather.desc}${
    currentWeather.mocked ? "（模拟）" : ""
  }`;
}

// ---------------- 推荐算法 ----------------
function computeScore(activity) {
  let interestScore = 0.5;
  if (prefs.interests.length) {
    const overlap = activity.tags.filter((t) => prefs.interests.includes(t)).length;
    interestScore = Math.min(overlap / prefs.interests.length, 1);
  }

  let budgetScore;
  if (prefs.budget <= 0) budgetScore = activity.cost === 0 ? 1 : 0.3;
  else if (activity.cost <= prefs.budget) budgetScore = 1;
  else budgetScore = Math.max(0, 1 - (activity.cost - prefs.budget) / prefs.budget);

  let weatherScore = 0.6;
  if (currentWeather) {
    weatherScore = currentWeather.isRainy
      ? activity.indoor ? 1 : 0.2
      : activity.indoor ? 0.6 : 0.95;
  }

  let groupScore = 0.6;
  if (activity.suitFor === "any") groupScore = 0.85;
  else if (activity.suitFor === prefs.groupSize) groupScore = 1;
  else groupScore = 0.4;

  const total = interestScore * 0.4 + budgetScore * 0.25 + weatherScore * 0.2 + groupScore * 0.15;

  const reasons = [];
  if (currentWeather && currentWeather.isRainy && activity.indoor) reasons.push("雨天友好");
  if (currentWeather && !currentWeather.isRainy && !activity.indoor) reasons.push("晴天出行");
  if (budgetScore === 1) reasons.push("预算内");
  if (groupScore === 1) reasons.push("适合" + groupLabel(prefs.groupSize));
  if (interestScore > 0.5) reasons.push("兴趣匹配");

  return { total, reasons };
}

function getRankedActivities() {
  const cityLower = (prefs.city || "").trim().toLowerCase();
  let pool = CW_ACTIVITIES.filter((a) => a.city.toLowerCase() === cityLower);
  if (!pool.length) pool = CW_ACTIVITIES; // 该城市暂无数据时，退化为展示全部
  pool = pool.filter((a) => !dismissed.includes(a.id));
  const scored = pool.map((a) => ({ activity: a, ...computeScore(a) }));
  scored.sort((x, y) => y.total - x.total);
  return scored;
}

function renderFeed() {
  const feed = $("#feed");
  feed.innerHTML = "";
  const ranked = getRankedActivities();
  const batch = ranked.slice(feedOffset, feedOffset + 6);

  if (!batch.length) {
    feedOffset = 0;
    $("#feed-empty").hidden = ranked.length > 0;
    if (!ranked.length) return;
    return renderFeed();
  }
  $("#feed-empty").hidden = true;

  batch.forEach(({ activity, total, reasons }) => {
    const isFav = favorites.includes(activity.id);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-top">
        <div class="card-emoji">${activity.emoji}</div>
        <div style="flex:1">
          <p class="card-title">${activity.title}</p>
          <p class="card-sub">${activity.type} · ${activity.city}</p>
        </div>
      </div>
      <div class="card-tags">
        ${reasons.map((r) => `<span class="tag">${r}</span>`).join("")}
        ${activity.tags.map((t) => `<span class="tag gray">${t}</span>`).join("")}
      </div>
      <div class="card-meta">
        <span>人均 ¥${activity.cost}</span>
        <span>约 ${activity.durationH} 小时</span>
        <span>${activity.indoor ? "室内" : "户外"}</span>
      </div>
      <div class="card-score">匹配度 ${Math.round(total * 100)}%</div>
      <div class="card-actions">
        <button class="btn-pass">不感兴趣</button>
        <button class="btn-fav ${isFav ? "is-fav" : ""}">${isFav ? "已收藏" : "收藏"}</button>
        <button class="btn-go">发起局</button>
      </div>
    `;
    card.querySelector(".btn-pass").addEventListener("click", () => {
      dismissed.push(activity.id);
      CWStore.set("dismissed", dismissed);
      renderFeed();
      toast("已为你减少此类推荐");
    });
    card.querySelector(".btn-fav").addEventListener("click", (e) => {
      if (favorites.includes(activity.id)) {
        favorites = favorites.filter((id) => id !== activity.id);
      } else {
        favorites.push(activity.id);
      }
      CWStore.set("favorites", favorites);
      renderFeed();
    });
    card.querySelector(".btn-go").addEventListener("click", () => openPlanModal(activity));
    feed.appendChild(card);
  });
}

// ---------------- 组局 ----------------
function bindPlanModal() {
  $("#plan-cancel").addEventListener("click", () => closeModal("modal-plan"));
  $("#plan-save").addEventListener("click", () => {
    const activityId = $("#plan-activity-id").value;
    const activity = CW_ACTIVITIES.find((a) => a.id === activityId);
    const plan = {
      id: CWStore.uid("plan"),
      activityId: activityId || null,
      activityTitle: activity ? activity.title : $("#plan-activity-title").textContent,
      time: $("#plan-time").value,
      maxPeople: Number($("#plan-maxpeople").value) || 4,
      costMode: $("#plan-cost-mode").value,
      isPublic: $("#plan-public").checked,
      members: [prefs.name || "我"],
      createdBy: prefs.name || "我",
      createdAt: Date.now(),
    };
    plans.unshift(plan);
    CWStore.set("plans", plans);
    closeModal("modal-plan");
    renderGroup();
    toast("已生成邀请，去「组局」查看分享链接");
    $$(".tab").forEach((b) => b.classList.remove("active"));
    $('.tab[data-view="group"]').classList.add("active");
    $$(".view").forEach((v) => v.classList.remove("active"));
    $("#view-group").classList.add("active");
  });
}

function openPlanModal(activity) {
  $("#plan-activity-id").value = activity.id;
  $("#plan-activity-title").textContent = `${activity.emoji} ${activity.title} · 人均约¥${activity.cost}`;
  $("#plan-time").value = "";
  $("#plan-maxpeople").value = 4;
  $("#plan-cost-mode").value = "aa";
  $("#plan-public").checked = true;
  $("#modal-plan").classList.add("open");
}

function planShareLink(plan) {
  return location.href.split("#")[0] + "#/join/" + plan.id;
}

function renderGroup() {
  const mineWrap = $("#group-mine");
  const squareWrap = $("#group-square");
  mineWrap.innerHTML = "";
  squareWrap.innerHTML = "";

  if (!plans.length) {
    mineWrap.innerHTML = `<p class="empty-state">还没有发起过局，去首页挑个活动「发起局」吧～</p>`;
  }

  plans.forEach((plan) => {
    const node = planListItem(plan);
    mineWrap.appendChild(node.cloneNode(true));
    rebindPlanItem(mineWrap.lastChild, plan);
    if (plan.isPublic) {
      const node2 = planListItem(plan);
      squareWrap.appendChild(node2);
      rebindPlanItem(squareWrap.lastChild, plan);
    }
  });

  if (!$$("#group-square .list-item").length) {
    squareWrap.innerHTML = `<p class="empty-state">暂时还没有公开的局，发起一个公开局试试～</p>`;
  }
}

function planListItem(plan) {
  const div = document.createElement("div");
  div.className = "list-item";
  const timeText = plan.time ? new Date(plan.time).toLocaleString("zh-CN") : "时间待定";
  div.innerHTML = `
    <h4>${plan.activityTitle}</h4>
    <p class="muted">🕒 ${timeText} · ${plan.costMode === "aa" ? "AA制" : "发起人全包"}</p>
    <p class="muted">👥 已加入 ${plan.members.length}/${plan.maxPeople} 人：${plan.members.join("、")}</p>
    <div class="row">
      <span class="badge ${plan.isPublic ? "" : "dim"}">${plan.isPublic ? "公开局" : "仅邀请"}</span>
      <div style="display:flex; gap:6px;">
        <button class="small-btn btn-join">举手报名</button>
        <button class="small-btn btn-copy">复制邀请链接</button>
        <button class="small-btn btn-del">删除</button>
      </div>
    </div>
  `;
  return div;
}

function rebindPlanItem(node, plan) {
  node.querySelector(".btn-join").addEventListener("click", () => {
    const name = prefs.name || "我";
    if (plan.members.includes(name)) {
      toast("你已经在这个局里啦");
      return;
    }
    if (plan.members.length >= plan.maxPeople) {
      toast("人数已满");
      return;
    }
    plan.members.push(name);
    CWStore.set("plans", plans);
    renderGroup();
    toast("报名成功！");
  });
  node.querySelector(".btn-copy").addEventListener("click", async () => {
    const link = planShareLink(plan);
    try {
      await navigator.clipboard.writeText(link);
      toast("邀请链接已复制（demo 版仅同浏览器可打开）");
    } catch {
      toast(link);
    }
  });
  node.querySelector(".btn-del").addEventListener("click", () => {
    plans = plans.filter((p) => p.id !== plan.id);
    CWStore.set("plans", plans);
    renderGroup();
  });
}

function handleJoinLink() {
  const m = location.hash.match(/^#\/join\/(.+)$/);
  if (!m) return;
  const plan = plans.find((p) => p.id === m[1]);
  if (!plan) {
    toast("没有找到这个局（demo 版数据只存在发起人的浏览器里）");
    return;
  }
  $$(".tab").forEach((b) => b.classList.remove("active"));
  $('.tab[data-view="group"]').classList.add("active");
  $$(".view").forEach((v) => v.classList.remove("active"));
  $("#view-group").classList.add("active");
  toast(`找到了「${plan.activityTitle}」，点击"举手报名"加入吧`);
}

// ---------------- 足迹 / 打卡 ----------------
function bindCheckinModal() {
  $("#btn-checkin").addEventListener("click", () => openCheckinModal());
  $("#ci-cancel").addEventListener("click", () => closeModal("modal-checkin"));

  $("#ci-photo").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file, 480);
    $("#ci-photo-preview").src = dataUrl;
    $("#ci-photo-preview").hidden = false;
    $("#ci-photo-preview").dataset.value = dataUrl;
  });

  $$("#ci-rating span").forEach((star) => {
    star.addEventListener("click", () => {
      const v = Number(star.dataset.v);
      $$("#ci-rating span").forEach((s) => s.classList.toggle("active", Number(s.dataset.v) <= v));
      $("#ci-rating").dataset.value = v;
    });
  });

  $("#ci-save").addEventListener("click", () => {
    const title = $("#ci-title").value.trim();
    if (!title) {
      toast("请填写打卡地点/活动名称");
      return;
    }
    const checkin = {
      id: CWStore.uid("ci"),
      title,
      photo: $("#ci-photo-preview").dataset.value || "",
      cost: Number($("#ci-cost").value) || 0,
      rating: Number($("#ci-rating").dataset.value || 0),
      note: $("#ci-note").value.trim(),
      date: Date.now(),
    };
    checkins.unshift(checkin);
    CWStore.set("checkins", checkins);
    closeModal("modal-checkin");
    renderTrace();
    toast("打卡成功！");
  });
}

function openCheckinModal(prefillTitle) {
  $("#ci-title").value = prefillTitle || "";
  $("#ci-photo").value = "";
  $("#ci-photo-preview").hidden = true;
  $("#ci-photo-preview").dataset.value = "";
  $("#ci-cost").value = 0;
  $("#ci-note").value = "";
  $$("#ci-rating span").forEach((s) => s.classList.remove("active"));
  $("#ci-rating").dataset.value = 0;
  $("#modal-checkin").classList.add("open");
}

function resizeImageToDataUrl(file, maxW) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderTrace() {
  $("#trace-summary").innerHTML = `
    <div class="stat-box"><b>${checkins.length}</b><span>打卡次数</span></div>
    <div class="stat-box"><b>¥${checkins.reduce((s, c) => s + c.cost, 0)}</b><span>累计花费</span></div>
    <div class="stat-box"><b>${new Set(checkins.map((c) => c.title)).size}</b><span>探索地点</span></div>
  `;

  const list = $("#trace-list");
  list.innerHTML = "";
  if (!checkins.length) {
    list.innerHTML = `<p class="empty-state">还没有打卡记录，出发之后记得回来打卡～</p>`;
    return;
  }
  checkins.forEach((ci) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <h4>${ci.title}</h4>
      ${ci.photo ? `<img class="photo-preview" src="${ci.photo}" />` : ""}
      <p class="muted">${new Date(ci.date).toLocaleString("zh-CN")} · 花费 ¥${ci.cost} · ${"★".repeat(ci.rating)}${"☆".repeat(5 - ci.rating)}</p>
      ${ci.note ? `<p>${ci.note}</p>` : ""}
      <div class="row">
        <span></span>
        <div style="display:flex; gap:6px;">
          <button class="small-btn primary btn-to-guide">生成攻略草稿</button>
          <button class="small-btn btn-del">删除</button>
        </div>
      </div>
    `;
    div.querySelector(".btn-to-guide").addEventListener("click", () => openGuideModalFromCheckin(ci));
    div.querySelector(".btn-del").addEventListener("click", () => {
      checkins = checkins.filter((c) => c.id !== ci.id);
      CWStore.set("checkins", checkins);
      renderTrace();
    });
    list.appendChild(div);
  });
}

// ---------------- 攻略 ----------------
function bindGuideModal() {
  $("#btn-new-guide").addEventListener("click", () => openGuideModal());
  $("#guide-cancel").addEventListener("click", () => closeModal("modal-guide"));

  $("#guide-save").addEventListener("click", () => {
    const title = $("#guide-title").value.trim();
    if (!title) {
      toast("请填写攻略标题");
      return;
    }
    const id = $("#guide-id").value || CWStore.uid("guide");
    const guide = {
      id,
      title,
      audience: $("#guide-audience").value.trim(),
      budget: Number($("#guide-budget").value) || 0,
      steps: $("#guide-steps").value.split("\n").map((s) => s.trim()).filter(Boolean),
      tips: $("#guide-tips").value.trim(),
      published: $("#guide-publish").checked,
      createdAt: Date.now(),
    };
    const idx = guides.findIndex((g) => g.id === id);
    if (idx >= 0) guides[idx] = guide;
    else guides.unshift(guide);
    CWStore.set("guides", guides);
    closeModal("modal-guide");
    renderGuide();
    toast(guide.published ? "已发布到攻略广场" : "已保存为草稿");
  });
}

function openGuideModal(guide) {
  $("#guide-modal-title").textContent = guide ? "编辑攻略" : "写攻略";
  $("#guide-id").value = guide ? guide.id : "";
  $("#guide-title").value = guide ? guide.title : "";
  $("#guide-audience").value = guide ? guide.audience : "";
  $("#guide-budget").value = guide ? guide.budget : 0;
  $("#guide-steps").value = guide ? guide.steps.join("\n") : "";
  $("#guide-tips").value = guide ? guide.tips : "";
  $("#guide-publish").checked = guide ? guide.published : true;
  $("#modal-guide").classList.add("open");
}

function openGuideModalFromCheckin(ci) {
  openGuideModal({
    id: "",
    title: `《${ci.title}》体验攻略`,
    audience: groupLabel(prefs.groupSize),
    budget: ci.cost,
    steps: [ci.note || `到达${ci.title}，体验了大约 2 小时`],
    tips: "",
    published: true,
  });
}

function renderGuide() {
  const squareWrap = $("#guide-square");
  const mineWrap = $("#guide-mine");
  squareWrap.innerHTML = "";
  mineWrap.innerHTML = "";

  const published = guides.filter((g) => g.published);
  if (!published.length) squareWrap.innerHTML = `<p class="empty-state">攻略广场空空如也，来写第一篇吧～</p>`;
  published.forEach((g) => squareWrap.appendChild(guideListItem(g)));

  if (!guides.length) mineWrap.innerHTML = `<p class="empty-state">还没有写过攻略</p>`;
  guides.forEach((g) => mineWrap.appendChild(guideListItem(g, true)));
}

function guideListItem(guide, showEdit) {
  const div = document.createElement("div");
  div.className = "list-item";
  div.innerHTML = `
    <h4>${guide.title}</h4>
    <p class="muted">适合：${guide.audience || "不限"} · 人均预算 ¥${guide.budget} ${
      guide.published ? "" : "· <span class='badge warn'>草稿</span>"
    }</p>
    <ol style="margin:8px 0; padding-left:18px; font-size:13px;">
      ${guide.steps.map((s) => `<li>${s}</li>`).join("")}
    </ol>
    ${guide.tips ? `<p class="muted">⚠️ ${guide.tips}</p>` : ""}
    <div class="row">
      <span></span>
      <div style="display:flex; gap:6px;">
        ${showEdit ? `<button class="small-btn btn-edit">编辑</button>` : ""}
        <button class="small-btn primary btn-reuse">一键复用</button>
        ${showEdit ? `<button class="small-btn btn-del">删除</button>` : ""}
      </div>
    </div>
  `;
  if (showEdit) {
    div.querySelector(".btn-edit").addEventListener("click", () => openGuideModal(guide));
    div.querySelector(".btn-del").addEventListener("click", () => {
      guides = guides.filter((g) => g.id !== guide.id);
      CWStore.set("guides", guides);
      renderGuide();
    });
  }
  div.querySelector(".btn-reuse").addEventListener("click", () => {
    const plan = {
      id: CWStore.uid("plan"),
      activityId: null,
      activityTitle: guide.title,
      time: "",
      maxPeople: 4,
      costMode: "aa",
      isPublic: false,
      members: [prefs.name || "我"],
      createdBy: prefs.name || "我",
      createdAt: Date.now(),
      fromGuideId: guide.id,
    };
    plans.unshift(plan);
    CWStore.set("plans", plans);
    renderGroup();
    toast("已加入「我的局」，去补充出发时间吧");
  });
  return div;
}
