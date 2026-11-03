import { searchArticles } from '@/lib/data/articles';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return Response.json({ items: [] });
  const { items } = await searchArticles(q.slice(0, 100), 6);
  return Response.json({
    items: items.map((a) => ({ slug: a.slug, title: a.title, hero_image: a.hero_image, section_name: a.section_name, rubric: a.rubric })),
  });
}
