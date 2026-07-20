# 雷电 · 多模型对比

同一 Prompt 让不同 AI 模型生成「雷电」纵版射击游戏，对比各模型的产物质量。

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
