import { FacebookLogo, InstagramLogo, PinterestLogo, TikTokLogo, XLogo, YouTubeLogo } from './Icons';

const MAP = {
  instagram: ['Instagram', InstagramLogo],
  x: ['X', XLogo],
  facebook: ['Facebook', FacebookLogo],
  youtube: ['YouTube', YouTubeLogo],
  tiktok: ['TikTok', TikTokLogo],
  pinterest: ['Pinterest', PinterestLogo],
} as const;

export function SocialLinks({ social }: { social: Record<string, string> }) {
  return (
    <div className="social">
      {(Object.keys(MAP) as (keyof typeof MAP)[]).map((k) => {
        const url = social[k];
        if (!url) return null;
        const [label, Icon] = MAP[k];
        return (
          <a key={k} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>
            <Icon />
          </a>
        );
      })}
    </div>
  );
}
