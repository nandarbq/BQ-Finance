import type { CSSProperties, ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import defaultRobotAvatar from "../assets/avatar robot bq finance.png";

/**
 * Ikon kustom label built-in "Bersama": ayah, ibu bergaun, dan anak di tengah
 * yang saling menggenggam tangan — simbol keluarga. Lucide tidak punya ikon
 * keluarga; dibuat gaya serupa (viewBox 24x24, isi `fill` mengikuti `color`).
 */
const FamilyGroupIcon: ComponentType<{ size?: number; color?: string }> = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" focusable="false">
    <circle cx="5" cy="6" r="2.5" />
    <path d="M1.6 22v-7.6c0-3.6 1.5-6.4 3.4-6.4s3.4 2.8 3.4 6.4V22H1.6z" />
    <circle cx="12" cy="10.4" r="2.1" />
    <path d="M9.7 22v-5.3c0-2.9 1-5.1 2.3-5.1s2.3 2.2 2.3 5.1V22H9.7z" />
    <circle cx="20" cy="6.4" r="2.5" />
    <path d="M16.8 22l.8-8.6c.3-2.6 1.2-4.8 2.4-4.8s2.1 2.2 2.4 4.8l.8 8.6h-6.4z" />
    <rect x="7.7" y="13.6" width="2.9" height="1.7" rx=".85" />
    <rect x="13.7" y="13.6" width="4" height="1.7" rx=".85" />
  </svg>
);

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  ring?: boolean;
  /** URL foto profil. Kalau ada, tampil foto; kalau tidak, tetap inisial. */
  src?: string | null;
  innerId?: string;
  /** Ikon pengganti inisial (mis. FamilyGroupIcon untuk label "Bersama"). */
  icon?: ComponentType<{ size?: number; color?: string }>;
}

function Avatar({ name, color, size = 32, ring = false, src, innerId, icon }: AvatarProps) {
  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "999px",
    flexShrink: 0,
    boxShadow: ring ? "0 0 0 2px var(--bg-app), 0 0 0 4px " + color : "none",
  };

  if (src) {
    return (
      <img
        key={innerId}
        src={src}
        alt={name || "Foto profil"}
        referrerPolicy="no-referrer"
        style={{ ...base, objectFit: "cover" }}
      />
    );
  }

  const circle: CSSProperties = {
    ...base,
    background: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--bg-app)",
  };

  if (icon) {
    const Icon = icon;
    return (
      <div style={circle} role="img" aria-label={name || "Label anggota"}>
        <Icon size={Math.round(size * 0.5)} color="var(--bg-app)" />
      </div>
    );
  }

  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      style={{
        ...circle,
        fontWeight: 700,
        fontSize: size * 0.42,
        fontFamily: "'Sora', sans-serif",
      }}
    >
      {initial}
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <div
        className="flex items-center justify-center mb-3"
        style={{ width: 56, height: 56, borderRadius: 18, background: "var(--bg-muted)" }}
      >
        <Icon size={24} color="var(--text-muted)" />
      </div>
      <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>{title}</p>
      {subtitle ? (
        <p style={{ color: "var(--text-muted)", fontSize: 12.5, marginTop: 4, maxWidth: 220 }}>{subtitle}</p>
      ) : null}
    </div>
  );
}

interface ProfileAvatarProps {
  avatar: string | null;
  size?: number;
  innerId?: string;
}

function ProfileAvatar({ avatar, size = 36, innerId }: ProfileAvatarProps) {
  const style = {
    width: size,
    height: size,
    borderRadius: "999px",
    overflow: "hidden",
    flexShrink: 0,
    display: "block",
  };
  if (avatar) {
    return (
      <img
        key={innerId}
        src={avatar}
        alt="Foto profil"
        referrerPolicy="no-referrer"
        style={{ ...style, objectFit: "cover" }}
      />
    );
  }
  return (
    <img
      src={defaultRobotAvatar}
      alt="Avatar robot BQ Finance"
      style={{ ...style, objectFit: "contain", objectPosition: "center" }}
    />
  );
}

function SkeletonBlock({ style }: { style: CSSProperties }) {
  return <div className="bqfinance-skeleton" style={{ background: "var(--bg-muted)", borderRadius: 10, ...style }} />;
}

function LoadingSkeleton() {
  return (
    <div className="px-4 pt-1 pb-4">
      <div className="rounded-3xl px-5 pt-5 pb-6 mb-4" style={{ background: "var(--bg-app)" }}>
        <SkeletonBlock style={{ height: 12, width: 90 }} />
        <SkeletonBlock style={{ height: 30, width: 160, marginTop: 12 }} />
        <div className="flex items-center gap-4 mt-5">
          <SkeletonBlock style={{ height: 34, width: 120 }} />
          <SkeletonBlock style={{ height: 34, width: 120 }} />
        </div>
      </div>
      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
        <SkeletonBlock style={{ height: 13, width: 160 }} />
        <div className="flex items-center gap-3 mt-4">
          <SkeletonBlock style={{ height: 84, width: 84, borderRadius: 999 }} />
          <div className="flex-1">
            <SkeletonBlock style={{ height: 22, width: "70%" }} />
            <SkeletonBlock style={{ height: 22, width: "45%", marginTop: 8 }} />
          </div>
        </div>
      </div>
      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
        <SkeletonBlock style={{ height: 13, width: 140 }} />
        <div className="flex flex-col gap-3 mt-4">
          <SkeletonBlock style={{ height: 18, width: "100%" }} />
          <SkeletonBlock style={{ height: 18, width: "100%" }} />
          <SkeletonBlock style={{ height: 18, width: "100%" }} />
        </div>
      </div>
      <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)" }}>
        <SkeletonBlock style={{ height: 13, width: 130 }} />
        <div className="flex flex-col gap-3 mt-3">
          <SkeletonBlock style={{ height: 34, width: "100%" }} />
          <SkeletonBlock style={{ height: 34, width: "100%" }} />
          <SkeletonBlock style={{ height: 34, width: "100%" }} />
        </div>
      </div>
    </div>
  );
}

export { Avatar, EmptyState, ProfileAvatar, SkeletonBlock, LoadingSkeleton, FamilyGroupIcon };
