// Minimal inline icon set (stroke icons, 24px grid). Server- and client-safe.
const PATHS: Record<string, string> = {
  dashboard: 'M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z',
  articles: 'M4 4h12l4 4v12H4zM8 9h6M8 13h8M8 17h8',
  sections: 'M4 6h16M4 12h16M4 18h10',
  tags: 'M3 12V4h8l10 10-8 8L3 12zM7.5 7.5h.01',
  authors: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  issues: 'M5 3h11l3 3v15H5zM9 7h6M9 11h6',
  video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
  podcast: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  pages: 'M6 3h9l4 4v14H6zM14 3v5h5',
  media: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01',
  home: 'M3 11l9-8 9 8M5 9.5V21h14V9.5',
  nav: 'M4 7h16M4 12h16M4 17h16',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  card: 'M2 6h20v12H2zM2 10h20M6 15h4',
  readers: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-4-6.3',
  inbox: 'M3 13l3-9h12l3 9v7H3zM3 13h5l1 3h6l1-3h5',
  users: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21v-1a7 7 0 0 1 14 0v1M19 8l2 2 3-3',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  logout: 'M15 4h4v16h-4M10 17l5-5-5-5M15 12H3',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M6 6l12 12M18 6L6 18',
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M19 12l-7 7-7-7',
  check: 'M5 12l5 5L20 7',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  image: 'M3 5h18v14H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 19',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  grip: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01',
  chevron: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 3',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  duplicate: 'M8 8h12v12H8zM4 16V4h12M14 11v6M11 14h6',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  dot: 'M12 12h.01',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  quote: 'M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6',
  listBullet: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',
  listOrdered: 'M10 6h11M10 12h11M10 18h11M4 4v4M3 18h3l-3 3h3M3 12.5a1.5 1.5 0 1 1 3 0L3 15h3',
  hr: 'M3 12h18',
  unlink: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-5.7-8M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 5.7 8M3 3l18 18',
  calendar: 'M4 5h16v16H4zM4 10h16M9 3v4M15 3v4',
  play: 'M7 4l13 8-13 8z',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className, strokeWidth = 1.8 }: { name: IconName | string; size?: number; className?: string; strokeWidth?: number }) {
  const d = PATHS[name] ?? PATHS.dot;
  return (
    <svg
      className={className ? `adm-icon ${className}` : 'adm-icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
