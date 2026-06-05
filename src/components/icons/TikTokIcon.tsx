import React from 'react';

interface TikTokIconProps {
  size?: number;
  className?: string;
}

export const TikTokIcon: React.FC<TikTokIconProps> = ({ 
  size = 32, 
  className = '' 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 音符主体轮廓 */}
      <path d="M9 12a4 4 0 1 0 4 4V4c0 1.5 1.5 3 4 3" />
    </svg>
  );
};
