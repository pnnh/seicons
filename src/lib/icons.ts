export type IconEntry = {
  l: string;
  p: string;
  n: string;
  s: string;
  svg: string;
};

export const ICON_PAGE_SIZE = 48;

export const ICON_LIBRARIES = [
  { id: "", key: "libraryAll" },
  { id: "react-icons", key: "libraryReactIcons" },
  { id: "mui", key: "libraryMui" },
  { id: "heroicons", key: "libraryHeroicons" },
  { id: "lucide", key: "libraryLucide" },
  { id: "tabler", key: "libraryTabler" },
  { id: "phosphor", key: "libraryPhosphor" },
  { id: "fontawesome", key: "libraryFontAwesome" },
  { id: "remix", key: "libraryRemix" },
  { id: "lineicons", key: "libraryLineicons" },
  { id: "svgmoji", key: "librarySvgmoji" },
] as const;

/** Styles present in icons.db per library (order matches filter dropdown). */
export const LIBRARY_STYLES: Record<string, readonly string[]> = {
  "react-icons": ["outlined", "filled", "rounded"],
  mui: ["filled", "outlined", "rounded", "sharp", "two-tone"],
  heroicons: ["filled", "outlined"],
  lucide: ["outlined"],
  tabler: ["outlined"],
  phosphor: ["outlined", "filled", "two-tone"],
  fontawesome: ["filled", "outlined"],
  remix: ["outlined", "filled"],
  lineicons: ["outlined", "filled", "two-tone"],
  svgmoji: ["filled"],
};

export const ICON_STYLES = [
  { id: "", key: "styleAll" },
  { id: "filled", key: "styleFilled" },
  { id: "outlined", key: "styleOutlined" },
  { id: "rounded", key: "styleRounded" },
  { id: "sharp", key: "styleSharp" },
  { id: "two-tone", key: "styleTwoTone" },
] as const;

export type IconStyleOption = (typeof ICON_STYLES)[number];

export function getStylesForLibrary(libId: string): readonly string[] {
  return LIBRARY_STYLES[libId] ?? [];
}

/** Show style filter only when a library is selected and it has 2+ styles. */
export function shouldShowStyleFilter(libId: string): boolean {
  return libId !== "" && getStylesForLibrary(libId).length > 1;
}

export function getStyleOptionsForLibrary(libId: string): IconStyleOption[] {
  const ids = getStylesForLibrary(libId);
  if (ids.length <= 1) return [];
  return [
    ICON_STYLES[0],
    ...ICON_STYLES.filter((opt) => opt.id && ids.includes(opt.id)),
  ];
}

export function isStyleValidForLibrary(libId: string, styleId: string): boolean {
  if (!styleId) return true;
  if (!libId) return false;
  return getStylesForLibrary(libId).includes(styleId);
}

export type IconsQueryResult = {
  items: IconEntry[];
  page: number;
  totalPages: number;
  total: number;
};
