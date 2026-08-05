import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DevSpec — write the spec before you build it",
  description:
    "A feature specification tool for teams of two to ten. Six questions and at least one acceptance check, enforced by the database, before any feature can leave discussion.",
};

const FEATURES = [
  {
    h: "A gate, not a suggestion",
    p: "Six questions and one acceptance check minimum. The rule lives in Postgres, so no client, no stray API call and no future refactor can route around it.",
  },
  {
    h: "Checks, not paragraphs",
    p: "Acceptance criteria are entered one per line, each able to pass or fail on its own. The field shape decides what people write, more than the label does.",
  },
  {
    h: "Notes that stay put",
    p: "Discussion lives on the feature, not in a chat window. Notes cannot be edited, because they are the record of what was actually said.",
  },
  {
    h: "Projects, not one giant list",
    p: "A team runs several codebases. Each gets its own tab, its own counter and its own view, so nothing drowns.",
  },
  {
    h: "Nothing you did not ask for",
    p: "No sprints, no story points, no burndown charts, no custom workflows. Five statuses and a blocked flag.",
  },
  {
    h: "Free to run",
    p: "Next.js on Vercel, Postgres on Neon. A team of four fits inside both free tiers with room to spare.",
  },
];

const STAGES = [
  { n: "Discussion", d: "Being figured out", v: "--s-discussion" },
  { n: "Specified", d: "The contract is set", v: "--s-specified" },
  { n: "Building", d: "Code is being written", v: "--s-building" },
  { n: "Review", d: "Branch is up", v: "--s-review" },
  { n: "Deployed", d: "Live", v: "--s-deployed" },
];

const FAQ = [
  {
    q: "Who is DevSpec for?",
    a: "Development teams of roughly two to ten people who discuss features in chat and cannot find those discussions later.",
  },
  {
    q: "How is this different from Jira or Linear?",
    a: "Those track work. DevSpec makes you define it first. There is no backlog grooming, no estimation and no workflow builder, and a feature physically cannot advance until it is specified.",
  },
  {
    q: "What are the six questions?",
    a: "Who it is for, what the person does step by step, how you know it works, what happens when it goes wrong, what is out of scope, and what existing behaviour it changes.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes. It is a Next.js app and a Postgres database. Anywhere that runs those runs DevSpec.",
  },
];

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DevSpec",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description:
      "Feature specification tool for small development teams. Enforces six questions and acceptance checks before a feature can move forward.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, faqLd]) }}
      />

      <div className="bar">
        <div className="bar-in">
          <Link href="/" className="logo">
            <span className="dot" />
            DevSpec
          </Link>
          <div className="bar-right">
            <Link href="/login" className="btn ghost">Sign in</Link>
            <Link href="/login?mode=register" className="btn">Start free</Link>
          </div>
        </div>
      </div>

      <main className="mk">
        <section className="hero">
          <span className="eyebrow">For teams of 2 to 10</span>
          <h1>
            Write the spec <span>before</span> you build it
          </h1>
          <p>
            Feature discussions die in chat. DevSpec keeps them attached to the feature,
            and refuses to let anything move forward until six questions are answered
            and the acceptance checks are written down.
          </p>
          <div className="cta">
            <Link href="/login?mode=register" className="btn">Start free</Link>
            <Link href="#how" className="btn ghost">See how it works</Link>
          </div>
        </section>

        <section className="sec" id="problem">
          <h2>The problem is not tracking. It is that decisions evaporate.</h2>
          <p>
            Three people agree on something in a group chat on Tuesday. By the following
            month nobody can find it, nobody remembers who decided, and the feature gets
            built twice or not at all. Adding a kanban board does not fix that, because a
            board tracks work that has already been defined.
          </p>
          <p>
            DevSpec puts the conversation inside the feature and makes the definition a
            precondition for progress.
          </p>
        </section>

        <section className="sec" id="how">
          <h2>Five statuses. One of them is locked.</h2>
          <p>
            A feature starts in Discussion and cannot leave it until the specification is
            complete. That single rule is the entire product.
          </p>
          <div className="flow">
            {STAGES.map((s) => (
              <div key={s.n} style={{ ["--c" as string]: `var(${s.v})` }}>
                <strong>{s.n}</strong>
                <small>{s.d}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="sec" id="features">
          <h2>What it does, and what it deliberately does not</h2>
          <div className="grid">
            {FEATURES.map((f) => (
              <div className="card" key={f.h}>
                <h3>{f.h}</h3>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sec" id="questions">
          <h2>The six questions</h2>
          <p>
            Every developer asks these before writing code. DevSpec asks them first, in
            writing, where everyone can see the answers.
          </p>
          <div className="grid">
            {[
              "Who is this for, and what problem does it solve?",
              "What does the person do, step by step?",
              "How do we know it works?",
              "What happens when it goes wrong?",
              "What is explicitly out of scope?",
              "What existing behaviour or data does this change?",
            ].map((q, i) => (
              <div className="card" key={q}>
                <h3>{String(i + 1).padStart(2, "0")}</h3>
                <p>{q}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sec" id="faq">
          <h2>Questions</h2>
          {FAQ.map((f) => (
            <div className="faq" key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </section>

        <section className="sec" style={{ textAlign: "center" }}>
          <h2>Stop losing decisions in chat</h2>
          <p style={{ margin: "0 auto 22px" }}>
            Takes two minutes to set up. Free for small teams.
          </p>
          <Link href="/login?mode=register" className="btn">Start free</Link>
        </section>
      </main>

      <footer>DevSpec &middot; write the spec before you build it</footer>
    </>
  );
}
