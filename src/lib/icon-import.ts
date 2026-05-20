import type { IconEntry } from "@/lib/icons";

/** Example import line shown on the icon detail page. */
export function iconImportLine(icon: IconEntry): string {
  switch (icon.l) {
    case "mui":
      return `import ${icon.n} from "@mui/icons-material/${icon.n}";`;
    case "react-icons":
      return `import { ${icon.n} } from "react-icons/${icon.p}";`;
    case "heroicons":
      return `import { ${icon.n} } from "@heroicons/react/${icon.p}";`;
    case "lucide":
      return `import { ${icon.n} } from "lucide-react";`;
    case "tabler":
      return `import { ${icon.n} } from "@tabler/icons-react";`;
    case "phosphor": {
      const weight = icon.p !== "phosphor" ? icon.p : "regular";
      return `import { ${icon.n} } from "@phosphor-icons/react";\n// <${icon.n} size={24} weight="${weight}" />`;
    }
    case "fontawesome": {
      const pack =
        icon.p === "regular"
          ? "@fortawesome/free-regular-svg-icons"
          : icon.p === "brands"
            ? "@fortawesome/free-brands-svg-icons"
            : "@fortawesome/free-solid-svg-icons";
      return `import { ${icon.n} } from "${pack}";\nimport { FontAwesomeIcon } from "@fortawesome/react-fontawesome";\n// <FontAwesomeIcon icon={${icon.n}} />`;
    }
    case "remix":
      return `import { ${icon.n} } from "@remixicon/react";`;
    case "lineicons":
      return `import { ${icon.n} } from "@lineiconshq/free-icons";`;
    case "svgmoji":
      return `import { ${icon.p === "twemoji" ? "Twemoji" : icon.p === "openmoji" ? "Openmoji" : icon.p === "noto" ? "Notomoji" : "Blobmoji"}, SpriteCollection } from "svgmoji";\n// emoji: ${icon.n} — tw.url("${icon.n}") with SpriteCollection.Individual`;
    default:
      return `${icon.l} / ${icon.p} / ${icon.n}`;
  }
}
