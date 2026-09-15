/**
 * weather.js
 * 用免费、免 Key 的 Open-Meteo 接口获取实时天气，
 * 这样这个纯前端静态站部署到 GitHub Pages 后依然能拿到真实天气，
 * 不需要任何后端或密钥管理。
 * 如果网络请求失败（比如离线演示），会自动降级为模拟天气，保证功能不中断。
 */
const CWWeather = (() => {
  const CACHE_MINUTES = 30;

  // WMO weather code -> 是否降水 / 描述
  function interpretCode(code) {
    const rainCodes = [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99];
    const snowCodes = [71,73,75,77,85,86];
    if (snowCodes.includes(code)) return { isRainy: true, desc: "下雪" };
    if (rainCodes.includes(code)) return { isRainy: true, desc: "有雨" };
    if (code === 0) return { isRainy: false, desc: "晴朗" };
    if ([1,2,3].includes(code)) return { isRainy: false, desc: "多云" };
    if ([45,48].includes(code)) return { isRainy: false, desc: "有雾" };
    return { isRainy: false, desc: "天气一般" };
  }

  function mockWeather() {
    const isRainy = Math.random() < 0.3;
    return {
      city: "未知城市",
      tempC: Math.round(15 + Math.random() * 15),
      isRainy,
      desc: isRainy ? "模拟：小雨" : "模拟：晴朗",
      mocked: true,
    };
  }

  async function fetchWeather(cityName) {
    const cacheKey = "weather_" + cityName;
    const cached = CWStore.get(cacheKey, null);
    if (cached && Date.now() - cached._ts < CACHE_MINUTES * 60 * 1000) {
      return cached;
    }

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=zh`
      );
      const geoJson = await geoRes.json();
      if (!geoJson.results || !geoJson.results.length) throw new Error("城市未找到");
      const { latitude, longitude, name } = geoJson.results[0];

      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
      );
      const wxJson = await wxRes.json();
      const cur = wxJson.current_weather;
      const info = interpretCode(cur.weathercode);

      const result = {
        city: name,
        tempC: Math.round(cur.temperature),
        isRainy: info.isRainy,
        desc: info.desc,
        mocked: false,
        _ts: Date.now(),
      };
      CWStore.set(cacheKey, result);
      return result;
    } catch (e) {
      console.warn("[CWWeather] 获取真实天气失败，使用模拟天气：", e.message);
      const m = mockWeather();
      m.city = cityName;
      return m;
    }
  }

  return { fetchWeather };
})();
