import type { Owner } from './types'

/**
 * Real people who manage teams — display-only (linked from MEMBERS via owners[].ownerId).
 * One slot per member; ids mirror the ffuId (owner-009 ↔ ffu-009). Blank entries render as "—".
 * `lastInitial` is set ONLY when a first name is shared (e.g. multiple Tylers) to disambiguate;
 * unique first names display first-name-only.
 */
export const OWNERS: Owner[] = [
  { id: 'owner-001', firstName: 'Jonathan', lastInitial: '' }, // The Stallions
  { id: 'owner-002', firstName: 'Jake', lastInitial: '' }, // FFUcked Up
  { id: 'owner-003', firstName: 'Derek', lastInitial: 'A' }, // Dmandre161
  { id: 'owner-004', firstName: 'Darien', lastInitial: '' }, // Blood, Sweat, and Beers
  { id: 'owner-005', firstName: 'Holten', lastInitial: '' }, // Malibu Leopards
  { id: 'owner-006', firstName: 'Andrew', lastInitial: '' }, // Pottsville Maroons
  { id: 'owner-007', firstName: 'Elliot', lastInitial: '' }, // Dark Knights
  { id: 'owner-008', firstName: 'Adam', lastInitial: '' }, // Frank's Little Beauties
  { id: 'owner-009', firstName: 'Kalvin', lastInitial: '' }, // Fort Wayne Banana Bread
  { id: 'owner-010', firstName: 'Andrew', lastInitial: 'F' }, // ChicagoPick6
  { id: 'owner-011', firstName: 'Torin', lastInitial: '' }, // TKO Blow
  { id: 'owner-012', firstName: 'Austin', lastInitial: '' }, // Show Biz Kitten
  { id: 'owner-013', firstName: 'Quintin', lastInitial: '' }, // Boca Ciega Banditos
  { id: 'owner-014', firstName: 'Seth', lastInitial: '' }, // The (Teddy) Bears
  { id: 'owner-015', firstName: '', lastInitial: '' }, // arcorey15
  { id: 'owner-016', firstName: '', lastInitial: '' }, // MustachePapi
  { id: 'owner-017', firstName: 'Kaylee', lastInitial: '' }, // The Riveters
  { id: 'owner-018', firstName: 'Mitch', lastInitial: '' }, // Crawfordsville's Finest
  { id: 'owner-019', firstName: '???', lastInitial: 'F' }, // LegendsRise (first name TBD)
  { id: 'owner-020', firstName: 'Bob', lastInitial: '' }, // The Tooth Tuggers
  { id: 'owner-021', firstName: 'Jack', lastInitial: '' }, // Nighthawks
  { id: 'owner-022', firstName: 'Ben', lastInitial: '' }, // The Gaston Ramblers
  { id: 'owner-023', firstName: 'Josh', lastInitial: '' }, // The Minutemen
  { id: 'owner-024', firstName: 'Brandon', lastInitial: '' }, // Act More Stupidly
  { id: 'owner-025', firstName: 'Jensen', lastInitial: '' }, // Indianapolis Aztecs
  { id: 'owner-026', firstName: 'Nathan', lastInitial: '' }, // Raging Rhinos
  { id: 'owner-027', firstName: 'Cam', lastInitial: '' }, // CamDelphia
  { id: 'owner-028', firstName: 'Zach', lastInitial: '' }, // El Guapo Puto
  { id: 'owner-029', firstName: 'Marcus', lastInitial: '' }, // Team Pancake
  { id: 'owner-030', firstName: 'John', lastInitial: '' }, // Johnkshire Cats
  { id: 'owner-031', firstName: 'Tyler', lastInitial: 'H' }, // Team Dogecoin (co-owned)
  { id: 'owner-032', firstName: 'Michael', lastInitial: '' }, // Team Dogecoin (co-owned)
  { id: 'owner-033', firstName: '', lastInitial: 'W' }, // He Hate Me (first name TBD)
  { id: 'owner-034', firstName: 'Ethan', lastInitial: '' }, // CENATION
  { id: 'owner-035', firstName: '', lastInitial: '' }, // ZBoser
  { id: 'owner-036', firstName: 'Zach', lastInitial: 'P' }, // Big Ten Bandits
  { id: 'owner-037', firstName: 'Tyler', lastInitial: '' }, // Head Cow Always Grazing
  { id: 'owner-038', firstName: 'Seth', lastInitial: '' }, // Odin's Herr
  { id: 'owner-039', firstName: 'Kyle', lastInitial: '' }, // Bucky Badgers
  { id: 'owner-040', firstName: 'Mark', lastInitial: '' }, // The Sha'Dynasty
  { id: 'owner-041', firstName: 'Jacob', lastInitial: '' }, // Team Jacamart
  { id: 'owner-042', firstName: 'Charlie', lastInitial: '' }, // Stark Direwolves
  { id: 'owner-043', firstName: 'Tyler', lastInitial: 'C' }, // Circle City Phantoms
  { id: 'owner-044', firstName: 'Ashton', lastInitial: '' }, // Shton's Strikers
  { id: 'owner-045', firstName: 'Mike', lastInitial: '' }, // Team Black Death
  { id: 'owner-046', firstName: 'Oliver', lastInitial: '' }, // Birds of War
  { id: 'owner-047', firstName: '', lastInitial: '' }, // bstarrr
  { id: 'owner-048', firstName: 'Emma', lastInitial: '' }, // dewdoc
  { id: 'owner-049', firstName: 'Will', lastInitial: '' }, // The Ducklings
  { id: 'owner-050', firstName: 'Chet', lastInitial: '' }, // chetmaynard
  { id: 'owner-051', firstName: 'Dylan', lastInitial: '' }, // Stone Cold Steve Irwins
  { id: 'owner-052', firstName: 'Dan', lastInitial: '' }, // The Steel Tigers
  { id: 'owner-053', firstName: 'Ashley', lastInitial: '' }, // Jawn of Arc
  { id: 'owner-054', firstName: 'Ryan', lastInitial: '' }, // The Underdogs
  { id: 'owner-055', firstName: 'Erik', lastInitial: '' }, // Dawn Island Straw Hats
  { id: 'owner-056', firstName: 'Hunter', lastInitial: '' }, // The Inferno Swarm
  { id: 'owner-h01', firstName: '', lastInitial: '' }, // Naptown Makos
  { id: 'owner-h02', firstName: '', lastInitial: '' }, // Speedway's Ritual Cog
  { id: 'owner-h03', firstName: '', lastInitial: '' }, // The Well Done Stakes
  { id: 'owner-h04', firstName: 'Derek', lastInitial: 'A' }, // Durham Handsome Devils
  { id: 'owner-h05', firstName: 'Carter', lastInitial: '' }, // The Losers
  { id: 'owner-h06', firstName: '', lastInitial: '' }, // Gingy Flame
  { id: 'owner-h07', firstName: 'Joe', lastInitial: '' }, // Not Your Average Joes
  { id: 'owner-h08', firstName: '', lastInitial: '' }, // Team Team Casa
]
