# 雷电 · 多模型对比

同一 Prompt 让不同 AI 模型生成「雷电」纵版射击游戏，对比各模型的产物质量。

[本地运行](#运行) · [评分标准](scoring.md) · [添加新模型](#添加新模型)

## 运行

需要 HTTP 服务（iframe 加载各模型产物）：

```bash
# 方式一：Python
python3 -m http.server 8080

# 方式二：Node
npx serve .
```

打开 `http://localhost:8080` 即可。

GitHub Pages 也直接可用：启用后访问 `https://<user>.github.io/leidian/`。

## 怎样并排比较模型产物

1. 按上面的方式启动 HTTP 服务，打开对比入口，先在左侧选一个模型做「单屏预览」。
2. 点击「并排对比」，再选另一个不同模型；原模型保留在左侧，第二个出现在右侧。
3. 点击要玩的游戏画面，让对应 iframe 获得键盘焦点。各产物的按键和难度不同，先看各自开始画面的说明，再用同一浏览器、窗口大小和相近试玩时长记录操控、敌机、道具与画面体验。
4. 按 [评分标准](scoring.md) 分别记录可玩性、视觉和代码质量；不要把只试玩过的画面当作代码审查结果。

当前注册的产物可单独阅读或运行：[Kimi K3](models/kimi-k3/index.html)、[Qwen](models/qwen/index.html)、[Codex](models/codex/index.html)、[HY](models/hy/index.html)。每个目录的 `meta.json` 记录生成日期、Prompt 版本、生成方式与本地评分，例如 [Codex 元信息](models/codex/meta.json)。

### 评分面板能说明什么

「待评」表示该维度没有填评分，不表示零能力。面板总分按 40% / 30% / 30% 汇总，缺失维度在计算中按零处理；部分评分的总分不能与完整评分直接比较。不同生成日期和迭代方式也会影响产物，因此这些分数是本项目评分表下的观察，不是受控的通用模型能力排名。

这里的「雷电」是纵版射击学习项目的题材称呼，与 [Raiden IV 商业产品](https://store.steampowered.com/app/2002850/Raiden_IV_x_MIKADO_remix/) 区分。若只想研究单款零依赖的 Canvas 射击游戏，可看独立仓库 [雷霆突击](https://github.com/majiayu000/leidian-codex)。

## 目录结构

```
leidian/
├── index.html              # 对比入口（模型选择 + iframe 预览 + 评分面板）
├── scoring.md              # 评分标准
├── models/
│   ├── kimi-k3/            # 各模型独立目录
│   │   ├── meta.json       # 模型元信息 + 评分
│   │   ├── index.html      # 游戏入口
│   │   └── game.js
│   ├── qwen/
│   ├── claude/
│   └── ...
└── README.md
```

## 添加新模型

1. 在 `models/` 下新建目录（如 `models/gpt/`）
2. 放入游戏文件，确保 `models/<id>/index.html` 可直接运行
3. 创建 `meta.json`：

```json
{
  "model": "模型标识",
  "provider": "厂商名",
  "prompt_version": "v1",
  "generated_at": "2026-07-21",
  "generation_method": "single-turn",
  "notes": "备注",
  "scores": { "playability": null, "visual": null, "code_quality": null }
}
```

4. 在根 `index.html` 的 `MODELS` 数组中注册：

```js
{ id: 'gpt', name: 'GPT-4o', provider: 'OpenAI' },
```

## 评分维度

| 维度 | 权重 | 说明 |
|------|------|------|
| 可玩性 | 40% | 操控、敌机多样性、难度曲线、道具、音效 |
| 视觉 | 30% | 画面精细度、动画、UI、风格一致性 |
| 代码 | 30% | 结构、可读性、错误处理、可维护性 |

详见 [scoring.md](scoring.md)。

## 问题反馈与更新

遇到问题时，请在 [Issues](https://github.com/majiayu000/leidian/issues) 写明浏览器或编辑器版本、所用提交、复现步骤和报错文字。当前源码变化见 [提交记录](https://github.com/majiayu000/leidian/commits/main/)。
