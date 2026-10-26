/**
 * Opening names, matched by the moves played so far.
 *
 * shortcut: a short hand-written table of the common openings (about 50), not
 * the full ECO catalogue; it names the main lines only. Swap in the lichess
 * chess-openings dataset if every variation should be named.
 */

const OPENINGS: [moves: string, name: string][] = [
  ["e4", "King's Pawn Opening"],
  ["e4 e5", "Open Game"],
  ["e4 e5 Nf3", "King's Knight Opening"],
  ["e4 e5 Nf3 Nc6", "King's Knight Opening"],
  ["e4 e5 Nf3 Nc6 Bb5", "Ruy Lopez"],
  ["e4 e5 Nf3 Nc6 Bb5 a6", "Ruy Lopez: Morphy Defence"],
  ["e4 e5 Nf3 Nc6 Bc4", "Italian Game"],
  ["e4 e5 Nf3 Nc6 Bc4 Bc5", "Giuoco Piano"],
  ["e4 e5 Nf3 Nc6 Bc4 Nf6", "Two Knights Defence"],
  ["e4 e5 Nf3 Nc6 d4", "Scotch Game"],
  ["e4 e5 Nf3 Nf6", "Petrov's Defence"],
  ["e4 e5 f4", "King's Gambit"],
  ["e4 e5 Nc3", "Vienna Game"],
  ["e4 e5 Bc4", "Bishop's Opening"],
  ["e4 c5", "Sicilian Defence"],
  ["e4 c5 Nf3 d6", "Sicilian Defence: Najdorf and Dragon lines"],
  ["e4 c5 Nf3 Nc6", "Sicilian Defence: Old Sicilian"],
  ["e4 c5 Nf3 e6", "Sicilian Defence: French Variation"],
  ["e4 c5 Nc3", "Sicilian Defence: Closed"],
  ["e4 c5 c3", "Sicilian Defence: Alapin"],
  ["e4 e6", "French Defence"],
  ["e4 e6 d4 d5", "French Defence"],
  ["e4 e6 d4 d5 e5", "French Defence: Advance"],
  ["e4 e6 d4 d5 Nc3", "French Defence: Classical and Winawer"],
  ["e4 c6", "Caro-Kann Defence"],
  ["e4 c6 d4 d5", "Caro-Kann Defence"],
  ["e4 d5", "Scandinavian Defence"],
  ["e4 d6", "Pirc Defence"],
  ["e4 g6", "Modern Defence"],
  ["e4 Nf6", "Alekhine's Defence"],
  ["d4", "Queen's Pawn Opening"],
  ["d4 d5", "Closed Game"],
  ["d4 d5 c4", "Queen's Gambit"],
  ["d4 d5 c4 e6", "Queen's Gambit Declined"],
  ["d4 d5 c4 dxc4", "Queen's Gambit Accepted"],
  ["d4 d5 c4 c6", "Slav Defence"],
  ["d4 d5 Bf4", "London System"],
  ["d4 d5 Nf3 Nf6 Bf4", "London System"],
  ["d4 Nf6", "Indian Defence"],
  ["d4 Nf6 c4 g6", "King's Indian Defence"],
  ["d4 Nf6 c4 e6", "Indian Defence: Queen's Indian setup"],
  ["d4 Nf6 c4 e6 Nc3 Bb4", "Nimzo-Indian Defence"],
  ["d4 Nf6 Bg5", "Trompowsky Attack"],
  ["d4 f5", "Dutch Defence"],
  ["c4", "English Opening"],
  ["Nf3", "Réti Opening"],
  ["f4", "Bird's Opening"],
  ["b3", "Nimzo-Larsen Attack"],
  ["g3", "King's Fianchetto Opening"],
];

/** The most specific opening the game is still in, or `null` once it has left the table. */
export const openingName = (history: string[]): string | null => {
  let best: string | null = null;
  let bestLength = 0;

  for (const [moves, name] of OPENINGS) {
    const line = moves.split(" ");
    if (line.length > history.length || line.length <= bestLength) continue;
    if (line.every((move, index) => history[index] === move)) {
      best = name;
      bestLength = line.length;
    }
  }
  return best;
};
