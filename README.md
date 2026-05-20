# Seicons

Seicons 是一个基于 [Next.js](https://nextjs.org) 的图标浏览与导出站点，统一检索并展示 **react-icons** 与 **[@mui/icons-material](https://mui.com/material-ui/material-icons/)** 中的图标，支持多语言、分页、SVG 复制，以及多尺寸/多格式导出。

## 功能概览

- **统一图库**：约 61,000+ 图标（react-icons ~50,389 + MUI ~10,750），构建时写入 SQLite 索引
- **搜索与分页**：服务端 `/api/icons` 查询，首页客户端拉取，每页 48 个
- **筛选**：按图标库（全部 / react-icons / MUI）、按风格（filled / outlined / rounded / sharp / two-tone）
- **详情页**：`/{lang}/icons/{lib}/{pack}/{name}/`，可选 8–256px 尺寸，导出 SVG / PNG / JPG / WEBP（PNG/SVG/WEBP 保留透明通道）
- **列表快捷操作**：悬停复制 SVG 源码；点击图标/标题进入详情
- **多语言**：en、es、fr、de-DE、pt-PT、ja、zh、zh-TW（`Accept-Language` 自动跳转）

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Next.js 16（App Router）、React 19、TypeScript |
| 样式 | Tailwind CSS 4 |
| 图标 | react-icons 5、@mui/icons-material 9 |
| 索引 | SQLite（`src/data/icons.db`，运行时经 sql.js 查询） |
| 部署 | OpenNext + Cloudflare Workers（`wrangler.jsonc`） |

## 架构说明

```
构建阶段 (pnpm run generate:icons)
  ├─ 扫描 node_modules/react-icons 各子包
  ├─ 扫描 @mui/icons-material/*.js
  ├─ 写入 src/data/icons.db（lib / pack / name / style）
  └─ 生成 src/lib/mui-loaders/{A..Z}.ts（MUI 静态按需 import，避免 Turbopack 动态路径失败）

运行时
  ├─ GET /api/icons?q=&page=&lib=&style=  → icons-db.ts (sql.js)
  ├─ 首页 IconBrowser → fetch API → IconCard → DynamicIcon
  │     ├─ react-icons：按子包静态 import（icon-loaders.ts）
  │     └─ mui：按首字母分块 loader（mui-loaders/）
  └─ 详情页 IconDetailPanel → Canvas/SVG 导出（icon-export.ts）
```

**为何不把整份清单打进前端 bundle？** 6 万条 JSON 体积大且拖慢首屏；SQLite + API 只在服务端过滤/分页，客户端仅加载当前页需要的图标模块。

**开发环境首次访问较慢**：Turbopack 需编译大量 MUI 分块与 react-icons 子包，首页 `Compiling /[lang]` 可能耗时数分钟，属正常现象；后续热更新会快很多。

## 项目结构

```
seicons/
├── scripts/
│   └── generate-icons-db.mjs   # 生成 icons.db + mui-loaders/*
├── src/
│   ├── app/
│   │   ├── page.tsx              # 根路径 → 按语言重定向
│   │   ├── [lang]/
│   │   │   ├── page.tsx          # 图标画廊首页
│   │   │   └── icons/[lib]/[pkg]/[name]/page.tsx  # 图标详情
│   │   └── api/icons/route.ts    # 搜索/分页 API
│   ├── components/
│   │   ├── IconBrowser.tsx       # 搜索、筛选、分页
│   │   ├── IconCard.tsx          # 列表卡片
│   │   ├── IconDetailPanel.tsx   # 详情、尺寸/格式、导出
│   │   ├── DynamicIcon.tsx       # 按库加载并渲染图标
│   │   └── ...
│   ├── data/
│   │   └── icons.db              # 构建产物（prebuild 生成）
│   ├── lib/
│   │   ├── icons-db.ts           # SQLite 查询
│   │   ├── icon-loaders.ts       # react-icons 加载
│   │   ├── mui-loaders/          # MUI 按字母分块加载（构建生成）
│   │   ├── icon-export.ts        # 导出 PNG/JPG/WEBP/SVG
│   │   ├── icon-svg.ts           # 复制 SVG
│   │   └── locales/*.json        # 文案
│   └── ...
├── wrangler.jsonc                # Cloudflare Workers 配置
└── open-next.config.ts           # OpenNext Cloudflare 适配
```

### 数据模型（`icons` 表）

| 字段 | 含义 | 示例 |
|------|------|------|
| `lib` | 图标库 | `react-icons`、`mui` |
| `p` | 子包/集合 | `fa`、`md`、`mui` |
| `n` | 组件名 | `FaBeer`、`HomeOutlined` |
| `s` | 风格 | `filled`、`outlined`、`rounded`、`sharp`、`two-tone` |

react-icons 的风格由子包启发式映射；MUI 由组件名后缀（`Outlined`、`Rounded` 等）推断。

## 本地开发

依赖 [pnpm](https://pnpm.io)（见 `packageManager` 字段）。

```bash
pnpm install
pnpm run generate:icons   # 生成 icons.db 与 mui-loaders（build 前会自动执行）
pnpm dev                # http://localhost:7611
```

其他脚本：

| 命令 | 说明 |
|------|------|
| `pnpm build` | 生产构建（含 `prebuild` → `generate:icons`） |
| `pnpm start` | 运行生产构建结果 |
| `pnpm lint` | ESLint |
| `pnpm adapter` | Next 构建 + OpenNext Cloudflare 产物 |
| `pnpm preview` | 本地预览 Cloudflare 部署 |

## API

`GET /api/icons`

| 参数 | 说明 |
|------|------|
| `q` | 搜索关键词（名称、子包、库名） |
| `page` | 页码，从 1 开始 |
| `lib` | `react-icons` 或 `mui`，省略为全部 |
| `style` | `filled` / `outlined` / `rounded` / `sharp` / `two-tone`，省略为全部 |

响应示例：`{ items: [{ l, p, n, s }], page, totalPages, total }`

## 部署（Cloudflare）

项目已配置 `@opennextjs/cloudflare` 与 Wrangler。构建适配产物后按 Wrangler 流程发布；需确保 `src/data/icons.db` 与 `node_modules/sql.js/dist` 随部署包可用（`serverExternalPackages: ["sql.js"]`）。

```bash
pnpm run adapter
pnpm run preview   # 本地预览 Worker
```

## 扩展更多图标库

1. 在 `scripts/generate-icons-db.mjs` 增加扫描逻辑与新 `lib` 标识  
2. 在 `src/lib/icon-loaders.ts`（或独立 loader 模块）增加**静态** `import()` 映射（避免 ``import(`pkg/${name}`)``）  
3. 更新 `ICON_LIBRARIES`、locale 文案与 `DynamicIcon` 渲染分支  

## 致谢

- [react-icons](https://react-icons.github.io/react-icons/)
- [Material UI Icons](https://mui.com/material-ui/material-icons/)
