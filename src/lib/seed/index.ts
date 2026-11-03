// Populates a fresh database with a complete demo magazine.
// NOTE: only type-imports ../db (no runtime import, so no circular dependency).
import crypto from 'node:crypto';
import type { Param, Stmt } from '../db';
import { ARTICLES } from './articles';
import { ISSUES, PODCASTS, VIDEOS } from './media';
import { PAGES } from './pages';
import { photo, readingTime, slugify } from '../utils';

function hash(pw: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}

const ago = (hours: number) => new Date(Date.now() - hours * 3600e3).toISOString();

// deterministic pseudo-random so seeded numbers look natural but stable
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export const SECTIONS = [
  { slug: 'hollywood', name: 'Hollywood', color: '#c8102e', description: 'Movies, television, awards season and the power players behind the screen.' },
  { slug: 'style', name: 'Style', color: '#9b2c6e', description: 'Fashion, beauty, red carpets and the people who define how we look.' },
  { slug: 'royals', name: 'Royals', color: '#1f3a8a', description: 'Palace intrigue, royal weddings and the dynasties that still captivate the world.' },
  { slug: 'culture', name: 'Culture', color: '#b45309', description: 'Books, art, music, food and the ideas that shape the conversation.' },
  { slug: 'politics', name: 'Politics', color: '#0f766e', description: 'Power, policy and the personalities in Washington and beyond.' },
  { slug: 'business', name: 'Business', color: '#334155', description: 'Billionaires, boardrooms, media moguls and the future of technology.' },
];

export const AUTHORS = [
  { slug: 'eleanor-vance', name: 'Eleanor Vance', title: 'Editor in Chief', bio: 'Eleanor Vance is the editor in chief of Voirtales. She previously ran the magazine’s Hollywood bureau and has written cover stories on three generations of movie stars.' },
  { slug: 'marcus-hale', name: 'Marcus Hale', title: 'Hollywood Correspondent', bio: 'Marcus Hale covers the film and television industry for Voirtales, from the awards race to the deal-making behind the streaming wars.' },
  { slug: 'sofia-marchetti', name: 'Sofia Marchetti', title: 'Style Director', bio: 'Sofia Marchetti oversees fashion and beauty coverage at Voirtales. She splits her time between New York, Milan and the front row.' },
  { slug: 'james-whitcombe', name: 'James Whitcombe', title: 'Royal Correspondent', bio: 'James Whitcombe has reported on Europe’s royal houses for two decades. He is the author of a bestselling biography of the House of Aldermere.' },
  { slug: 'priya-raman', name: 'Priya Raman', title: 'Culture Writer', bio: 'Priya Raman writes about books, art and music for Voirtales. Her essays have been anthologized in The Best American Magazine Writing.' },
  { slug: 'daniel-okafor', name: 'Daniel Okafor', title: 'Political Editor', bio: 'Daniel Okafor is Voirtales’s political editor, based in Washington, where he covers the White House, Congress and the campaign trail.' },
  { slug: 'clara-lindqvist', name: 'Clara Lindqvist', title: 'Business & Tech Correspondent', bio: 'Clara Lindqvist reports on Silicon Valley, Wall Street and the billionaires who move between them.' },
  { slug: 'theo-castellanos', name: 'Theo Castellanos', title: 'Contributing Editor', bio: 'Theo Castellanos is a contributing editor at Voirtales and the author of two works of narrative nonfiction.' },
  { slug: 'naomi-fairbanks', name: 'Naomi Fairbanks', title: 'Special Correspondent', bio: 'Naomi Fairbanks is a special correspondent for Voirtales, specializing in investigative longform features.' },
  { slug: 'julian-ashford', name: 'Julian Ashford', title: 'Film Critic', bio: 'Julian Ashford is Voirtales’s chief film critic. He has covered Cannes, Venice and Telluride for fifteen years.' },
  { slug: 'amara-delacroix', name: 'Amara Delacroix', title: 'Senior Fashion Writer', bio: 'Amara Delacroix writes about fashion, design and the business of luxury for Voirtales.' },
  { slug: 'henry-blackwood', name: 'Henry Blackwood', title: 'Contributing Writer, Society', bio: 'Henry Blackwood chronicles high society, its parties and its scandals, from Palm Beach to Mayfair.' },
];

const NEWSLETTERS = [
  { slug: 'daily', name: 'Voirtales Daily', frequency: 'Every weekday', description: 'The stories everyone is talking about — Hollywood, royals, style and power — in your inbox every morning.' },
  { slug: 'hollywood-insider', name: 'Hollywood Insider', frequency: 'Twice a week', description: 'Exclusive reporting from the studios, the streamers and the awards race.' },
  { slug: 'royal-watch', name: 'The Royal Watch', frequency: 'Weekly', description: 'All the palace intrigue, from coronations to quiet feuds, with our royal correspondent.' },
  { slug: 'style-notes', name: 'Style Notes', frequency: 'Weekly', description: 'The looks, the designers and the red carpets worth talking about.' },
  { slug: 'power-brief', name: 'The Power Brief', frequency: 'Weekly', description: 'Politics, money and media — the week’s biggest power plays, decoded.' },
  { slug: 'weekend-reads', name: 'Weekend Reads', frequency: 'Saturdays', description: 'Our best longform features and archive gems, hand-picked for the weekend.' },
];

