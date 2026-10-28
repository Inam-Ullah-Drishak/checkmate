/**
 * The rules page copy: how chess works, step by step, then what is particular
 * to this game. Plain data so the page can be reworded without touching the
 * layout. Items with a `diagram` are drawn as a small board; with a `then` as
 * well, the two are shown as "before" and "after".
 */

/** What a rules diagram shows. Squares are named like "e4". */
export interface Diagram {
  /** Pieces on the board, written colour + piece + "@" + square: "wK@e4", "bP@d7". */
  pieces: string[];
  /** Green dots: squares the piece may move to. */
  dots?: string[];
  /** Red rings: pieces that can be captured. */
  rings?: string[];
  /** Red squares: a king in check, a king with nowhere to go, or squares that are attacked. */
  marks?: string[];
  /** Faded pieces showing where something was or ends up, same notation as `pieces`. */
  ghosts?: string[];
  /** Arrows, from one square to another. */
  arrows?: [string, string][];
  /** Draw the file letters and rank numbers. */
  coords?: boolean;
}

export interface RuleItem {
  /** A short lead-in, shown in bold ("King", "Castling"). */
  name?: string;
  text: string;
  diagram?: Diagram;
  /** A second diagram, shown after the first (the position once the move is made). */
  then?: Diagram;
  /** Take a full row, with the picture beside the text. */
  wide?: boolean;
}

export interface RuleSection {
  title: string;
  intro?: string;
  items?: RuleItem[];
}

// ---- helpers to list the squares a piece reaches on an empty board -------------

const FILES = "abcdefgh";
const square = (file: number, rank: number): string => FILES[file] + (rank + 1);

/** Every square along each direction until the edge of the board. */
const slide = (from: string, directions: [number, number][]): string[] => {
  const squares: string[] = [];
  for (const [df, dr] of directions) {
    let file = FILES.indexOf(from[0]) + df;
    let rank = Number(from[1]) - 1 + dr;
    while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
      squares.push(square(file, rank));
      file += df;
      rank += dr;
    }
  }
  return squares;
};

/** One step (or one jump) to each offset that stays on the board. */
const hop = (from: string, offsets: [number, number][]): string[] =>
  offsets
    .map(([df, dr]) => [FILES.indexOf(from[0]) + df, Number(from[1]) - 1 + dr])
    .filter(([file, rank]) => file >= 0 && file < 8 && rank >= 0 && rank < 8)
    .map(([file, rank]) => square(file, rank));

