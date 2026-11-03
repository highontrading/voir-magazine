import type { SeedIssue, SeedVideo, SeedPodcast } from './types';

// Seed print issues, videos and podcasts for Voirtales. All people, shows and brands are fictional.

export const ISSUES: SeedIssue[] = [
  {
    slug: "november-2026",
    title: "The Hollywood Issue",
    issueDate: "2026-11-01",
    coverLine: "Celeste Marlowe, Uncrowned",
    description:
      "A Palme d'Or, an awards race and a royal wedding: Celeste Marlowe opens up as never before. Plus the Leopold–Marlowe wedding date, and the sapphire tiara that stopped Esterhaven.",
    coverStory: "celeste-marlowe-uncrowned",
  },
  {
    slug: "october-2026",
    title: "The Power Issue",
    issueDate: "2026-10-01",
    coverLine: "Catherine Whitlow Is Running",
    description:
      "On the road in Iowa with the senator who won't say the word. Plus the strategist every 2028 hopeful wants and no one admits hiring, and the Paris Fashion Week looks everyone will be talking about.",
    coverStory: "catherine-whitlow-is-running",
  },
  {
    slug: "september-2026",
    title: "The Style Issue",
    issueDate: "2026-09-01",
    coverLine: "Odile Marchand's Quiet Revolution",
    description:
      "Inside the Maison Verlaine atelier with the designer who taught couture to whisper. Also: the London tailor that made the suit cool again, and the most glamorous arrivals on the Lido.",
    coverStory: "odile-marchand-maison-verlaine",
  },
  {
    slug: "august-2026",
    title: "The Royal Issue",
    issueDate: "2026-08-01",
    coverLine: "The Outsider Queen-in-Waiting",
    description:
      "Crown Princess Margaux on duty, doubt and the future of the House of Aldermere. Plus a rare interview with Princess Theodora and the royal biography the palace feared.",
    coverStory: "crown-princess-margaux-outsider-queen",
  },
  {
    slug: "july-2026",
    title: "The Art Issue",
    issueDate: "2026-07-01",
    coverLine: "Felix Arendt Paints the End of the World",
    description:
      "From a herring plant on a tiny Baltic islet to the Venice Biennale: the painter whose drowned cities everyone wants to own. Also inside: billionaire summer camp decoded, and the return of the rock band.",
    coverStory: "felix-arendt-paints-the-end-of-the-world",
  },
  {
    slug: "june-2026",
    title: "The Money Issue",
    issueDate: "2026-06-01",
    coverLine: "The Gospel of Rowan Achterberg",
    description:
      "The founder of Halcyon on artificial intelligence, fear and the $80 billion he says he'll give away. Plus why the very rich have traded their superyachts for private islands.",
    coverStory: "the-gospel-of-rowan-achterberg",
  },
];

const V = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
] as const;

