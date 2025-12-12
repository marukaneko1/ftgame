import Link from "next/link";

const perks = [
  "Verified 18+ only — US residents",
  "Random 1:1 video with built-in safety controls",
  "In-call games: Chess, Trivia, Tic-Tac-Toe",
  "Tokens for gifts & wagers (no cash-out, entertainment only)",
  "Public rooms with reporting & moderation"
];

export default function LandingPage() {
  return (
    <main className="space-y-10">
      <section className="bg-gray-900 p-10 shadow-xl border border-white/20">
        <p className="text-sm uppercase tracking-[0.25em] text-gray-400">US-only beta</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-white">
          18+ verified social play with video, games, and safe tokens.
        </h1>
        <p className="mt-4 text-lg text-gray-300">
          Match with verified adults across the United States. Play quick games, send gifts with tokens
          (no cash-out), and join moderated public rooms.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/auth/register"
            className="bg-white px-6 py-3 text-base font-semibold text-black shadow-lg hover:bg-gray-200 border-2 border-white"
          >
            Sign up
          </Link>
          <Link
            href="/auth/login"
            className="bg-gray-800 px-6 py-3 text-base font-semibold text-white border-2 border-white/30 hover:bg-gray-700"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {perks.map((perk) => (
          <div key={perk} className="bg-gray-900 p-4 text-sm text-gray-100 border border-white/20">
            {perk}
          </div>
        ))}
      </section>
    </main>
  );
}


