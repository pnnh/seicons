import type { SvgIconComponent } from "@mui/icons-material";

export const muiIconLoadersY: Record<string, () => Promise<{ default: SvgIconComponent }>> = {
  "Yard": () => import("@mui/icons-material/Yard"),
  "YardOutlined": () => import("@mui/icons-material/YardOutlined"),
  "YardRounded": () => import("@mui/icons-material/YardRounded"),
  "YardSharp": () => import("@mui/icons-material/YardSharp"),
  "YardTwoTone": () => import("@mui/icons-material/YardTwoTone"),
  "YouTube": () => import("@mui/icons-material/YouTube"),
  "YoutubeSearchedFor": () => import("@mui/icons-material/YoutubeSearchedFor"),
  "YoutubeSearchedForOutlined": () => import("@mui/icons-material/YoutubeSearchedForOutlined"),
  "YoutubeSearchedForRounded": () => import("@mui/icons-material/YoutubeSearchedForRounded"),
  "YoutubeSearchedForSharp": () => import("@mui/icons-material/YoutubeSearchedForSharp"),
  "YoutubeSearchedForTwoTone": () => import("@mui/icons-material/YoutubeSearchedForTwoTone"),
};
