const stages = [
  { n: 0, label: "Repo and guardrails", status: "in progress" },
  { n: 1, label: "Load a capped sample of CFPB debt collection complaints into Postgres", status: "planned" },
  { n: 2, label: "Classify complaints with Claude Haiku 5.5", status: "planned" },
  { n: 3, label: "Expose the data through an MCP server", status: "planned" },
  { n: 4, label: "Add an analyst agent", status: "planned" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-24">
      <p className="w-fit rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-300">
        Under construction
      </p>
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">complaint-desk</h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          A complaint intelligence system built on the public{" "}
          <a
            className="underline underline-offset-4"
            href="https://www.consumerfinance.gov/data-research/consumer-complaints/"
          >
            CFPB consumer complaint database
          </a>
          , limited to debt collection complaints. It will classify complaints, expose them to AI
          tools through an MCP server, and support an analyst agent.
        </p>
      </div>
      <ol className="flex flex-col gap-2 text-sm">
        {stages.map((s) => (
          <li key={s.n} className="flex gap-3">
            <span className="w-16 shrink-0 font-mono text-zinc-500">Stage {s.n}</span>
            <span className="flex-1">{s.label}</span>
            <span className="shrink-0 text-zinc-500">{s.status}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-zinc-500">No complaint data is loaded yet.</p>
    </main>
  );
}