export const VIDEOS: SeedVideo[] = [
  {
    slug: "tomasz-wren-glass-orchard-notes-on-a-scene",
    title: "Tomasz Wren Breaks Down the Orchard Fire in 'The Glass Orchard'",
    description:
      "The reclusive director walks us through the single-take blaze at the heart of his Palme d'Or winner: how he shot it without a monitor, why he never said 'cut,' and what Celeste Marlowe did that nobody planned.",
    section: "hollywood",
    series: "Notes on a Scene",
    duration: "14:22",
    videoUrl: V[0],
    hoursAgo: 30,
    featured: true,
  },
  {
    slug: "celeste-marlowe-life-in-looks",
    title: "Celeste Marlowe Revisits 20 Years of Red-Carpet Looks",
    description:
      "From a borrowed prom dress at her first premiere to midnight-blue Maison Verlaine in Venice, the actress talks us through every look—and the one she would burn if she could.",
    section: "hollywood",
    series: "Life in Looks",
    duration: "15:02",
    videoUrl: V[1],
    hoursAgo: 60,
  },
  {
    slug: "ines-okonkwo-bell-take-one",
    title: "Ines Okonkwo-Bell Watches Her 'Salt Year' Audition Tape for the First Time",
    description:
      "A year ago she was a barista with a dare. The breakout star of the season reacts to the open-call audition that changed her life.",
    section: "hollywood",
    series: "Take One",
    duration: "8:45",
    videoUrl: V[2],
    hoursAgo: 150,
  },
  {
    slug: "saskia-brandt-life-in-looks",
    title: "Saskia Brandt on 25 Years of Iconic Fashion Moments",
    description:
      "The supermodel turned photographer looks back on the runway exits, campaigns and cover shoots that defined an era—and the people behind the scenes who made them possible.",
    section: "style",
    series: "Life in Looks",
    duration: "16:10",
    videoUrl: V[3],
    hoursAgo: 300,
    featured: true,
  },
  {
    slug: "maison-verlaine-secret-room",
    title: "Inside the Maison Verlaine Couture Atelier",
    description:
      "Climb the narrow staircase to the top floors of the Paris house where 94 artisans spend 150 hours on a single jacket, and where Odile Marchand still eats lunch at the workroom table.",
    section: "style",
    series: "Secret Room",
    duration: "11:32",
    videoUrl: V[4],
    hoursAgo: 1480,
  },
  {
    slug: "royal-report-leopold-marlowe-wedding",
    title: "The Leopold–Marlowe Royal Wedding: Everything We Know So Far",
    description:
      "The date, the cathedral, the guest-list headaches and the dress speculation. James Whitcombe breaks down what to expect when a prince of Esterhaven marries a Hollywood star.",
    section: "royals",
    series: "The Royal Report",
    duration: "9:58",
    videoUrl: V[0],
    hoursAgo: 24,
  },
  {
    slug: "lindholm-palace-jewel-vault-secret-room",
    title: "Inside the Lindholm Palace Jewel Vault",
    description:
      "An exclusive look beneath the palace at the House of Aldermere's collection, from the Aldermere Sapphire Fringe to the emerald parure that has not been worn in a century.",
    section: "royals",
    series: "Secret Room",
    duration: "12:40",
    videoUrl: V[1],
    hoursAgo: 900,
  },
  {
    slug: "felix-arendt-studio-secret-room",
    title: "Felix Arendt's Island Studio",
    description:
      "Two ferries, a gravel track and a former herring plant: a rare visit to the remote Baltic studio where the painter makes the drowned-city canvases the world can't stop buying.",
    section: "culture",
    series: "Secret Room",
    duration: "10:05",
    videoUrl: V[2],
    hoursAgo: 1950,
  },
  {
    slug: "juno-vale-take-one",
    title: "Juno Vale Plays the First Song She Ever Wrote",
    description:
      "Before 'Paper Moon' closed the Halo Tour in front of 90,000 people, it lived in a teenage notebook. The pop star sits down with an acoustic guitar to play it, broken string and all.",
    section: "culture",
    series: "Take One",
    duration: "7:30",
    videoUrl: V[3],
    hoursAgo: 200,
  },
  {
    slug: "election-day-explained-the-briefing",
    title: "Election Day, Explained in Ten Minutes",
    description:
      "Daniel Okafor on the five races that will tell us whether Catherine Whitlow and Roland Pike head into 2028 with the wind at their backs.",
    section: "politics",
    series: "The Briefing",
    duration: "10:12",
    videoUrl: V[4],
    hoursAgo: 4,
  },
  {
    slug: "who-is-catherine-whitlow-the-briefing",
    title: "Who Is Catherine Whitlow?",
    description:
      "From a Pueblo steel town to the Senate to a hog barn in Iowa: the making of the most talked-about not-yet-candidate in America.",
    section: "politics",
    series: "The Briefing",
    duration: "13:48",
    videoUrl: V[0],
    hoursAgo: 780,
  },
  {
    slug: "isabella-ferrante-power-lunch",
    title: "Power Lunch With Isabella Ferrante",
    description:
      "Over risotto in Milan, the chairwoman of the Ferrante Group talks luxury's slowdown, the Bellandi feud and the moth-eaten coat she would save from a fire.",
    section: "business",
    series: "Power Lunch",
    duration: "18:20",
    videoUrl: V[1],
    hoursAgo: 170,
  },
];

const A = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

