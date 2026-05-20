import type { SvgIconComponent } from "@mui/icons-material";

import { muiIconLoadersA } from "./A";
import { muiIconLoadersB } from "./B";
import { muiIconLoadersC } from "./C";
import { muiIconLoadersD } from "./D";
import { muiIconLoadersE } from "./E";
import { muiIconLoadersF } from "./F";
import { muiIconLoadersG } from "./G";
import { muiIconLoadersH } from "./H";
import { muiIconLoadersI } from "./I";
import { muiIconLoadersJ } from "./J";
import { muiIconLoadersK } from "./K";
import { muiIconLoadersL } from "./L";
import { muiIconLoadersM } from "./M";
import { muiIconLoadersN } from "./N";
import { muiIconLoadersO } from "./O";
import { muiIconLoadersP } from "./P";
import { muiIconLoadersQ } from "./Q";
import { muiIconLoadersR } from "./R";
import { muiIconLoadersS } from "./S";
import { muiIconLoadersT } from "./T";
import { muiIconLoadersU } from "./U";
import { muiIconLoadersV } from "./V";
import { muiIconLoadersW } from "./W";
import { muiIconLoadersX } from "./X";
import { muiIconLoadersY } from "./Y";
import { muiIconLoadersZ } from "./Z";

const loaderGroups: Record<string, Record<string, () => Promise<{ default: SvgIconComponent }>>> = {
  "A": muiIconLoadersA,
  "B": muiIconLoadersB,
  "C": muiIconLoadersC,
  "D": muiIconLoadersD,
  "E": muiIconLoadersE,
  "F": muiIconLoadersF,
  "G": muiIconLoadersG,
  "H": muiIconLoadersH,
  "I": muiIconLoadersI,
  "J": muiIconLoadersJ,
  "K": muiIconLoadersK,
  "L": muiIconLoadersL,
  "M": muiIconLoadersM,
  "N": muiIconLoadersN,
  "O": muiIconLoadersO,
  "P": muiIconLoadersP,
  "Q": muiIconLoadersQ,
  "R": muiIconLoadersR,
  "S": muiIconLoadersS,
  "T": muiIconLoadersT,
  "U": muiIconLoadersU,
  "V": muiIconLoadersV,
  "W": muiIconLoadersW,
  "X": muiIconLoadersX,
  "Y": muiIconLoadersY,
  "Z": muiIconLoadersZ,
};

export async function loadMuiIcon(name: string): Promise<SvgIconComponent | null> {
  const group = loaderGroups[name[0]];
  if (!group) return null;
  const loader = group[name];
  if (!loader) return null;
  try {
    const mod = await loader();
    return mod.default ?? null;
  } catch {
    return null;
  }
}
