
import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

const Logo: React.FC<LogoProps> = ({ className, size, style, ...props }) => {
  // ID único para evitar conflitos de gradiente se houver múltiplos SVGs
  const gradientId = "logo_gradient_fill"; 

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 522 495"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      {...props}
    >
      <path 
        d="M378.318 0C463.543 42.9573 522 131.257 522 233.21C522 377.356 405.146 494.21 261 494.21C258.895 494.21 256.797 494.183 254.704 494.134C320.821 406.621 374.023 309.997 412.622 207.217L418.734 190.907C419.65 188.474 419.961 185.854 419.643 183.273C419.324 180.693 418.383 178.228 416.903 176.09C415.423 173.952 413.447 172.204 411.144 170.997C408.84 169.79 406.279 169.16 403.679 169.16H316.402L378.318 0ZM106.312 22.9688C101.398 90.8925 101.952 159.113 107.974 226.97L111.931 271.428C112.284 275.433 114.126 279.161 117.091 281.876C120.056 284.591 123.931 286.097 127.951 286.098H194.575V485.681C82.6009 456.3 0 354.402 0 233.21C0 146.965 41.8315 70.4905 106.312 22.9688Z" 
        fill={`url(#${gradientId})`} 
      />
      <defs>
        <linearGradient 
          id={gradientId} 
          x1="128" 
          y1="58.211" 
          x2="435.5" 
          y2="576.211" 
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#327AE1"/>
          <stop offset="1" stopColor="#1B437B"/>
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Logo;