export const PODCASTS: SeedPodcast[] = [
  {
    slug: "golden-hour",
    title: "Golden Hour",
    description:
      "Hollywood correspondent Marcus Hale goes behind the velvet rope of awards season, with the stars, strategists and studio chiefs who decide who takes home the gold.",
    host: "Marcus Hale",
    episodes: [
      {
        slug: "golden-hour-salt-year-surge",
        title: "The 'Salt Year' Surge",
        description:
          "How a tiny coastal drama crashed the coronation of 'The Glass Orchard,' and why voters love a discovery. With critic Julian Ashford.",
        duration: "46:18",
        audioUrl: A(1),
        hoursAgo: 10,
      },
      {
        slug: "golden-hour-rafe-calloway-walks-away",
        title: "Rafe Calloway Walks Away",
        description:
          "Inside the meeting where the action star turned down $40 million, and what it means for Meridian Pictures in the middle of a takeover fight.",
        duration: "38:52",
        audioUrl: A(2),
        hoursAgo: 120,
      },
      {
        slug: "golden-hour-venice-report",
        title: "The Venice Report",
        description:
          "Water taxis, standing ovations and the films that came out of the Lido as contenders. Marcus is joined by Amara Delacroix.",
        duration: "51:07",
        audioUrl: A(3),
        hoursAgo: 1430,
      },
      {
        slug: "golden-hour-cannes-glass-orchard",
        title: "Twelve Minutes at Cannes",
        description:
          "The night 'The Glass Orchard' won the Palme d'Or, recounted by the people who were in the Palais—and the moment Celeste Marlowe became the woman to beat.",
        duration: "44:30",
        audioUrl: A(4),
        hoursAgo: 2000,
      },
      {
        slug: "golden-hour-crestline-exodus",
        title: "The Agents Are Leaving",
        description:
          "Theo Castellanos joins Marcus to unpack the departures at Crestline Artists and the boutique firm quietly collecting its stars.",
        duration: "41:15",
        audioUrl: A(5),
        hoursAgo: 58,
      },
    ],
  },
  {
    slug: "the-royal-box",
    title: "The Royal Box",
    description:
      "Royal correspondent James Whitcombe and guests take you inside the palaces, protocol and private feuds of the House of Aldermere and Europe's other great families.",
    host: "James Whitcombe",
    episodes: [
      {
        slug: "the-royal-box-the-kings-silence",
        title: "The King's Silence",
        description:
          "Eleven weeks without a public appearance. What we know about King Frederick's health, what the palace isn't saying and what a regency would really mean.",
        duration: "39:44",
        audioUrl: A(6),
        hoursAgo: 5,
      },
      {
        slug: "the-royal-box-a-date-and-a-cathedral",
        title: "A Date and a Cathedral",
        description:
          "Prince Leopold and Celeste Marlowe set their wedding for May. Henry Blackwood joins James to read the guest list like a map of power.",
        duration: "47:21",
        audioUrl: A(7),
        hoursAgo: 28,
      },
      {
        slug: "the-royal-box-the-sapphire-fringe",
        title: "The Sapphire Fringe",
        description:
          "Princess Elodie's tiara moment, decoded: the history of the jewels, the politics of the timing and the jeweler who has kept the royal collection since 1902.",
        duration: "35:09",
        audioUrl: A(8),
        hoursAgo: 72,
      },
      {
        slug: "the-royal-box-margaux",
        title: "Margaux",
        description:
          "On the record with the author of our August cover story: how a Parisian art historian became the most popular royal in Esterhaven, and why the palace is counting on her.",
        duration: "52:33",
        audioUrl: A(1),
        hoursAgo: 1890,
      },
    ],
  },
  {
    slug: "the-long-night",
    title: "The Long Night",
    description:
      "Special correspondent Naomi Fairbanks tells the true stories behind the headlines—fraud, fortune and the people caught in between—one long conversation at a time.",
    host: "Naomi Fairbanks",
    episodes: [
      {
        slug: "the-long-night-kestrel",
        title: "Kestrel: The Money That Vanished",
        description:
          "Twenty-two years for Wyatt Brand. Naomi revisits the collapse of Kestrel Exchange through the eyes of the investors who lost everything, and the widow who finally got her say.",
        duration: "58:12",
        audioUrl: A(2),
        hoursAgo: 40,
      },
      {
        slug: "the-long-night-the-dealer",
        title: "The Dealer",
        description:
          "Secret prices, superstar artists and a federal investigation: inside the world of Hugo Castellane, and the questions his artists are finally asking.",
        duration: "54:40",
        audioUrl: A(3),
        hoursAgo: 800,
      },
      {
        slug: "the-long-night-the-aldermere-accounts",
        title: "The Aldermere Accounts",
        description:
          "Forests, ships, Old Masters and a Liechtenstein trust. Naomi and James Whitcombe follow the money behind Europe's most secretive royal fortune.",
        duration: "1:02:18",
        audioUrl: A(4),
        hoursAgo: 640,
      },
      {
        slug: "the-long-night-the-leak-that-wasnt",
        title: "The Leak That Wasn't",
        description:
          "A forged document, a front-page scoop and a reporter who lost everything. How The Capitol Ledger got it wrong, and who might have wanted it to.",
        duration: "49:55",
        audioUrl: A(5),
        hoursAgo: 1240,
      },
    ],
  },
];
