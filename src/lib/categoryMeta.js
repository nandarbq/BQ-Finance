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

const ICON_MAP = {
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

const CATEGORY_COLORS = [
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

const MEMBER_COLORS = [
  "var(--blue)",
  "var(--cat-teal)",
  "var(--negative)",
  "var(--cat-lime)",
  "var(--cat-dark)",
  "var(--positive)",
];

function getCatMeta(categories, type, catId) {
  const list = categories.filter((c) => c.type === type);
  const found = list.find((c) => c.label.toLowerCase() === String(catId).toLowerCase());
  if (found) return { ...found, icon: ICON_MAP[found.icon] || MoreHorizontal };
  return { label: catId, icon: MoreHorizontal, color: "var(--text-muted)", isDefault: false };
}

export { ICON_MAP, CATEGORY_COLORS, MEMBER_COLORS, getCatMeta };
