# SBTI Clone Lab

这个目录做两件事：

1. 从 `C:\Users\leoh0\sbti_source.html` 抽出原站题库、人格模板和维度解释。
2. 提供一个可直接本地打开的静态复刻版。

文件说明：

- `scripts/extract-source.js`
  从抓下来的原始 HTML 里提取 `questions`、`specialQuestions`、`TYPE_LIBRARY`、`NORMAL_TYPES` 等常量。
- `data/original.json`
  抽出的原始结构化数据。
- `data/original-data.js`
  浏览器可直接加载的数据文件。
- `app.js`
  复刻后的核心算法和交互。
- `index.html`
  站点入口。
- `xianxia.html`
  仙侠赛博主题版入口。
- `data/xianxia-cyber-data.js`
  仙侠赛博题库与人格模板。

使用：

```powershell
Set-Location C:\Users\leoh0\sbti-rebuild
node .\scripts\extract-source.js
start .\index.html
start .\xianxia.html
```

原站算法主线：

- 30 道常规题参与计分。
- 15 个维度，每个维度 2 道题，每题分值 1 到 3。
- 维度总分 `2-3 => L`，`4 => M`，`5-6 => H`。
- 用户得到一个 15 位 `L/M/H` 向量。
- 与 25 个常规模板做曼哈顿距离匹配。
- 相似度公式：`round((1 - distance / 30) * 100)`，下限 0。
- 若 `drink_gate_q2 === 2`，直接覆盖为 `DRUNK`。
- 若最佳常规人格相似度 `< 60`，兜底为 `HHHH`。

仙侠赛博版改了什么：

- 保留 15 维、30 道常规题、2 道隐藏题、25 个常规模板的骨架。
- 把题面重写成“仙门平台化 + 赛博生存 + 热门修仙梗”。
- 把 `DRUNK` 改写成“丹瘾魔修”式隐藏人格，但触发规则不变。
- 人格模板的匹配 pattern 没动，所以这版本质是换主题，不是换算法。
