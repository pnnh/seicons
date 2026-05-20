export const ICON_SIZES = [8, 16, 32, 64, 128, 256] as const;
export type IconSize = (typeof ICON_SIZES)[number];

export const ICON_FORMATS = ["svg", "png", "jpg", "webp"] as const;
export type IconFormat = (typeof ICON_FORMATS)[number];


/** Larger on-screen preview; export still uses the selected export size. */
const PREVIEW_DISPLAY_SIZE: Record<IconSize, number> = {
  8: 88,
  16: 104,
  32: 120,
  64: 144,
  128: 176,
  256: 208,
};

export function iconPreviewDisplaySize(exportSize: IconSize): number {
  return PREVIEW_DISPLAY_SIZE[exportSize];
}

const COLOR_ATTRS = ["fill", "stroke"] as const;

export function getSvgElement(container: HTMLElement): SVGElement | null {
  return container.querySelector("svg");
}

/** Resolve currentColor and size so exported assets keep a transparent background. */
function applyResolvedColors(root: Element, color: string) {
  const visit = (el: Element) => {
    for (const attr of COLOR_ATTRS) {
      if (el.getAttribute(attr) === "currentColor") {
        el.setAttribute(attr, color);
      }
    }

    const style = el.getAttribute("style");
    if (style?.includes("currentColor")) {
      el.setAttribute("style", style.replace(/currentColor/g, color));
    }

    el.childNodes.forEach((child) => {
      if (child instanceof Element) visit(child);
    });
  };

  visit(root);
}


/** Pure-string SVG resize — same output on server and client (avoids hydration mismatch). */
export function scaleSvgMarkup(svg: string, size: number): string {
  const sizeStr = String(size);
  return svg.replace(/<svg\b([^>]*)>/i, (_, attrs: string) => {
    let next = attrs
      .replace(/\swidth="[^"]*"/gi, "")
      .replace(/\sheight="[^"]*"/gi, "");
    if (!/\sxmlns=/i.test(next)) {
      next = ` xmlns="http://www.w3.org/2000/svg"${next}`;
    }
    return `<svg${next} width="${sizeStr}" height="${sizeStr}">`;
  });
}

export function prepareSvgForExport(svg: SVGElement, size: number): string {
  const color = getComputedStyle(svg).color || "#000000";
  const clone = svg.cloneNode(true) as SVGElement;

  applyResolvedColors(clone, color);

  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));

  const viewBox = svg.getAttribute("viewBox");
  if (!clone.getAttribute("viewBox") && viewBox) {
    clone.setAttribute("viewBox", viewBox);
  }

  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  // Do not bake in an opaque background — transparency is preserved outside paths.
  clone.removeAttribute("background");
  clone.style.background = "transparent";

  return new XMLSerializer().serializeToString(clone);
}

export function serializeSvg(svg: SVGElement, size: number): string {
  return prepareSvgForExport(svg, size);
}

function loadSvgImage(svgString: string): Promise<HTMLImageElement> {
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to render SVG"));
    img.src = dataUrl;
  });
}

export async function svgElementToBlob(
  svg: SVGElement,
  size: number,
  format: IconFormat,
): Promise<Blob> {
  const svgString = prepareSvgForExport(svg, size);

  if (format === "svg") {
    return new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas not supported");

  const preserveAlpha = format === "png" || format === "webp";

  if (preserveAlpha) {
    ctx.clearRect(0, 0, size, size);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
  }

  const img = await loadSvgImage(svgString);
  ctx.drawImage(img, 0, 0, size, size);

  const mime =
    format === "png"
      ? "image/png"
      : format === "jpg"
        ? "image/jpeg"
        : "image/webp";

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mime, format === "jpg" ? 0.92 : undefined);
  });

  if (!blob) throw new Error("Failed to encode image");
  return blob;
}


export async function exportFromSvgMarkup(
  svg: string,
  size: number,
  format: IconFormat,
): Promise<Blob> {
  const scaled = scaleSvgMarkup(svg, size);

  if (format === "svg") {
    return new Blob([scaled], { type: "image/svg+xml;charset=utf-8" });
  }

  const container = document.createElement("div");
  container.innerHTML = scaled;
  const el = container.querySelector("svg");
  if (!el) throw new Error("Invalid SVG markup");
  return svgElementToBlob(el, size, format);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportFilename(name: string, size: number, format: IconFormat) {
  return `${name}-${size}.${format}`;
}
