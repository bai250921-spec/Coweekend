/**
 * data.js
 * 活动 mock 数据。真实产品里这里应该是活动众包提交 + 审核后的结构化数据库，
 * demo 里先用一份静态列表模拟，字段设计对齐产品方案里的「活动 Activity」实体。
 */
const CW_ACTIVITIES = [
  { id: "a1", title: "本地艺术家联合展", type: "展览", emoji: "🖼️", city: "上海", indoor: true, cost: 60, suitFor: "any", tags: ["文艺", "拍照出片"], durationH: 2, checkinCount: 0, ratingSum: 0 },
  { id: "a2", title: "周末黑胶市集", type: "市集", emoji: "🎧", city: "上海", indoor: false, cost: 40, suitFor: "small", tags: ["音乐", "小众"], durationH: 3, checkinCount: 0, ratingSum: 0 },
  { id: "a3", title: "城市郊野徒步线（8km）", type: "徒步", emoji: "🥾", city: "上海", indoor: false, cost: 0, suitFor: "large", tags: ["运动", "自然"], durationH: 4, checkinCount: 0, ratingSum: 0 },
  { id: "a4", title: "独立乐队 Live", type: "演出", emoji: "🎸", city: "上海", indoor: true, cost: 120, suitFor: "small", tags: ["音乐", "夜晚"], durationH: 3, checkinCount: 0, ratingSum: 0 },
  { id: "a5", title: "手作陶艺体验课", type: "体验", emoji: "🏺", city: "上海", indoor: true, cost: 150, suitFor: "solo", tags: ["手作", "解压"], durationH: 2, checkinCount: 0, ratingSum: 0 },
  { id: "a6", title: "老城区骑行拍照路线", type: "徒步", emoji: "🚲", city: "上海", indoor: false, cost: 20, suitFor: "small", tags: ["拍照出片", "运动"], durationH: 3, checkinCount: 0, ratingSum: 0 },
  { id: "a7", title: "国际动画影展", type: "展览", emoji: "🎬", city: "北京", indoor: true, cost: 80, suitFor: "any", tags: ["文艺"], durationH: 2, checkinCount: 0, ratingSum: 0 },
  { id: "a8", title: "胡同咖啡+古着市集", type: "市集", emoji: "☕", city: "北京", indoor: false, cost: 50, suitFor: "small", tags: ["拍照出片", "小众"], durationH: 3, checkinCount: 0, ratingSum: 0 },
  { id: "a9", title: "京郊低强度徒步", type: "徒步", emoji: "⛰️", city: "北京", indoor: false, cost: 30, suitFor: "large", tags: ["自然", "运动"], durationH: 5, checkinCount: 0, ratingSum: 0 },
  { id: "a10", title: "脱口秀开放麦", type: "演出", emoji: "🎤", city: "北京", indoor: true, cost: 70, suitFor: "small", tags: ["社交", "夜晚"], durationH: 2, checkinCount: 0, ratingSum: 0 },
  { id: "a11", title: "宽窄巷子茶馆桌游", type: "体验", emoji: "🀄", city: "成都", indoor: true, cost: 45, suitFor: "small", tags: ["社交", "解压"], durationH: 3, checkinCount: 0, ratingSum: 0 },
  { id: "a12", title: "熊猫基地半日游", type: "徒步", emoji: "🐼", city: "成都", indoor: false, cost: 55, suitFor: "large", tags: ["自然", "拍照出片"], durationH: 4, checkinCount: 0, ratingSum: 0 },
  { id: "a13", title: "本地设计师手作市集", type: "市集", emoji: "🧵", city: "成都", indoor: false, cost: 30, suitFor: "any", tags: ["文艺", "小众"], durationH: 2, checkinCount: 0, ratingSum: 0 },
  { id: "a14", title: "室内攀岩体验", type: "体验", emoji: "🧗", city: "成都", indoor: true, cost: 90, suitFor: "small", tags: ["运动", "社交"], durationH: 2, checkinCount: 0, ratingSum: 0 },
];

const CW_INTEREST_TAGS = ["文艺", "拍照出片", "音乐", "小众", "运动", "自然", "手作", "解压", "社交", "夜晚"];
