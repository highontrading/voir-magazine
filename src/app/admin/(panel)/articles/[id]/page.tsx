import { notFound } from 'next/navigation';
import { requireUser, can } from '@/lib/auth';
import { getArticleById } from '@/lib/data/articles';
import { listAuthors, listSections } from '@/lib/data/taxonomy';
import { listIssues } from '@/lib/data/content';
import { tagNames } from '@/lib/data/admin';
import { getSettings } from '@/lib/settings';
import { ArticleEditor } from '@/components/admin/ArticleEditor';
import type { ArticlePayload } from '@/lib/admin/article';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'new') return { title: 'New story' };
  const a = getArticleById(Number(id));
  return { title: a ? `Edit: ${a.title}` : 'Story not found' };
}

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const isNew = id === 'new';
  const article = isNew ? null : getArticleById(Number(id));
  if (!isNew && !article) notFound();
  const all = can(user, 'articles.all');
  if (article && !all && article.created_by !== user.id) {
    return (
      <div className="adm-card adm-card-body">
        <h1 className="adm-h2">Not your story</h1>
        <p className="adm-muted">Writers can only open stories they created.</p>
      </div>
    );
  }
  const authors = listAuthors();
  const me = authors.find((a) => a.email && a.email.toLowerCase() === user.email.toLowerCase()) ?? authors.find((a) => a.name === user.name);
  const initial: ArticlePayload = article
    ? {
        id: article.id,
        title: article.title,
        slug: article.slug,
        rubric: article.rubric,
        dek: article.dek,
        body: article.body,
        status: article.status,
        published_at: article.published_at,
        section_id: article.section_id,
        issue_id: article.issue_id,
        type: article.type,
        authorIds: article.authors.map((a) => a.id),
        tags: (article.tags ?? []).map((t) => t.name),
        hero_image: article.hero_image,
        hero_caption: article.hero_caption,
        hero_credit: article.hero_credit,
        hero_layout: article.hero_layout,
        featured: !!article.featured,
        top_story: !!article.top_story,
        editors_pick: !!article.editors_pick,
        seo_title: article.seo_title,
        seo_description: article.seo_description,
        allow_index: !!article.allow_index,
      }
    : {
        id: null,
        title: '',
        slug: '',
        rubric: '',
        dek: '',
        body: '',
        status: 'draft',
        published_at: null,
        section_id: null,
        issue_id: null,
        type: 'story',
        authorIds: me ? [me.id] : [],
        tags: [],
        hero_image: '',
        hero_caption: '',
        hero_credit: '',
        hero_layout: 'standard',
        featured: false,
        top_story: false,
        editors_pick: false,
        seo_title: '',
        seo_description: '',
        allow_index: true,
      };
  const locked = !!article && !can(user, 'articles.publish') && ['published', 'scheduled', 'archived'].includes(article.status);
  const settings = getSettings();
  return (
    <ArticleEditor
      key={article?.id ?? 'new'}
      initial={initial}
      meta={{
        updated_at: article?.updated_at ?? null,
        created_at: article?.created_at ?? null,
        views: article?.views ?? 0,
        reading_time: article?.reading_time ?? 0,
      }}
      sections={listSections().map((s) => ({ id: s.id, name: s.name, color: s.color }))}
      authors={authors.map((a) => ({ id: a.id, name: a.name, title: a.title }))}
      issues={listIssues(false).map((i) => ({ id: i.id, title: i.title, issue_date: i.issue_date }))}
      tagSuggestions={tagNames()}
      canPublish={can(user, 'articles.publish')}
      locked={locked}
      siteName={settings.siteName}
    />
  );
}
