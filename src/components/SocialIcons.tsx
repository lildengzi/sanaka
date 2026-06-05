import React from 'react';
import { GitHubIcon, BilibiliIcon, TikTokIcon } from './icons';

interface SocialIconsProps {
  onIconClick: (url: string) => void;
}

const socialLinks = [
  {
    name: 'GitHub',
    url: 'https://github.com/steve372a/sanaka',
    Icon: GitHubIcon,
  },
  {
    name: 'Bilibili',
    url: 'https://space.bilibili.com/430970352',
    Icon: BilibiliIcon,
  },
  {
    name: 'TikTok',
    url: 'https://www.douyin.com/user/MS4wLjABAAAA9qPzmphnYdp2_g0ePrHY3whKslc2gFFErKDgY1lzaoo?from_tab_name=main&vid=7459945209556782396',
    Icon: TikTokIcon,
  },
];

export const SocialIcons: React.FC<SocialIconsProps> = ({ onIconClick }) => {
  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
      {socialLinks.map(({ name, url, Icon }) => (
        <button
          key={name}
          onClick={() => onIconClick(url)}
          title={name}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: '#6B4C8A',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#9B7CB8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#6B4C8A';
          }}
        >
          <Icon size={32} />
        </button>
      ))}
    </div>
  );
};
