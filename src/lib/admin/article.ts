import type { ArticleStatus, ArticleType, HeroLayout } from '../types';

/** What the article editor sends to the save action. */
export interface ArticlePayload {
  id: number | null;
  title: string;
  slug: string;
  rubric: string;
  dek: string;
  body: string;
  status: ArticleStatus;
  published_at: string | null;
  section_id: number | null;
  issue_id: number | null;
  type: ArticleType;
  authorIds: number[];
  tags: string[];
  hero_image: string;
  hero_caption: string;
  hero_credit: string;
  hero_layout: HeroLayout;
  featured: boolean;
  top_story: boolean;
  editors_pick: boolean;
  seo_title: string;
  seo_description: string;
  allow_index: boolean;
}

export const ARTICLE_TYPES: ArticleType[] = ['story', 'feature', 'gallery', 'review', 'interview'];
export const ARTICLE_STATUSES: ArticleStatus[] = ['draft', 'review', 'published', 'scheduled', 'archived'];
export const HERO_LAYOUTS: HeroLayout[] = ['standard', 'full', 'split'];
