import { serializeSvg, getSvgElement } from "@/lib/icon-export";

export function getSvgMarkupFromContainer(
  container: HTMLElement,
  size = 24,
): string | null {
  const svg = getSvgElement(container);
  if (!svg) return null;
  return serializeSvg(svg, size);
}

export async function copySvgFromContainer(
  container: HTMLElement,
  size = 24,
): Promise<boolean> {
  const markup = getSvgMarkupFromContainer(container, size);
  if (!markup) return false;
  try {
    await navigator.clipboard.writeText(markup);
    return true;
  } catch {
    return false;
  }
}
