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
] as const;

export const ICON_STYLES = [
  { id: "", key: "styleAll" },
  { id: "filled", key: "styleFilled" },
  { id: "outlined", key: "styleOutlined" },
  { id: "rounded", key: "styleRounded" },
  { id: "sharp", key: "styleSharp" },
  { id: "two-tone", key: "styleTwoTone" },
] as const;

export type IconsQueryResult = {
  items: IconEntry[];
  page: number;
  totalPages: number;
  total: number;
};
