import React from 'react';

export const MatrackLogo = ({ size = 'md', showText = true, className = '' }) => {
  const sizeMap = {
    sm: { icon: 'w-6 h-6', text: 'text-sm' },
    md: { icon: 'w-8 h-8', text: 'text-base' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl' },
    xl: { icon: 'w-16 h-16', text: 'text-3xl' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* Dynamic Vector Logo Squircle */}
      <div className={`relative ${currentSize.icon} shrink-0 group`}>
        <svg
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="logoNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="logoAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>

          {/* Squircle base */}
          <rect
            x="32"
            y="32"
            width="448"
            height="448"
            rx="112"
            fill="url(#logoBgGrad)"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="8"
          />

          {/* Stylized M with Tracks & Center Flow */}
          <rect x="116" y="148" width="60" height="216" rx="30" fill="url(#logoNeonGrad)" />
          <path
            d="M146 178 L256 288 C262 294 272 294 278 288 L366 178"
            stroke="url(#logoNeonGrad)"
            strokeWidth="56"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="336" y="148" width="60" height="216" rx="30" fill="url(#logoAccentGrad)" />

          {/* Center Orb */}
          <circle cx="256" cy="216" r="28" fill="#ffffff" />
          <circle cx="256" cy="216" r="16" fill="url(#logoNeonGrad)" />

          {/* Productivity 3-Dots */}
          <circle cx="180" cy="404" r="12" fill="#f59e0b" />
          <circle cx="256" cy="404" r="12" fill="#3b82f6" />
          <circle cx="332" cy="404" r="12" fill="#10b981" />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <span
          className={`font-black tracking-wider bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent ${currentSize.text}`}
        >
          MATRACK
        </span>
      )}
    </div>
  );
};
