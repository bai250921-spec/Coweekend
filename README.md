# CoWeekend · 周末城市探索指南（可运行原型）

这是根据《周末城市探索指南》产品设计方案做的一个**纯前端可运行 demo**：原生 HTML / CSS / JavaScript，没有任何构建步骤、没有后端，装个浏览器就能跑，也能直接托管到 GitHub Pages 免费上线。

## 功能对照

| 设计方案里的功能 | 对应实现 |
|---|---|
| 智能推荐引擎（偏好+天气+预算） | 首页卡片流，接入 [Open-Meteo](https://open-meteo.com/)（免费、免 Key）实时天气，按兴趣/预算/天气/同行人数打分排序 |
| 组队出发 | 「组局」页：发起局、生成邀请链接、搭子广场、举手报名 |
| 打卡记录 | 「足迹」页：拍照/花费/评分/感受打卡，本地生成足迹统计 |
| 攻略分享 | 「攻略」页：打卡一键生成攻略草稿、攻略广场、一键复用生成新的局 |

> **重要说明（demo 的边界）**：本项目没有后端和数据库，所有数据（偏好、局、打卡、攻略）都用浏览器 `localStorage` 保存在**你自己的浏览器里**。这意味着"分享邀请链接给朋友"这类跨设备协作功能，在这个 demo 里只是**结构和交互的演示**，真正多人协作需要接一个后端（见文末"后续接后端"）。这不影响你在 VS Code 里跑起来、在 GitHub Pages 上线展示产品形态和交互逻辑。

## 目录结构

```
coweekend-prototype/
├─ index.html              页面结构 + 所有弹层（设置/发起局/打卡/写攻略）
├─ css/style.css           样式（移动端优先，适配深色模式）
├─ js/
│  ├─ storage.js           localStorage 封装
│  ├─ weather.js           天气接口（Open-Meteo，免 Key）
│  ├─ data.js              活动 mock 数据 + 兴趣标签
│  └─ app.js               主逻辑：推荐算法、组局、打卡、攻略
├─ .github/workflows/pages.yml   可选的自动部署工作流
└─ README.md
```

## 在 VS Code 中运行

1. 用 VS Code 打开 `coweekend-prototype` 这个文件夹。
2. 装一个静态服务器插件或工具，任选其一：
   - **推荐**：安装扩展 **Live Server**（作者 Ritwick Dey），装好后右键 `index.html` → `Open with Live Server`，会自动用浏览器打开，且改代码保存后自动刷新。
   - 或者不装插件，在 VS Code 的终端里执行：
     ```bash
     python3 -m http.server 5500
     ```
     然后浏览器打开 `http://localhost:5500`。
   - 或者如果你装了 Node.js：
     ```bash
     npx serve .
     ```
3. 首次打开会弹出「我的偏好」引导，填一下昵称、城市、兴趣标签、预算、常见同行人数即可开始体验。

> 不建议直接双击 `index.html` 用 `file://` 方式打开——部分浏览器对本地文件请求外部天气接口有额外限制，用本地服务器打开最稳。

## 部署到 GitHub（GitHub Pages 免费上线）

### 方式一：最简单，不用 Actions
1. 在 GitHub 上新建一个仓库，例如 `coweekend`。
2. 在本地项目文件夹里执行（VS Code 终端里直接跑）：
   ```bash
   git init
   git add .
   git commit -m "feat: CoWeekend prototype"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/coweekend.git
   git push -u origin main
   ```
3. 打开仓库页面 → **Settings → Pages**。
4. 「Build and deployment」的 Source 选择 **Deploy from a branch**，Branch 选择 **main** 和 **/ (root)**，保存。
5. 等 1-2 分钟，页面顶部会出现你的访问链接，形如：
   `https://<你的用户名>.github.io/coweekend/`

### 方式二：用仓库自带的 Actions 自动部署
项目里已经放好了 `.github/workflows/pages.yml`。如果你想要"每次 push 自动重新发布"：
1. 同样先 push 代码到 GitHub（同上）。
2. 进 **Settings → Pages**，把 Source 改成 **GitHub Actions**。
3. 之后每次 `git push` 到 `main`，Actions 会自动重新发布，不需要手动操作。

两种方式二选一即可，效果一样，方式一更简单，方式二更适合以后频繁改代码的场景。

## 可以直接改的地方

- **活动数据**：`js/data.js` 里的 `CW_ACTIVITIES` 数组，按需增删活动、改城市、改预算、改标签。
- **推荐权重**：`js/app.js` 里的 `computeScore()` 函数，`0.4 / 0.25 / 0.2 / 0.15` 分别是兴趣、预算、天气、人数四个因子的权重，可以按你想强调的方向调整。
- **配色**：`css/style.css` 顶部 `:root` 里的 `--primary` / `--accent` 等变量。

## 后续接后端（如果要做成真正多人协作的产品）

现在所有数据读写都集中在 `js/storage.js` 的 `CWStore.get/set` 两个函数里，`app.js` 里的其它代码都是通过它俩存取数据，没有直接碰 `localStorage`。接后端时只需要：
1. 起一个简单的 API 服务（比如 Node.js + Express，或者 Supabase/Firebase 这类 BaaS）。
2. 把 `CWStore.get/set` 换成对应的 `fetch` 请求。
3. 「发起局」生成的邀请链接就能真正跨设备打开加入，「搭子广场」也能看到别人真实发起的局。

这样上层的 UI 和交互逻辑基本不用大改。