const STRAIGHT: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAGONAL: [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const KNIGHT: [number, number][] = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

/** All 32 pieces in their starting squares. */
const START: string[] = (() => {
  const back = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  return FILES.split("").flatMap((file, index) => [`w${back[index]}@${file}1`, `wP@${file}2`, `bP@${file}7`, `b${back[index]}@${file}8`]);
})();

export const RULES: RuleSection[] = [
  {
    title: "1. The board and the pieces",
    intro:
      "Chess is a game for two. You take turns, one move each, and you may never skip a turn. The player with the white pieces moves first. In the diagrams on this page white pieces are the ones that start at the bottom and move up the board.",
    items: [
      {
        name: "The board",
        text: "It has 64 squares in 8 columns and 8 rows. The columns are called files and are named a to h. The rows are called ranks and are numbered 1 to 8. Every square has a name, like e4. Two things help you set up: there is a light square in the bottom-right corner, and each queen starts on a square of her own colour.",
        diagram: { pieces: START, coords: true },
        wide: true,
      },
      {
        name: "Your army",
        text: "Each side starts with 16 pieces: one king, one queen, two rooks, two bishops, two knights and eight pawns. In this game the two sides are called by the names of the piece colour you picked in Settings (Silver and Gold at first). Silver, the white side, moves first.",
      },
      {
        name: "What the pieces are worth",
        text: "Pawn 1 point. Knight 3. Bishop 3. Rook 5. Queen 9. The king cannot be traded, because losing it loses the game. Use the points when you swap pieces: try to win more than you give up.",
      },
    ],
  },
  {
    title: "2. How the pieces move",
    intro: "The green dots show every square the piece could go to if the board were empty. A piece can never jump over another piece, except the knight.",
    items: [
      {
        name: "King",
        text: "One square in any direction. It is the piece you must protect, and it can never move onto a square that an enemy piece attacks.",
        diagram: { pieces: ["wK@e4"], dots: hop("e4", [...STRAIGHT, ...DIAGONAL]) },
      },
      {
        name: "Queen",
        text: "The strongest piece. Any number of squares in a straight line or on a diagonal.",
        diagram: { pieces: ["wQ@d4"], dots: slide("d4", [...STRAIGHT, ...DIAGONAL]) },
      },
      {
        name: "Rook",
        text: "Any number of squares forward, back or sideways, but not diagonally.",
        diagram: { pieces: ["wR@d4"], dots: slide("d4", STRAIGHT) },
      },
      {
        name: "Bishop",
        text: "Any number of squares on a diagonal. It always stays on the colour of squares it started on, so each side has one light-square and one dark-square bishop.",
        diagram: { pieces: ["wB@d4"], dots: slide("d4", DIAGONAL) },
      },
      {
        name: "Knight",
        text: "An L shape: two squares in one direction, then one to the side. It is the only piece that jumps over others, so it is never blocked.",
        diagram: { pieces: ["wN@d4", "wP@d5", "wP@e4", "bP@d3"], dots: hop("d4", KNIGHT) },
      },
      {
        name: "Pawn",
        text: "Pawns move forward only. One square at a time, or two squares on their first move. They capture differently from how they move: one square diagonally forward.",
        diagram: { pieces: ["wP@e2", "bP@d3", "bP@f3"], dots: ["e3", "e4"], rings: ["d3", "f3"] },
      },
      {
        name: "Pieces in the way",
        text: "A piece cannot move through another piece. Your own pieces block you completely. An enemy piece blocks you too, but you may capture it and stop on its square.",
        diagram: {
          pieces: ["wR@d4", "wP@d6", "bP@b4"],
          dots: ["d5", "d3", "d2", "d1", "e4", "f4", "g4", "h4", "c4"],
          rings: ["b4"],
        },
      },
    ],
  },
  {
    title: "3. Capturing",
    items: [
      {
        name: "How to capture",
        text: "Move your piece onto a square where an enemy piece stands. The enemy piece is taken off the board for good and yours takes its place. You can never capture your own pieces, and you are never forced to capture.",
        diagram: { pieces: ["wR@d3", "bP@d7"], rings: ["d7"], arrows: [["d3", "d7"]] },
        then: { pieces: ["wR@d7"] },
      },
      {
        name: "Captured pieces in this game",
        text: "Captured pieces move to the edge of the board in front of their own side, so you can always see what has been lost.",
      },
    ],
  },
  {
    title: "4. Check",
    intro: "A king is in check when an enemy piece could capture it on the next move. You must always get out of check straight away. There are exactly three ways.",
    items: [
      {
        name: "Check",
        text: "The black rook attacks the white king along the file. The king is in check, shown by the red square.",
        diagram: { pieces: ["wK@e1", "bR@e8", "bK@a8"], marks: ["e1"], arrows: [["e8", "e1"]] },
      },
      {
        name: "1. Move the king",
        text: "Step to a square the enemy does not attack.",
        diagram: { pieces: ["wK@e1", "bR@e8"], marks: ["e1"], dots: ["d1", "d2", "f1", "f2"], arrows: [["e8", "e1"]] },
      },
      {
        name: "2. Block the attack",
        text: "Put one of your pieces between the attacker and your king. This does not work against a knight, which jumps.",
        diagram: { pieces: ["wK@e1", "bR@e8", "wB@c3"], marks: ["e1"], ghosts: ["wB@e5"], arrows: [["e8", "e1"], ["c3", "e5"]] },
      },
      {
        name: "3. Capture the attacker",
        text: "Take the piece that is giving check.",
        diagram: { pieces: ["wK@e1", "bR@e4", "wN@d2"], marks: ["e1"], rings: ["e4"], arrows: [["d2", "e4"]] },
      },
      {
        name: "Moves you may not make",
        text: "You can never make a move that leaves your own king attacked. Here the black rook controls the d-file, so the king may not step onto the red squares.",
        diagram: { pieces: ["wK@e1", "bR@d8"], marks: ["d1", "d2"], dots: ["e2", "f1", "f2"] },
      },
      {
        name: "Pins",
        text: "If a piece stands between an attacker and your king, it is pinned. It may not move away, because that would put your king in check. Here the white knight cannot move at all.",
        diagram: { pieces: ["wK@e1", "wN@e4", "bR@e8"], arrows: [["e8", "e1"]] },
      },
    ],
  },
  {
    title: "5. Special moves",
    items: [
      {
        name: "Castling, short",
        text: "The king moves two squares towards the rook, and the rook jumps over it to the square next to it. It protects your king and brings your rook into play. It counts as one move.",
        diagram: { pieces: ["wK@e1", "wR@h1"], arrows: [["e1", "g1"], ["h1", "f1"]] },
        then: { pieces: ["wK@g1", "wR@f1"] },
      },
      {
        name: "Castling, long",
        text: "The same on the other side: the king goes to c1 and the rook from a1 to d1.",
        diagram: { pieces: ["wK@e1", "wR@a1"], arrows: [["e1", "c1"], ["a1", "d1"]] },
        then: { pieces: ["wK@c1", "wR@d1"] },
      },
      {
        name: "When castling is not allowed",
        text: "Neither the king nor that rook may have moved before. There must be no pieces between them. The king may not be in check, may not pass over a square an enemy attacks, and may not land on one.",
      },
      {
        name: "En passant",
        text: "French for \"in passing\". If an enemy pawn jumps two squares and lands right beside your pawn, you may capture it as if it had moved only one square. You must do it on the very next move or lose the chance.",
        diagram: { pieces: ["wP@e5", "bP@d5"], ghosts: ["bP@d7"], rings: ["d5"], arrows: [["d7", "d5"], ["e5", "d6"]] },
        then: { pieces: ["wP@d6"] },
      },
      {
        name: "Promotion",
        text: "A pawn that reaches the far end of the board must turn into a queen, rook, bishop or knight (your choice, almost always a queen). In this game a box asks which piece you want, unless you turned on automatic queens in Settings.",
        diagram: { pieces: ["wP@e7", "bK@a8"], arrows: [["e7", "e8"]] },
        then: { pieces: ["wQ@e8", "bK@a8"] },
      },
    ],
  },
  {
    title: "6. How a game ends",
    items: [
      {
        name: "Checkmate: you win",
        text: "The king is in check and there is no way out: it cannot move, nothing can block, and the attacker cannot be captured. Here the rook gives check and the black pawns trap their own king.",
        diagram: { pieces: ["bK@g8", "bP@f7", "bP@g7", "bP@h7", "wR@a8", "wK@g1"], marks: ["g8"], arrows: [["a8", "g8"]] },
      },
      {
        name: "Stalemate: a draw",
        text: "It is a player's turn, their king is not in check, but they have no legal move at all. The game is a draw, not a win. This is the most common mistake when you are far ahead, so always leave the enemy king a square to move to.",
        diagram: { pieces: ["bK@h8", "wK@f7", "wQ@g6"], marks: ["h8"] },
      },
      {
        name: "Not enough pieces",
        text: "If neither side could ever checkmate, the game is a draw. That is king against king, or king and one bishop or knight against a lone king.",
        diagram: { pieces: ["wK@a1", "wB@c1", "bK@h8"] },
      },
      {
        name: "Three times the same",
        text: "If the same position appears three times, the game is a draw.",
      },
      {
        name: "Fifty moves",
        text: "If fifty moves in a row pass with no capture and no pawn move, the game is a draw.",
      },
      {
        name: "Resigning and draws by agreement",
        text: "You may resign at any time, and the other side wins. You may also offer a draw. The computer accepts unless it is clearly ahead.",
      },
    ],
  },
  {
    title: "7. Reading the move list",
    intro: "The list at the side of the board writes each move in short form.",
    items: [
      { name: "e4", text: "A pawn moves to e4. A move with no letter in front is a pawn move." },
      { name: "Nf3", text: "A piece moves to f3. The letter is the piece: K king, Q queen, R rook, B bishop, N knight." },
      { name: "Bxc6", text: "The x means a capture: the bishop captures on c6." },
      { name: "exd5", text: "A pawn on the e-file captures on d5." },
      { name: "O-O and O-O-O", text: "Short and long castling." },
      { name: "e8=Q", text: "A pawn reaches e8 and becomes a queen." },
      { name: "+ and #", text: "A plus means check. A hash means checkmate." },
    ],
  },
  {
    title: "8. First tips",
    items: [
      { name: "Fight for the centre", text: "Move your e and d pawns forward early. Pieces in the middle of the board control more squares." },
      { name: "Bring your pieces out", text: "Develop your knights and bishops before moving the same piece twice. Keep the queen at home for the first moves." },
      { name: "Castle early", text: "It puts your king in a safer corner and wakes up a rook." },
      { name: "Check before every move", text: "Ask two questions: what is my opponent threatening now, and does my move leave a piece unprotected?" },
      { name: "Do not stalemate", text: "When you are winning, make sure the enemy king still has a legal move after yours, unless you are giving checkmate." },
    ],
  },
  {
    title: "9. Playing in this game",
    items: [
      { name: "Moving", text: "Click one of your pieces. Green dots show where it can go and red dots show captures. Click a dot to move. Click the piece again, or another of your pieces, to change your mind." },
      { name: "Looking around", text: "Turn on Move view to drag and rotate the board and scroll to zoom. Reset view puts the camera back." },
      { name: "The computer", text: "Easy, medium and hard use a small search engine. Master and GM use Stockfish and are very strong. Pick your difficulty and which team you play on the Play tab." },
      { name: "Move timer", text: "If you choose a move timer and it runs out, your turn is skipped and the computer moves again. If your king is in check, a random legal move is played for you instead, because chess does not allow skipping a turn when in check." },
      { name: "Help", text: "Undo takes back your move and the computer's reply. Hint shows a strong move for a few seconds. Offer draw and Resign end the game early." },
      { name: "Puzzles", text: "The Puzzles tab gives you positions where you must find checkmate in one or two moves." },
      { name: "Your games", text: "Finished games are saved in this browser. Open History to replay one move by move, or paste a game to review it. Copy PGN copies your game so you can keep it." },
      { name: "Settings", text: "Choose the board, the piece colour, the move timer, sound and the on-screen helpers in Settings. Everything is saved in this browser." },
    ],
  },
];
