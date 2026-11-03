// Shapes used by the seed content files. The seeder (src/lib/seed/index.ts) turns these into DB rows.

export type SeedArticle = {
  slug: string;              // kebab-case, unique
  title: string;
  dek: string;               // 1–2 sentence standfirst
  rubric?: string;           // small kicker label, e.g. "Cover Story", "Exclusive", "Review"
  section: 'hollywood' | 'style' | 'royals' | 'culture' | 'politics' | 'business';
  authors: string[];         // author slugs (see AUTHOR_SLUGS)
  tags: string[];            // human tag names, e.g. "Awards Season"
  type?: 'story' | 'feature' | 'gallery' | 'review' | 'interview';
  heroCaption?: string;
  heroCredit?: string;       // e.g. "Photograph by Lena Ostrova"
  heroLayout?: 'standard' | 'full' | 'split';
  body: string;              // HTML: <p>, <h2>, <blockquote>, <ul>/<li>, <figure><img src alt><figcaption>
  hoursAgo: number;          // how long ago it was published (0 = now). Spread from 1 to ~2000.
  featured?: boolean;        // candidate for homepage hero
  topStory?: boolean;        // appears in "Top Stories"
  editorsPick?: boolean;
  issue?: string;            // magazine issue slug, if it ran in print
};

export type SeedIssue = {
  slug: string;              // e.g. "november-2026"
  title: string;             // e.g. "The Hollywood Issue"
  issueDate: string;         // ISO date, first of month, e.g. "2026-11-01"
  coverLine: string;         // short cover headline
  description: string;       // 2–3 sentences
  coverStory: string;        // article slug
};

export type SeedVideo = {
  slug: string;
  title: string;
  description: string;
  section: SeedArticle['section'];
  series: string;            // e.g. "Notes on a Scene", "Life in Looks"
  duration: string;          // "12:04"
  videoUrl: string;          // direct mp4 URL (see allowed list)
  hoursAgo: number;
  featured?: boolean;
};

export type SeedEpisode = {
  slug: string;
  title: string;
  description: string;
  duration: string;          // "48:12"
  audioUrl: string;
  hoursAgo: number;
};

export type SeedPodcast = {
  slug: string;
  title: string;
  description: string;
  host: string;
  episodes: SeedEpisode[];
};
