import defaultRobotAvatar from "../assets/avatar robot bq finance.png";

function Avatar({ name, color, size = 32, ring = false }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "999px",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--bg-app)",
        fontWeight: 700,
        fontSize: size * 0.42,
        fontFamily: "'Sora', sans-serif",
        boxShadow: ring ? "0 0 0 2px var(--bg-app), 0 0 0 4px " + color : "none",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
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

function ProfileAvatar({ avatar, size = 36 }) {
  const style = {
    width: size,
    height: size,
    borderRadius: "999px",
    overflow: "hidden",
    flexShrink: 0,
    display: "block",
  };
  if (avatar) {
    return <img src={avatar} alt="Foto profil" referrerPolicy="no-referrer" style={{ ...style, objectFit: "cover" }} />;
  }
  return (
    <img
      src={defaultRobotAvatar}
      alt="Avatar robot BQ Finance"
      style={{ ...style, objectFit: "contain", objectPosition: "center" }}
    />
  );
}

function SkeletonBlock({ style }) {
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

export { Avatar, EmptyState, ProfileAvatar, SkeletonBlock, LoadingSkeleton };
