export type Role = 'admin' | 'editor' | 'writer';
export type ArticleStatus = 'draft' | 'review' | 'published' | 'scheduled' | 'archived';
export type ArticleType = 'story' | 'feature' | 'gallery' | 'review' | 'interview';
export type HeroLayout = 'standard' | 'full' | 'split';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  active: number;
  last_login: string | null;
  created_at: string;
}

export interface Section {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  position: number;
  in_nav: number;
  hero_image: string;
  seo_title: string;
  seo_description: string;
  created_at: string;
  article_count?: number;
}

export interface Author {
  id: number;
  name: string;
  slug: string;
  title: string;
  bio: string;
  photo: string;
  email: string;
  twitter: string;
  instagram: string;
  website: string;
  on_masthead: number;
  position: number;
  created_at: string;
  article_count?: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  description: string;
  article_count?: number;
}

export interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  dek: string;
  rubric: string;
  body: string;
  section_id: number | null;
  issue_id: number | null;
  type: ArticleType;
  hero_image: string;
  hero_caption: string;
  hero_credit: string;
  hero_layout: HeroLayout;
  status: ArticleStatus;
  published_at: string | null;
  featured: number;
  top_story: number;
  editors_pick: number;
  allow_index: number;
  reading_time: number;
  views: number;
  seo_title: string;
  seo_description: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/** An article joined with its section and authors – what the UI renders. */
export interface Article extends ArticleRow {
  section_name: string | null;
  section_slug: string | null;
  authors: Pick<Author, 'id' | 'name' | 'slug' | 'title' | 'photo' | 'bio'>[];
  tags?: Pick<Tag, 'id' | 'name' | 'slug'>[];
}

export interface Issue {
  id: number;
  title: string;
  slug: string;
  issue_date: string;
  cover_image: string;
  cover_line: string;
  description: string;
  cover_story_id: number | null;
  published: number;
  created_at: string;
}

export interface Video {
  id: number;
  title: string;
  slug: string;
  description: string;
  section_id: number | null;
  section_name?: string | null;
  section_slug?: string | null;
  series: string;
  duration: string;
  video_url: string;
  thumbnail: string;
  status: 'draft' | 'published';
  featured: number;
  views: number;
  published_at: string | null;
  created_at: string;
}

export interface Podcast {
  id: number;
  title: string;
  slug: string;
  description: string;
  host: string;
  cover_image: string;
  apple_url: string;
  spotify_url: string;
  position: number;
  active: number;
  created_at: string;
  episode_count?: number;
}

export interface Episode {
  id: number;
  podcast_id: number;
  title: string;
  slug: string;
  description: string;
  audio_url: string;
  duration: string;
  image: string;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  podcast_title?: string;
  podcast_slug?: string;
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  intro: string;
  body: string;
  status: 'draft' | 'published';
  seo_description: string;
  updated_at: string;
  created_at: string;
}

export type MenuName = 'header' | 'hamburger' | 'footer' | 'footer_legal' | 'social';

export interface NavItem {
  id: number;
  menu: MenuName;
  label: string;
  url: string;
  position: number;
  new_tab: number;
}

export interface Newsletter {
  id: number;
  name: string;
  slug: string;
  description: string;
  frequency: string;
  image: string;
  active: number;
  position: number;
  subscriber_count?: number;
}

export interface Subscriber {
  id: number;
  email: string;
  newsletter_id: number;
  newsletter_name?: string;
  source: string;
  created_at: string;
}

export interface Plan {
  id: number;
  name: string;
  price: string;
  interval: string;
  description: string;
  features: string; // JSON array of strings
  badge: string;
  highlighted: number;
  active: number;
  position: number;
}

export interface Subscription {
  id: number;
  plan_id: number | null;
  plan_name?: string | null;
  reader_id: number | null;
  name: string;
  email: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  status: 'pending' | 'active' | 'cancelled';
  notes: string;
  created_at: string;
}

export interface Reader {
  id: number;
  name: string;
  email: string;
  active: number;
  created_at: string;
  saved_count?: number;
}

export interface Message {
  id: number;
  name: string;
  email: string;
  subject: string;
  topic: string;
  body: string;
  read: number;
  created_at: string;
}

export interface Media {
  id: number;
  filename: string;
  url: string;
  original_name: string;
  mime: string;
  size: number;
  alt: string;
  credit: string;
  uploaded_by: number | null;
  created_at: string;
}

export interface Activity {
  id: number;
  user_id: number | null;
  user_name?: string | null;
  action: string;
  entity: string;
  entity_id: number | null;
  label: string;
  created_at: string;
}

/* ---------- Site settings (stored as JSON in the settings table) ---------- */

export type HomeBlockType =
  | 'hero'          // lead story + top stories rails
  | 'latest'        // "The Latest" river
  | 'section'       // a section showcase
  | 'popular'       // "Most Popular" numbered list
  | 'video'         // dark video band
  | 'magazine'      // current issue + subscribe promo
  | 'newsletter'    // newsletter sign-up band
  | 'podcasts'      // podcast shows
  | 'editors-picks' // editor's picks carousel
  | 'tag';          // stories with a given tag

export interface HomeBlock {
  id: string;
  type: HomeBlockType;
  enabled: boolean;
  title?: string;
  /** For 'section' blocks: section slug. For 'tag' blocks: tag slug. */
  ref?: string;
  /** Layout variant: 'grid' | 'feature' | 'list' | 'mosaic' */
  layout?: string;
  limit?: number;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  description: string;
  logoText: string;
  logoImage: string;
  accentColor: string;
  inkColor: string;
  paperColor: string;
  announcement: { enabled: boolean; text: string; link: string; linkLabel: string };
  subscribe: { headline: string; text: string; cta: string; offer: string };
  newsletterPromo: { headline: string; text: string };
  footer: { about: string; copyright: string };
  social: { instagram: string; x: string; facebook: string; youtube: string; tiktok: string; pinterest: string };
  seo: { defaultTitle: string; defaultDescription: string; ogImage: string };
  cookieBanner: { enabled: boolean; text: string };
  features: {
    readingProgress: boolean;
    scrollAnimations: boolean;
    breakingTicker: boolean;
    readerAccounts: boolean;
    paywallTeaser: boolean;
    backToTop: boolean;
    darkVideoBand: boolean;
  };
  ticker: { label: string; items: { text: string; url: string }[] };
  homepage: {
    heroArticleId: number | null;
    topStoryIds: number[];
    blocks: HomeBlock[];
  };
  contactEmail: string;
  address: string;
}