const PLANS = [
  {
    name: 'Digital',
    price: '$29.99',
    interval: 'year',
    description: 'Unlimited access to Voirtales.com and the app.',
    features: ['Unlimited access to every story', 'The Voirtales app', 'Subscriber-only newsletters', 'Access to the archive since 1913'],
    badge: '',
    highlighted: 0,
  },
  {
    name: 'Print + Digital',
    price: '$39.99',
    interval: 'year',
    description: 'Everything in Digital, plus the iconic print magazine.',
    features: ['Everything in Digital', '10 print issues a year', 'Collector’s edition covers', 'Free tote bag', 'Cancel anytime'],
    badge: 'Best value',
    highlighted: 1,
  },
  {
    name: 'Gift',
    price: '$34.99',
    interval: 'year',
    description: 'Give a year of Voirtales to someone special.',
    features: ['A full year of print + digital', 'Personalized gift card', 'Choose a start date'],
    badge: '',
    highlighted: 0,
  },
];

const NAV: Record<string, [string, string][]> = {
  header: [
    ['Hollywood', '/hollywood'],
    ['Style', '/style'],
    ['Royals', '/royals'],
    ['Culture', '/culture'],
    ['Politics', '/politics'],
    ['Business', '/business'],
    ['Video', '/video'],
    ['Podcasts', '/podcasts'],
    ['The Magazine', '/magazine'],
  ],
  hamburger: [
    ['Newsletters', '/newsletters'],
    ['Archive', '/archive'],
    ['Masthead', '/masthead'],
    ['Saved Stories', '/account'],
    ['Contact', '/contact'],
  ],
  footer: [
    ['About Voirtales', '/about'],
    ['Careers', '/careers'],
    ['Contact', '/contact'],
    ['Masthead', '/masthead'],
    ['Advertising', '/advertise'],
    ['FAQ', '/faq'],
    ['Newsletters', '/newsletters'],
    ['Subscribe', '/subscribe'],
    ['Sitemap', '/sitemap'],
    ['RSS Feeds', '/rss.xml'],
  ],
  footer_legal: [
    ['User Agreement', '/user-agreement'],
    ['Privacy Policy', '/privacy-policy'],
    ['Cookie Policy', '/cookie-policy'],
    ['Accessibility Help', '/accessibility-help'],
    ['Ethics & Standards', '/ethics-and-standards'],
  ],
};

// Tables whose rows get an explicit id so related rows can reference them inside one batch.
const ID_TABLES = new Set([
  'users', 'sections', 'authors', 'issues', 'tags', 'articles', 'videos', 'podcasts', 'episodes', 'pages',
  'nav_items', 'newsletters', 'newsletter_subscribers', 'plans', 'readers', 'subscriptions', 'messages', 'activity_log',
]);

/**
 * The complete demo magazine as a list of SQL statements. Ids are assigned here (not by the
 * database) so the whole seed runs as one atomic batch — locally or against a remote libSQL server.
 */
