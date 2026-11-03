import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { countPublished, listPublished } from '@/lib/data/articles';
import { getAuthor } from '@/lib/data/taxonomy';
import { Card, toCard } from '@/components/site/Card';
import { InstagramLogo, LinkIcon, MailIcon, XLogo } from '@/components/site/Icons';
import { LoadMore } from '@/components/site/LoadMore';
import { Avatar } from '@/components/site/Media';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = getAuthor((await params).slug);
  return a ? { title: `${a.name}`, description: a.bio } : { title: 'Contributor not found' };
}

export default async function ContributorPage({ params }: Props) {
  const author = getAuthor((await params).slug);
  if (!author) notFound();
  const total = countPublished({ author: author.slug });
  const items = listPublished({ author: author.slug, limit: 12 });
  return (
    <div className="wrap page-enter">
      <header className="profile-head">
        <Avatar name={author.name} src={author.photo} size={160} />
        <div>
          <span className="rubric">{author.title}</span>
          <h1>{author.name}</h1>
          {author.bio ? <p>{author.bio}</p> : null}
          <div className="social" style={{ marginTop: 18 }}>
            {author.twitter ? <a href={author.twitter} target="_blank" rel="noopener noreferrer" aria-label="X"><XLogo /></a> : null}
            {author.instagram ? <a href={author.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramLogo /></a> : null}
            {author.website ? <a href={author.website} target="_blank" rel="noopener noreferrer" aria-label="Website"><LinkIcon /></a> : null}
            {author.email ? <a href={`mailto:${author.email}`} aria-label="Email"><MailIcon /></a> : null}
          </div>
        </div>
      </header>
      <p className="eyebrow" style={{ marginBottom: 24 }}>
        {total} {total === 1 ? 'story' : 'stories'} by {author.name}
      </p>
      <div className="grid grid--4">
        {items.map((a) => (
          <Card key={a.id} a={toCard(a)} variant="medium" showByline={false} showTime />
        ))}
      </div>
      <LoadMore query={{ author: author.slug }} start={12} total={total} />
    </div>
  );
}
