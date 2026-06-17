export interface ChangelogEntry {
  /** ISO-datum (YYYY-MM-DD) van de merge — nieuwste eerst in de lijst. */
  readonly date: string;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  /** PR-nummers op GitHub, voor wie wil doorklikken. */
  readonly prs: readonly number[];
}

// Spelersgerichte changelog: gecureerd, niet elke PR — interne fixes blijven
// weg, features en balanswijzigingen die spelers vóélen staan erin.
// Nieuwe entries komen BOVENAAN. Hou de toon licht; dit is een spelletje.
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: '2026-06-17',
    icon: '🏆',
    title: 'Honest Fame progress',
    description:
      "Fixed the Fame progress bar lying: after spending Fame in the shop (or with a big banked balance), it could read “ready” while a refound still gave +0. Both the Guild bar and the Prestige screen now count your total earned Fame, so the next-point target and ETA match what you'll actually get.",
    prs: [61],
  },
  {
    date: '2026-06-16',
    icon: '📊',
    title: 'Know your guild',
    description:
      'The Heroes screen now shows what share of your gold/s each hero pulls, so you can see who carries your income. And 📊 Stats shows your current offline cap — including any Night Watch perks.',
    prs: [60],
  },
  {
    date: '2026-06-16',
    icon: '🏆',
    title: 'Fame shop',
    description:
      'Spend your Fame on permanent prestige perks under 👑 Refound, and level them up: stronger quest clicks, fatter hero production, and longer offline progress. Each level costs more Fame than the last, and spent Fame is gone for good — a real trade-off against the production bonus your Fame would otherwise give.',
    prs: [57],
  },
  {
    date: '2026-06-16',
    icon: '🏅',
    title: 'Achievements',
    description:
      'Earn badges for milestones — your first recruit, a farmhand army, your first million gold, surviving raids and more. Find them under 🏅 Achievements; a toast pops the moment you unlock one, and they survive every refound.',
    prs: [55],
  },
  {
    date: '2026-06-12',
    icon: '✈️',
    title: 'Plays without internet',
    description:
      'The installed app now boots offline — your guild works on the train, in the basement, wherever. Online play always loads the newest version.',
    prs: [54],
  },
  {
    date: '2026-06-12',
    icon: '🌙',
    title: 'Smarter welcome back',
    description:
      'The offline report now shows who earned what — heroes vs your auto-quest staff — and warns you when barbarians broke through while you were away.',
    prs: [53],
  },
  {
    date: '2026-06-12',
    icon: '📊',
    title: 'Guild statistics',
    description:
      'Lifetime counters under 📊 Stats: quests clicked, crits landed, raids fought off, times plundered, mercenaries hired, playtime and more. A refound wipes your gold, never your history.',
    prs: [52],
  },
  {
    date: '2026-06-12',
    icon: '🎶',
    title: 'Click juice',
    description:
      'Clicks rise in pitch as your combo builds, raid blows climb as the barbarians waver, and on Android your phone buzzes on crits, raids and refounds.',
    prs: [51],
  },
  {
    date: '2026-06-12',
    icon: '⭐',
    title: 'Hero milestones',
    description:
      'Every 10th recruit of a hero boosts that hero ×1.25 — then every 100th past 100, every 1,000th past 1,000. The new ⭐ buy mode recruits exactly up to the next boost.',
    prs: [45, 46],
  },
  {
    date: '2026-06-12',
    icon: '🪓',
    title: 'Barbarian raids',
    description:
      'Once you hold 50 fame, barbarians strike every 10–20 minutes of play. Drive them off in 25 hits, pay mercenaries, or get plundered: 20% of your gold gone and production halved. Defenders claim 5 minutes of income plus 60 seconds of ×2 war frenzy.',
    prs: [42],
  },
  {
    date: '2026-06-12',
    icon: '📈',
    title: 'Honest recruit buttons',
    description:
      'The gain on recruit buttons is now the true income difference — synergy, crits, auto-quest staff and milestone boosts included. No more "expected 7B/s, got 100B/s".',
    prs: [43],
  },
  {
    date: '2026-06-12',
    icon: '⏳',
    title: 'Fame ETA',
    description:
      'The fame progress line estimates how long the next point takes at your current pace — clicking hard makes the number drop live.',
    prs: [41],
  },
  {
    date: '2026-06-12',
    icon: '🤖',
    title: 'Autoclicker defense',
    description:
      'Suspiciously mechanical clicking earns the guild nothing and gets a robot label. Honest fingers — even very fast ones — are safe.',
    prs: [39, 44],
  },
  {
    date: '2026-06-12',
    icon: '🔢',
    title: 'Number legend',
    description:
      'Does Qi come after Qa? Tap "What\'s a Qa?" under the gold counter and never wonder again.',
    prs: [38],
  },
  {
    date: '2026-06-12',
    icon: '🦸',
    title: 'Late-game heroes & upgrades',
    description:
      'Three new heroes — the Titan, the Demigod and the Celestial — plus a wave of 19 upgrades to grind toward.',
    prs: [35, 36],
  },
  {
    date: '2026-06-12',
    icon: '⚖️',
    title: 'The endgame is a wall again',
    description:
      'Fame targets steepen past 300 fame and again past 2,000, and each banked point\'s bonus diminishes as you hoard more. Fame you already banked is never touched.',
    prs: [34, 36, 37],
  },
  {
    date: '2026-06-12',
    icon: '🎚️',
    title: 'Quality of life',
    description:
      'Separate music and sound-effect sliders, the bulk-buy toggle remembers your choice, spacebar runs quests on desktop, and refounds show on the mobile leaderboard.',
    prs: [32, 33],
  },
  {
    date: '2026-06-12',
    icon: '📱',
    title: 'Install as an app',
    description:
      'Add the guild to your phone\'s home screen and it opens like a real app — with a proper pixel-warrior icon.',
    prs: [31],
  },
  {
    date: '2026-06-11',
    icon: '⚔️',
    title: 'Click combos & auto-quest staff',
    description:
      'Fast clicking builds a combo up to ×3 (unlocked through upgrades), and the Quest Herald, Guild Steward and Royal Envoy run quests for you — even while you sleep.',
    prs: [28, 29],
  },
  {
    date: '2026-06-11',
    icon: '🥇',
    title: 'Global leaderboard',
    description:
      'Opt-in ranking against everyone else\'s guild, refound counts included. Suspiciously rich climbers get a 🤡 badge.',
    prs: [24, 25],
  },
  {
    date: '2026-06-11',
    icon: '💪',
    title: 'Bulk recruiting & gain previews',
    description:
      'Recruit 1/5/10/15/20/Max heroes at a time, and every recruit button and upgrade card shows what it actually adds per second.',
    prs: [18, 27],
  },
  {
    date: '2026-06-11',
    icon: '👑',
    title: 'Prestige rework & clicking matters',
    description:
      'Refounding scales with lifetime gold instead of a flat target, and click synergy plus critical quests keep your own fingers relevant.',
    prs: [7, 13],
  },
  {
    date: '2026-06-10',
    icon: '🏰',
    title: 'The guild opens its doors',
    description:
      'Quests, heroes, upgrades, prestige, a pixel-art guild yard and homemade sound effects. Welcome in, adventurer.',
    prs: [1, 2, 10],
  },
];