export function seedStatements(): Stmt[] {
  const stmts: Stmt[] = [];
  const counters: Record<string, number> = {};
  const q = (sql: string) => ({
    run: (...args: Param[]) => {
      const m = sql.match(/^\s*INSERT (?:OR \w+ )?INTO (\w+) \(/);
      if (m && ID_TABLES.has(m[1]!)) {
        const table = m[1]!;
        const id = (counters[table] = (counters[table] ?? 0) + 1);
        stmts.push({ sql: sql.replace(`INTO ${table} (`, `INTO ${table} (id, `).replace(/VALUES\s*\(/, 'VALUES (?, '), args: [id, ...args] });
        return { lastInsertRowid: id };
      }
      stmts.push({ sql, args });
      return { lastInsertRowid: 0 };
    },
  });
  {
    // users
    const insUser = q('INSERT INTO users (name, email, role, password_hash) VALUES (?,?,?,?)');
    insUser.run('Eleanor Vance', 'admin@voirtales.com', 'admin', hash('admin123'));
    insUser.run('Marcus Hale', 'editor@voirtales.com', 'editor', hash('editor123'));
    insUser.run('Priya Raman', 'writer@voirtales.com', 'writer', hash('writer123'));

    // sections
    const secId: Record<string, number> = {};
    SECTIONS.forEach((s, i) => {
      secId[s.slug] = Number(
        q('INSERT INTO sections (name, slug, description, color, position, in_nav) VALUES (?,?,?,?,?,1)').run(s.name, s.slug, s.description, s.color, i)
          .lastInsertRowid,
      );
    });

    // authors
    const authId: Record<string, number> = {};
    AUTHORS.forEach((a, i) => {
      authId[a.slug] = Number(
        q('INSERT INTO authors (name, slug, title, bio, email, twitter, instagram, position) VALUES (?,?,?,?,?,?,?,?)').run(
          a.name,
          a.slug,
          a.title,
          a.bio,
          `${a.slug.split('-')[0]}@voirtales.com`,
          `https://x.com/${a.slug.replace(/-/g, '')}`,
          `https://instagram.com/${a.slug.replace(/-/g, '')}`,
          i,
        ).lastInsertRowid,
      );
    });

    // issues (cover story linked after articles exist)
    const issueId: Record<string, number> = {};
    for (const iss of ISSUES) {
      issueId[iss.slug] = Number(
        q('INSERT INTO issues (title, slug, issue_date, cover_image, cover_line, description, published) VALUES (?,?,?,?,?,?,1)').run(
          iss.title,
          iss.slug,
          iss.issueDate,
          photo(`cover-${iss.slug}`, 900, 1200),
          iss.coverLine,
          iss.description,
        ).lastInsertRowid,
      );
    }

    // tags + articles
    const tagId: Record<string, number> = {};
    const tagFor = (name: string) => {
      const slug = slugify(name);
      if (!tagId[slug]) tagId[slug] = Number(q('INSERT INTO tags (name, slug) VALUES (?,?)').run(name, slug).lastInsertRowid);
      return tagId[slug]!;
    };
    const artId: Record<string, number> = {};
    const today = new Date();
    for (const a of ARTICLES) {
      const r = rng(a.slug);
      const published = ago(a.hoursAgo);
      const ageDays = a.hoursAgo / 24;
      const views = Math.round((a.featured ? 30000 : a.topStory ? 18000 : 4000) * (0.4 + r()) * Math.max(0.25, 1 - ageDays / 120));
      const id = Number(
        q(
          `INSERT INTO articles (title, slug, dek, rubric, body, section_id, issue_id, type, hero_image, hero_caption, hero_credit, hero_layout,
           status, published_at, featured, top_story, editors_pick, reading_time, views, created_by, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'published', ?,?,?,?,?,?,1,?,?)`,
        ).run(
          a.title,
          a.slug,
          a.dek,
          a.rubric ?? '',
          a.body.trim(),
          secId[a.section] ?? null,
          a.issue ? (issueId[a.issue] ?? null) : null,
          a.type ?? 'story',
          photo(`vt-${a.slug}`, 1600, 1067),
          a.heroCaption ?? '',
          a.heroCredit ?? '',
          a.heroLayout ?? 'standard',
          published,
          a.featured ? 1 : 0,
          a.topStory ? 1 : 0,
          a.editorsPick ? 1 : 0,
          readingTime(a.body),
          views,
          published,
          published,
        ).lastInsertRowid,
      );
      artId[a.slug] = id;
      a.authors.forEach((s, i) => {
        if (authId[s]) q('INSERT OR IGNORE INTO article_authors (article_id, author_id, position) VALUES (?,?,?)').run(id, authId[s]!, i);
      });
      for (const t of a.tags) q('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?,?)').run(id, tagFor(t));
      // daily view history for the analytics chart
      for (let d = 0; d < 30; d++) {
        if (d > ageDays) break;
        const day = new Date(today.getTime() - d * 864e5).toISOString().slice(0, 10);
        const c = Math.round((views / 40) * (0.3 + r()) * Math.exp(-d / 12));
        if (c > 0) q('INSERT OR REPLACE INTO article_views (article_id, day, count) VALUES (?,?,?)').run(id, day, c);
      }
    }
    for (const iss of ISSUES) {
      const cs = artId[iss.coverStory];
      if (cs) q('UPDATE issues SET cover_story_id = ? WHERE slug = ?').run(cs, iss.slug);
    }

    // videos
    for (const v of VIDEOS) {
      q(
        'INSERT INTO videos (title, slug, description, section_id, series, duration, video_url, thumbnail, status, featured, views, published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      ).run(
        v.title,
        v.slug,
        v.description,
        secId[v.section] ?? null,
        v.series,
        v.duration,
        v.videoUrl,
        photo(`video-${v.slug}`, 1280, 720),
        'published',
        v.featured ? 1 : 0,
        Math.round(rng(v.slug)() * 90000) + 4000,
        ago(v.hoursAgo),
      );
    }

    // podcasts
    PODCASTS.forEach((p, i) => {
      const pid = Number(
        q('INSERT INTO podcasts (title, slug, description, host, cover_image, apple_url, spotify_url, position) VALUES (?,?,?,?,?,?,?,?)').run(
          p.title,
          p.slug,
          p.description,
          p.host,
          photo(`podcast-${p.slug}`, 800, 800),
          'https://podcasts.apple.com/',
          'https://open.spotify.com/',
          i,
        ).lastInsertRowid,
      );
      for (const e of p.episodes) {
        q('INSERT INTO episodes (podcast_id, title, slug, description, audio_url, duration, status, published_at) VALUES (?,?,?,?,?,?,?,?)').run(
          pid,
          e.title,
          e.slug,
          e.description,
          e.audioUrl,
          e.duration,
          'published',
          ago(e.hoursAgo),
        );
      }
    });

    // static pages
    for (const p of PAGES) {
      q("INSERT INTO pages (title, slug, intro, body, status, seo_description) VALUES (?,?,?,?, 'published', ?)").run(p.title, p.slug, p.intro, p.body.trim(), p.intro);
    }

    // navigation
    for (const [menu, items] of Object.entries(NAV)) {
      items.forEach(([label, url], i) => q('INSERT INTO nav_items (menu, label, url, position) VALUES (?,?,?,?)').run(menu, label, url, i));
    }

    // newsletters + a few demo subscribers
    const nlIds: number[] = [];
    NEWSLETTERS.forEach((n, i) => {
      nlIds.push(
        Number(
          q('INSERT INTO newsletters (name, slug, description, frequency, image, position) VALUES (?,?,?,?,?,?)').run(
            n.name,
            n.slug,
            n.description,
            n.frequency,
            photo(`nl-${n.slug}`, 800, 520),
            i,
          ).lastInsertRowid,
        ),
      );
    });
    const demoEmails = ['olivia.hart@example.com', 'sam.reyes@example.com', 'noah.kim@example.com', 'ava.wright@example.com', 'leo.martins@example.com', 'mia.chen@example.com', 'ethan.brooks@example.com', 'zoe.laurent@example.com'];
    demoEmails.forEach((e, i) => {
      for (let k = 0; k <= i % 3; k++) {
        q('INSERT OR IGNORE INTO newsletter_subscribers (email, newsletter_id, source, created_at) VALUES (?,?,?,?)').run(e, nlIds[(i + k) % nlIds.length]!, 'homepage', ago(i * 30 + k));
      }
    });

    // plans
    PLANS.forEach((p, i) => {
      q('INSERT INTO plans (name, price, interval, description, features, badge, highlighted, position) VALUES (?,?,?,?,?,?,?,?)').run(
        p.name,
        p.price,
        p.interval,
        p.description,
        JSON.stringify(p.features),
        p.badge,
        p.highlighted,
        i,
      );
    });

    // demo reader, subscription, messages
    const readerId = Number(q('INSERT INTO readers (name, email, password_hash) VALUES (?,?,?)').run('Olivia Hart', 'reader@voirtales.com', hash('reader123')).lastInsertRowid);
    const firstArticles = Object.values(artId).slice(0, 3);
    for (const id of firstArticles) q('INSERT OR IGNORE INTO saved_articles (reader_id, article_id) VALUES (?,?)').run(readerId, id);
    q("INSERT INTO subscriptions (plan_id, reader_id, name, email, address, city, country, postal_code, status) VALUES (2, ?, 'Olivia Hart', 'reader@voirtales.com', '18 Grove Street', 'New York', 'United States', '10014', 'active')").run(readerId);
    q("INSERT INTO subscriptions (plan_id, name, email, address, city, country, postal_code, status, created_at) VALUES (1, 'Sam Reyes', 'sam.reyes@example.com', '', 'Los Angeles', 'United States', '90028', 'pending', ?)").run(ago(5));
    const insMsg = q('INSERT INTO messages (name, email, subject, topic, body, created_at) VALUES (?,?,?,?,?,?)');
    insMsg.run('Harriet Cole', 'harriet.cole@example.com', 'Letter to the editor: The Aldermere cover', 'letters', 'Your royal cover story was the most humane portrait of a monarchy in transition I have read in years. Thank you for resisting the easy gossip.', ago(3));
    insMsg.run('Studio Nine PR', 'press@studionine.example', 'Screening invitation', 'press', 'We would love to invite your film desk to an early screening of our winter release in New York next Thursday.', ago(20));
    insMsg.run('Jordan Ellis', 'jordan@example.com', 'Subscription question', 'subscriptions', 'I moved apartments — how do I update the delivery address for my print issues?', ago(50));

    // activity log
    const insLog = q('INSERT INTO activity_log (user_id, action, entity, entity_id, label, created_at) VALUES (?,?,?,?,?,?)');
    insLog.run(1, 'installed', 'site', null, 'Voirtales was set up with demo content', new Date().toISOString());

  }
  return stmts;
}
