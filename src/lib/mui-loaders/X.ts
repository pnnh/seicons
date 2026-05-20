import type { SvgIconComponent } from "@mui/icons-material";

export const muiIconLoadersX: Record<string, () => Promise<{ default: SvgIconComponent }>> = {
  "X": () => import("@mui/icons-material/X"),
};
