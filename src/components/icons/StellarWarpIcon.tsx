interface IconProps {
  className?: string;
}

/**
 * Original stylized "warp pass" ticket mark for the HSR watermark —
 * a perforated ticket shape with a cyan gradient and a central sparkle,
 * evoking a boarding pass / star-rail ticket without copying any
 * specific copyrighted game asset.
 */
export function StellarWarpIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="warp-cyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7DD3F0" />
          <stop offset="100%" stopColor="#3B8FC4" />
        </linearGradient>
      </defs>

      <rect x="6" y="14" width="108" height="52" rx="10" fill="url(#warp-cyan)" />
      {/* Perforation notches */}
      <circle cx="40" cy="14" r="6" fill="#100E27" />
      <circle cx="40" cy="66" r="6" fill="#100E27" />
      {/* Dashed divider */}
      <line x1="40" y1="22" x2="40" y2="58" stroke="#100E27" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
      {/* Central sparkle */}
      <path d="M78 32 L82 39 L89 43 L82 47 L78 54 L74 47 L67 43 L74 39 Z" fill="#F3EFFC" />
      {/* Small orbiting star */}
      <path d="M20 34 L21.5 37.5 L25 39 L21.5 40.5 L20 44 L18.5 40.5 L15 39 L18.5 37.5 Z" fill="#F3EFFC" opacity="0.8" />
    </svg>
  );
}
