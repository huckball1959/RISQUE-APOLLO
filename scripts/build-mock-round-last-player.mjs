/**
 * Writes scripts/risque-mock-round{N}-player4.json — 4 players, last seat MOCK_D in cardplay, random map + hands.
 * Run from repo root:
 *   node scripts/build-mock-round-last-player.mjs 5
 *   node scripts/build-mock-round-last-player.mjs 10
 *   node scripts/build-mock-round-last-player.mjs 15
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

const round = Math.max(1, parseInt(process.argv[2] || "5", 10) || 5);

const CARD_NAMES = [
  "afghanistan",
  "alaska",
  "alberta",
  "argentina",
  "brazil",
  "central_america",
  "china",
  "congo",
  "east_africa",
  "eastern_australia",
  "eastern_united_states",
  "egypt",
  "great_britain",
  "greenland",
  "iceland",
  "india",
  "indonesia",
  "irkutsk",
  "japan",
  "kamchatka",
  "madagascar",
  "middle_east",
  "mongolia",
  "new_guinea",
  "north_africa",
  "northern_europe",
  "northwest_territory",
  "ontario",
  "peru",
  "quebec",
  "scandinavia",
  "siam",
  "siberia",
  "south_africa",
  "southern_europe",
  "ukraine",
  "ural",
  "venezuela",
  "western_australia",
  "western_europe",
  "western_united_states",
  "yakutsk",
  "wildcard1",
  "wildcard2"
];

const TERRITORY_ONLY = CARD_NAMES.filter((c) => !c.startsWith("wildcard"));

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardObj(name) {
  return { name, id: randomUUID() };
}

const names = ["MOCK_A", "MOCK_B", "MOCK_C", "MOCK_D"];
const colors = ["blue", "red", "green", "yellow"];
const mapShuffle = shuffle(TERRITORY_ONLY);

const players = names.map((name, pi) => {
  const slice = mapShuffle.slice(pi * 10, (pi + 1) * 10);
  const territories = slice.map((nm, ti) => ({
    name: nm,
    troops: 2 + ((pi + ti) % 4)
  }));
  return {
    name,
    color: colors[pi],
    playerOrder: pi + 1,
    bookValue: 0,
    continentValues: {},
    bankValue: 0,
    cardCount: 0,
    cards: [],
    territories,
    troopsTotal: territories.reduce((s, t) => s + (Number(t.troops) || 0), 0),
    confirmed: true
  };
});

const deckPile = shuffle(CARD_NAMES.map((c) => c));
players.forEach((p) => {
  p.cards = [];
  for (let i = 0; i < 4; i++) {
    const nm = deckPile.pop();
    if (nm) p.cards.push(cardObj(nm));
  }
  p.cardCount = p.cards.length;
});

const gs = {
  phase: "cardplay",
  setupComplete: true,
  risqueHostHudStatsColumnRetired: false,
  selectionPhase: "cardPlay",
  players,
  turnOrder: names.slice(),
  currentPlayer: "MOCK_D",
  round,
  aerialAttack: false,
  aerialAttackEligible: false,
  aerialBridge: null,
  conquered: false,
  deck: deckPile,
  discardPile: [],
  isInitialDeploy: false,
  continents: {
    south_america: { bonus: 2 },
    north_america: { bonus: 5 },
    africa: { bonus: 3 },
    europe: { bonus: 5 },
    asia: { bonus: 7 },
    australia: { bonus: 2 }
  },
  continentCollectionCounts: {
    south_america: 0,
    north_america: 0,
    africa: 0,
    europe: 0,
    asia: 0,
    australia: 0
  },
  cardplayConquered: false,
  cardEarnedViaAttack: true,
  cardEarnedViaCardplay: false,
  cardAwardedThisTurn: false,
  lastCardDrawn: null,
  risquePlayedCardsGallery: [],
  risqueLuckyLedger: { byPlayer: {} },
  risqueLuckySessionRoster: names.slice(),
  attackPhase: "attack",
  attackingTerritory: null,
  acquiredTerritory: null,
  minTroopsToTransfer: 0,
  conqueredThisTurn: false,
  risqueAutosaveTier: "manual",
  risqueReplayTapeSessionKey: "mock-r" + round + "-" + randomUUID(),
  risqueReplayTape: { v: 2, events: [], openingRecorded: false, hasDealFrames: false },
  risqueReplayDealDeployDiskWritten: true
};

const out = join(__dirname, `risque-mock-round${round}-player4.json`);
writeFileSync(out, JSON.stringify(gs, null, 2), "utf8");
console.log("Wrote", out, "round=", round, "deck remaining:", gs.deck.length);
