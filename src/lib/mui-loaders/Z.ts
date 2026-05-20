import type { SvgIconComponent } from "@mui/icons-material";

export const muiIconLoadersZ: Record<string, () => Promise<{ default: SvgIconComponent }>> = {
  "ZoomIn": () => import("@mui/icons-material/ZoomIn"),
  "ZoomInMap": () => import("@mui/icons-material/ZoomInMap"),
  "ZoomInMapOutlined": () => import("@mui/icons-material/ZoomInMapOutlined"),
  "ZoomInMapRounded": () => import("@mui/icons-material/ZoomInMapRounded"),
  "ZoomInMapSharp": () => import("@mui/icons-material/ZoomInMapSharp"),
  "ZoomInMapTwoTone": () => import("@mui/icons-material/ZoomInMapTwoTone"),
  "ZoomInOutlined": () => import("@mui/icons-material/ZoomInOutlined"),
  "ZoomInRounded": () => import("@mui/icons-material/ZoomInRounded"),
  "ZoomInSharp": () => import("@mui/icons-material/ZoomInSharp"),
  "ZoomInTwoTone": () => import("@mui/icons-material/ZoomInTwoTone"),
  "ZoomOut": () => import("@mui/icons-material/ZoomOut"),
  "ZoomOutMap": () => import("@mui/icons-material/ZoomOutMap"),
  "ZoomOutMapOutlined": () => import("@mui/icons-material/ZoomOutMapOutlined"),
  "ZoomOutMapRounded": () => import("@mui/icons-material/ZoomOutMapRounded"),
  "ZoomOutMapSharp": () => import("@mui/icons-material/ZoomOutMapSharp"),
  "ZoomOutMapTwoTone": () => import("@mui/icons-material/ZoomOutMapTwoTone"),
  "ZoomOutOutlined": () => import("@mui/icons-material/ZoomOutOutlined"),
  "ZoomOutRounded": () => import("@mui/icons-material/ZoomOutRounded"),
  "ZoomOutSharp": () => import("@mui/icons-material/ZoomOutSharp"),
  "ZoomOutTwoTone": () => import("@mui/icons-material/ZoomOutTwoTone"),
};
