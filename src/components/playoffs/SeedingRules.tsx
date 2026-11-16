import { PLAYOFF_FIELD } from '@/config'

// The league's seeding rules in plain words, beside the machine that applies them. The rules
// themselves live in selectors/playoffSeeding.ts; this is their description, so keep the two in step.
export function SeedingRules() {
  const { teams, byes, divisionWinnerSeeds } = PLAYOFF_FIELD
  return (
    <aside aria-labelledby="seeding-rules" className="border border-border bg-surface p-4 text-sm">
      <h2 id="seeding-rules" className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
        How seeds are set
      </h2>
      <ol className="list-decimal space-y-1 pl-5 text-dim">
        <li>
          Seeds 1–{divisionWinnerSeeds} go to the {divisionWinnerSeeds} best division winners, who get first-round byes
          {byes === divisionWinnerSeeds ? '' : ` (the top ${byes} seeds have byes)`}.
        </li>
        <li>Everyone else, the third division winner included, is ranked together for the remaining seeds.</li>
        <li>
          The third division winner is guaranteed a playoff spot: if it would miss out, it takes seed {teams} and the team
          that held it drops out.
        </li>
        <li>
          Teams level on record are split by their head-to-head record against the other tied teams (<b>H2H</b>), then by
          points for (<b>PF</b>) if that is level too. Division winners are decided the same way.
        </li>
      </ol>
      <p className="mt-3 text-xs text-muted">
        A picked game adds a win and a loss but no points, so a points-for tiebreak uses the points scored so far.
      </p>
    </aside>
  )
}
