import {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  MoreHorizontal,
  Gift,
  Briefcase,
  TrendingUp,
  Sparkles,
  PiggyBank,
  Trophy,
  BookOpen,
  Plane,
  Music,
  Dumbbell,
  PawPrint,
  Baby,
  Coffee,
  Wifi,
  Zap,
  ShieldCheck,
  Landmark,
  Phone,
  Shirt,
  Stethoscope,
  Camera,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Category, TxType } from "./types";

export const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  MoreHorizontal,
  Gift,
  Briefcase,
  TrendingUp,
  Sparkles,
  PiggyBank,
  Trophy,
  BookOpen,
  Plane,
  Music,
  Dumbbell,
  PawPrint,
  Baby,
  Coffee,
  Wifi,
  Zap,
  ShieldCheck,
  Landmark,
  Phone,
  Shirt,
  Stethoscope,
  Camera,
};

export const CATEGORY_COLORS: { label: string; value: string }[] = [
  { label: "Merah", value: "var(--negative)" },
  { label: "Biru", value: "var(--blue)" },
  { label: "Hijau", value: "var(--cat-green)" },
  { label: "Teal", value: "var(--cat-teal)" },
  { label: "Lime", value: "var(--cat-lime)" },
  { label: "Olive", value: "var(--cat-olive)" },
  { label: "Mint", value: "var(--cat-mint)" },
  { label: "Soft Red", value: "var(--cat-soft-red)" },
  { label: "Dark", value: "var(--cat-dark)" },
  { label: "Abu", value: "var(--text-muted)" },
];

export const MEMBER_COLORS: string[] = [
  "var(--blue)",
  "var(--cat-teal)",
  "var(--negative)",
  "var(--cat-lime)",
  "var(--cat-dark)",
  "var(--positive)",
];

export interface CategoryMeta extends Omit<Category, "icon"> {
  icon: LucideIcon;
}

export function getCatMeta(categories: Category[], type: TxType, catId: string): CategoryMeta {
  const list = categories.filter((c) => c.type === type);
  const found = list.find((c) => c.label.toLowerCase() === String(catId).toLowerCase());
  if (found) return { ...found, icon: ICON_MAP[found.icon] || MoreHorizontal };
  return { id: "", label: catId, icon: MoreHorizontal, color: "var(--text-muted)", isDefault: false, type };
}
