import { exportFromSvgMarkup, scaleSvgMarkup, type IconFormat } from "@/lib/icon-export";

export { scaleSvgMarkup, exportFromSvgMarkup };
export type { IconFormat };

export async function copySvgMarkup(svg: string, size = 24): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(scaleSvgMarkup(svg, size));
    return true;
  } catch {
    return false;
  }
}
