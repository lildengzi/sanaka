import React from 'react';

interface BilibiliIconProps {
  size?: number;
  className?: string;
}

export const BilibiliIcon: React.FC<BilibiliIconProps> = ({ 
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
      {/* 左天线 */}
      <path d="M7 4L9 7" />
      {/* 右天线 */}
      <path d="M17 4L15 7" />
      {/* 电视主体外框 */}
      <rect x="4" y="7" width="16" height="12" rx="2" />
      {/* 左眼睛 */}
      <path d="M8 11v4" />
      {/* 右眼睛 */}
      <path d="M16 11v4" />
      {/* 嘴巴 */}
      <path d="M11 13h2" />
      {/* 底座 */}
      <path d="M9 19l-1 3h8l-1-3" />
    </svg>
  );
};
