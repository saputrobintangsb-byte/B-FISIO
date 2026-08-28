import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'dark' | 'light' | 'white';
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = 'w-9 h-9',
  size,
  variant = 'dark',
}) => {
  const style = size ? { width: size, height: size } : undefined;

  // Outer circle background and inner shape color based on context
  const circleColor = variant === 'light' ? '#FFFFFF' : '#0B132B';
  const shapeColor = variant === 'light' ? '#0B132B' : '#FFFFFF';

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      style={style}
    >
      <defs>
        {/* Slit mask cutting through the full circle */}
        <mask id="logo-slit-mask">
          <rect width="200" height="200" fill="white" />
          {/* Slanted slit dividing line from top to bottom */}
          <polygon points="102,-10 106,-10 94,210 90,210" fill="black" />
        </mask>
      </defs>

      {/* Outer Circle divided by the slanted line */}
      <circle
        cx="100"
        cy="100"
        r="90"
        fill={circleColor}
        mask="url(#logo-slit-mask)"
      />

      {/* 4 Inner White Petals / Monogram Lobes forming the central star cross */}
      <g fill={shapeColor}>
        {/* 1. Top-Left Lobe */}
        <path
          d="M 79 66
             C 74 66 74 72 74 76
             L 74 95
             C 80 95 90 94 95.5 93.5
             L 98.8 66
             Z"
        />

        {/* 2. Top-Right Lobe (Upper bulb of 'B' / Clover petal) */}
        <path
          d="M 102.5 66
             L 100 93.5
             C 105 94 115 94 122 93
             C 129 91 131 84 131 79.5
             C 131 71.5 125 66 115 66
             Z"
        />

        {/* 3. Bottom-Left Lobe (Lower petal with rounded bottom-left corner) */}
        <path
          d="M 68 98.5
             L 94 97
             L 90.5 130
             L 77 130
             C 71 130 68 126 68 120
             Z"
        />

        {/* 4. Bottom-Right Lobe (Lower bulb of 'B' with downward tail stem) */}
        <path
          d="M 98 97
             C 104 97 114 97 121 98
             C 128 100 130 106 130 112
             C 130 120 125 128 114 128
             L 97 128
             L 92.5 152
             L 95 152
             L 98 97
             Z"
        />
      </g>
    </svg>
  );
};
