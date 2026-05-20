# Seicons

Seicons 是一个基于 [Next.js](https://nextjs.org) 的图标浏览与导出站点，统一检索并展示 **react-icons** 与 **[@mui/icons-material](https://mui.com/material-ui/material-icons/)** 中的图标，支持多语言、分页、SVG 复制，以及多尺寸/多格式导出。

## 功能概览

- **统一图库**：约 61,000+ 图标（react-icons + MUI），构建时预渲染 SVG 写入 SQLite
- **搜索与分页**：服务端 `/api/icons` 查询，每页返回图标元数据 + SVG 字符串
- **筛选**：按图标库、按风格（filled / outlined / rounded / sharp / two-tone）
- **详情页**：可选尺寸与格式导出（PNG / JPG / WEBP / SVG，透明通道保留）
- **多语言**：8 种语言，`Accept-Language` 自动跳转

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Next.js 16、React 19、TypeScript、Tailwind CSS 4 |
| 索引 | SQLite（`src/data/icons.db`，含 `svg` 列） |
| 运行时查询 | sql.js（Node.js API 路由） |
| 图标源（仅构建期） | react-icons、@mui/icons-material（devDependencies） |
| 部署 | OpenNext + Cloudflare Workers |

## 架构（SVG 烘焙方案）

```
构建阶段  pnpm run generate:icons
  ├─ react-dom/server 将每个图标渲染为 24px SVG
  ├─ 规范化（currentColor → #000、固定宽高、去除 MUI class）
  ├─ 写入 icons 表：lib, p, n, s, svg
  └─ 删除旧的 mui-loaders 分块 import（不再需要）

运行时
  ├─ GET /api/icons → 返回 { l, p, n, s, svg }（每页 48 条）
  ├─ SvgPreview → dangerouslySetInnerHTML 内联 SVG（无 react-icons/MUI 客户端 bundle）
  └─ 详情导出 → scaleSvgMarkup + Canvas 栅格化
```

**优势**：开发编译从「数万模块图」降为普通 React 页面（约 1–2s），内存占用显著下降；图标展示不依赖运行时 `import()` 组件。

**代价**：`icons.db` 约 57MB（含 SVG 文本）；`generate:icons` 需在 CI/本地执行（已挂 `prebuild`）。

## 项目结构

```
scripts/generate-icons-db.mjs   # 生成 icons.db
src/data/icons.db               # 构建产物
src/app/api/icons/route.ts      # 列表 API
src/components/SvgPreview.tsx   # 内联 SVG 预览
src/lib/icons-db.ts             # SQLite 查询
src/lib/icon-export.ts          # 导出 / 缩放 SVG
src/locales/*.json
```

## 本地开发

```bash
pnpm install
pnpm run generate:icons   # 首次或升级图标库后必须执行
pnpm dev                  # http://localhost:7611
```

| 命令 | 说明 |
|------|------|
| `pnpm build` | 生产构建（prebuild 会重新 generate） |
| `pnpm adapter` | Cloudflare OpenNext 构建 |
| `pnpm preview` | 预览 Worker |

## API

`GET /api/icons?q=&page=&lib=&style=`

响应 `items[]` 含字段：`l`（库）、`p`（包）、`n`（名）、`s`（风格）、`svg`（24px 基准 SVG 字符串）。

## 扩展新图标库

1. 在 `scripts/generate-icons-db.mjs` 增加扫描与 `renderXxxIconSvg()`
2. 更新 `ICON_LIBRARIES` 与 locale
3. 重新 `pnpm run generate:icons`

## 致谢

- [react-icons](https://react-icons.github.io/react-icons/)
- [Material UI Icons](https://mui.com/material-ui/material-icons/)
