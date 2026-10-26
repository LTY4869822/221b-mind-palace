export const profile = {
  name: "举觞白眼望青天",
  githubName: "游标卡尺不孤独",
  github: "https://github.com/LTY4869822",
  promptHub: "https://github.com/LTY4869822/PromptHub",
  promptHubSite: "",
  intro:
    "以好奇心为罗盘，以创造力为线索。\n在代码、影像与想象力之间，寻找属于自己的答案。",
};

export const projects = [
  {
    id: "001",
    title: "PromptHub",
    sub: "让每一次灵感，都有迹可循。",
    type: "AIGC · WEB",
    category: "AIGC",
    description:
      "先看效果，再看提示词。一个连接创作结果与完整创作方法的提示词分享社区，收录图像、视频与可复用的灵感。",
    tags: ["React", "Cloudflare", "提示词社区"],
    href: profile.promptHub,
    image: "aigc-portal.webp",
    visual: "portal",
  },
  {
    id: "002",
    title: "Design Director",
    sub: "把设计直觉，变成可复用的方法。",
    type: "SKILL · DESIGN",
    category: "Skill",
    description:
      "从真实设计案例中提取线索，连接视觉方向、前端实现与浏览器验证。一个持续演进中的设计 Skill 实验。",
    tags: ["Agent Skill", "设计研究", "前端"],
    href: "",
    image: "",
    visual: "director",
  },
  {
    id: "003",
    title: "McWorth",
    sub: "把「怎么点最划算」，变成一道可验证的题。",
    type: "SKILL · OPEN SOURCE",
    category: "实验",
    description:
      "麦麦如意餐：基于麦当劳官方 MCP 的配餐 Skill。枚举合法购买组合，结合官方整单核价，探索在指定餐盘与约束下更省的购买方式。",
    tags: ["Python", "MCP", "预算优化"],
    href: "https://github.com/LTY4869822/McWorth",
    image: "",
    visual: "mcworth",
  },
];

export const gallery = [
  {
    id: "01",
    title: "穿越另一重现实",
    english: "THE PORTAL",
    category: "图像",
    image: "aigc-portal.webp",
    note: "汽车视觉实验 · 空间与超现实",
    prompt:
      "电影级汽车广告视觉，一辆海湾蓝运动轿车停在悬崖之上的巨大几何传送门前，遥远山脉，冷色天空与暖色岩石形成色彩对比，超现实空间，精确的工业设计细节，真实材质与自然光照。",
    kind: "IMAGE / EXPLORATION",
  },
  {
    id: "02",
    title: "光线也是一种语言",
    english: "AFTER HOURS",
    category: "图像",
    image: "aigc-garage.webp",
    note: "汽车视觉实验 · 光影与材质",
    prompt:
      "极简深色汽车摄影棚，蓝色运动轿车，克制的冷白灯带勾勒车身轮廓，湿润地面倒影，电影级产品摄影，真实金属漆面，宽幅构图，细节清晰，背景无文字。",
    kind: "IMAGE / LIGHT STUDY",
  },
  {
    id: "03",
    title: "向未知，继续出发",
    english: "INTO THE UNKNOWN",
    category: "图像",
    image: "aigc-road.webp",
    note: "汽车视觉实验 · 路径与叙事",
    prompt:
      "一辆蓝色运动轿车驶过蜿蜒山路，层叠山峰与清晨薄雾，电影广告航拍视角，冷暖分明的自然光照，真实摄影质感，留出呼吸感与前进方向的视觉空间，无文字。",
    kind: "IMAGE / JOURNEY",
  },
];
