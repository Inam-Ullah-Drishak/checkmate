/**
 * Copy for the privacy policy page.
 *
 * Written for how the site actually works today: everything the game remembers
 * stays in the visitor's own browser. If the site ever adds analytics, accounts
 * or a server, this page must change with it, and `LEGAL_UPDATED` with it.
 * It is a plain-language summary, not legal advice.
 */
import type { LegalSection } from "@/views/legal/legal-document";

export const LEGAL_UPDATED = "Last updated 27 October 2026";

export const privacyPolicy: {
  title: string;
  intro: string;
  sections: readonly LegalSection[];
} = {
  title: "Privacy Policy",
  intro: "Checkmate is a chess game that runs in your browser. This page explains what it remembers about you and where that stays.",
  sections: [
    {
      heading: "What the game stores",
      body: [
        "To remember your choices and your games, the site saves a small amount of data in your own browser: your settings (board, piece design, difficulty, timer, sound), your win, loss and draw record, your last ten finished games, the puzzles you have solved, and the game you are playing right now.",
        "This data never leaves your device. It is not sent to us or to anyone else, and we cannot see it.",
      ],
    },
    {
      heading: "No accounts, cookies or tracking",
      body: [
        "You do not sign in and you do not give us a name or an email address. The site sets no cookies and runs no analytics, advertising or tracking scripts.",
        "The computer opponent and the hints run entirely on your device. The chess engine is loaded from this site and no move you make is sent anywhere.",
      ],
    },
    {
      heading: "What the host can see",
      body: [
        "Like any website, the company that hosts it records standard technical information with each request, such as your IP address, browser type and the pages you asked for. It is used to keep the site running and secure, and it is deleted after a short time.",
      ],
    },
    {
      heading: "Deleting your data",
      body: [
        "Open Settings and choose Reset record, history and puzzles to erase your games and results. To erase everything, including your settings, clear this site's data in your browser. Closing the tab also removes the game in progress.",
      ],
    },
    {
      heading: "Changes",
      body: ["If this site ever collects anything more, this page will say so before it does and the date above will change."],
    },
  ],
};
