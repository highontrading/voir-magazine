import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const MenuIcon = (p: P) => (<svg {...base} {...p}><path d="M3 6h18M3 12h18M3 18h18" /></svg>);
export const SearchIcon = (p: P) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const CloseIcon = (p: P) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const ArrowRight = (p: P) => (<svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const ArrowLeft = (p: P) => (<svg {...base} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>);
export const ArrowUp = (p: P) => (<svg {...base} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>);
export const PlayIcon = (p: P) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>);
export const BookmarkIcon = ({ filled, ...p }: P & { filled?: boolean }) => (<svg {...base} fill={filled ? 'currentColor' : 'none'} {...p}><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>);
export const LinkIcon = (p: P) => (<svg {...base} {...p}><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" /></svg>);
export const MailIcon = (p: P) => (<svg {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m3 7 9 6 9-6" /></svg>);
export const UserIcon = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>);
export const HeadphonesIcon = (p: P) => (<svg {...base} {...p}><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><rect x="3" y="14" width="4" height="7" rx="1" /><rect x="17" y="14" width="4" height="7" rx="1" /></svg>);

const solid = { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true };
export const XLogo = (p: P) => (<svg {...solid} {...p}><path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.42 4.72H5.6l11.07 14.48Z" /></svg>);
export const FacebookLogo = (p: P) => (<svg {...solid} {...p}><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46h1.6V4.46A21 21 0 0 0 14.27 4.3c-2.3 0-3.87 1.4-3.87 3.97v2.23H7.8v3h2.6V21h3.1Z" /></svg>);
export const InstagramLogo = (p: P) => (<svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" /></svg>);
export const YouTubeLogo = (p: P) => (<svg {...solid} {...p}><path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" /></svg>);
export const TikTokLogo = (p: P) => (<svg {...solid} {...p}><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.77a5.7 5.7 0 1 0 4.91 5.63V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.24-1.48Z" /></svg>);
export const PinterestLogo = (p: P) => (<svg {...solid} {...p}><path d="M12 2a10 10 0 0 0-3.64 19.3c-.09-.78-.17-1.98.03-2.84l1.17-4.97s-.3-.6-.3-1.48c0-1.39.8-2.42 1.8-2.42.85 0 1.26.64 1.26 1.4 0 .85-.54 2.13-.82 3.31-.24.99.5 1.8 1.47 1.8 1.77 0 3.12-1.86 3.12-4.55 0-2.38-1.71-4.04-4.15-4.04-2.83 0-4.49 2.12-4.49 4.31 0 .86.33 1.77.74 2.27.08.1.09.18.07.28l-.28 1.12c-.04.18-.14.22-.33.13-1.24-.58-2.02-2.4-2.02-3.86 0-3.14 2.28-6.03 6.58-6.03 3.46 0 6.14 2.46 6.14 5.75 0 3.43-2.16 6.2-5.17 6.2-1.01 0-1.96-.53-2.28-1.15l-.62 2.37c-.23.87-.84 1.96-1.25 2.62A10 10 0 1 0 12 2Z" /></svg>);
export const LinkedInLogo = (p: P) => (<svg {...solid} {...p}><path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.44 13.4c0-3.1-1.66-4.9-4.17-4.9a3.6 3.6 0 0 0-3.25 1.79V8.5H9.66V20h3.37v-6.08c0-1.6.3-3.15 2.29-3.15 1.96 0 1.99 1.83 1.99 3.25V20h3.37l-.24-6.6Z" /></svg>);
