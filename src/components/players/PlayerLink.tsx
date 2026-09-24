import { Link } from 'react-router-dom'
import { posClass } from '../positions'
import { playerPath } from './paths'

/** A player's position badge + name, linking to his FFU history. */
export function PlayerLink({ playerId, name, position }: { playerId: string; name: string; position: string }) {
  return (
    <Link
      to={playerPath(playerId)}
      className="flex items-center gap-2 whitespace-nowrap font-medium hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className={`w-9 shrink-0 rounded px-1 text-center text-[10px] font-bold ${posClass(position)}`}>{position}</span>
      {name}
    </Link>
  )
}
