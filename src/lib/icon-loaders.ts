import type { IconType } from "react-icons";
import type { SvgIconComponent } from "@mui/icons-material";
import { loadMuiIcon as loadMuiIconFromIndex } from "@/lib/mui-loaders";

type IconModule = Record<string, unknown>;
export type AnyIcon = IconType | SvgIconComponent;

export const reactIconPackageLoaders: Record<string, () => Promise<IconModule>> = {
  ai: () => import("react-icons/ai"),
  bi: () => import("react-icons/bi"),
  bs: () => import("react-icons/bs"),
  cg: () => import("react-icons/cg"),
  ci: () => import("react-icons/ci"),
  di: () => import("react-icons/di"),
  fa: () => import("react-icons/fa"),
  fa6: () => import("react-icons/fa6"),
  fc: () => import("react-icons/fc"),
  fi: () => import("react-icons/fi"),
  gi: () => import("react-icons/gi"),
  go: () => import("react-icons/go"),
  gr: () => import("react-icons/gr"),
  hi: () => import("react-icons/hi"),
  hi2: () => import("react-icons/hi2"),
  im: () => import("react-icons/im"),
  io: () => import("react-icons/io"),
  io5: () => import("react-icons/io5"),
  lia: () => import("react-icons/lia"),
  lu: () => import("react-icons/lu"),
  md: () => import("react-icons/md"),
  pi: () => import("react-icons/pi"),
  ri: () => import("react-icons/ri"),
  rx: () => import("react-icons/rx"),
  si: () => import("react-icons/si"),
  sl: () => import("react-icons/sl"),
  tb: () => import("react-icons/tb"),
  tfi: () => import("react-icons/tfi"),
  ti: () => import("react-icons/ti"),
  vsc: () => import("react-icons/vsc"),
  wi: () => import("react-icons/wi"),
};

export async function loadReactIcon(pkg: string, name: string): Promise<IconType | null> {
  const loader = reactIconPackageLoaders[pkg];
  if (!loader) return null;
  const mod = await loader();
  const component = mod[name];
  return typeof component === "function" ? (component as IconType) : null;
}

export async function loadMuiIcon(name: string): Promise<SvgIconComponent | null> {
  return loadMuiIconFromIndex(name);
}

export async function loadIcon(
  lib: string,
  pkg: string,
  name: string,
): Promise<AnyIcon | null> {
  if (lib === "mui") return loadMuiIcon(name);
  return loadReactIcon(pkg, name);
}
