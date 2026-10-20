/**
 * Where each player sits on the felt. You are always at the bottom; the others follow
 * clockwise (to your left first), which is the order play goes round the table.
 */

// Positions as percentages of the felt.
const SPOTS = {
  bottom: { x: 50, y: 86 },
  left: { x: 11, y: 48 },
  top: { x: 50, y: 14 },
  right: { x: 89, y: 48 },
  topLeft: { x: 27, y: 15 },
  topRight: { x: 73, y: 15 },
  lowerLeft: { x: 11, y: 66 },
  upperLeft: { x: 15, y: 27 },
  upperRight: { x: 85, y: 27 },
  lowerRight: { x: 89, y: 66 },
}

const LAYOUTS = {
  2: ['bottom', 'top'],
  3: ['bottom', 'left', 'right'],
  4: ['bottom', 'left', 'top', 'right'],
  5: ['bottom', 'left', 'topLeft', 'topRight', 'right'],
  6: ['bottom', 'lowerLeft', 'upperLeft', 'top', 'upperRight', 'lowerRight'],
}

// Card on the felt (trick), centred on its anchor point with negative margins.
export const TABLE_CARD = 'h-20 w-14 -ml-7 -mt-10 sm:h-24 sm:w-[4.25rem] sm:-ml-[2.125rem] sm:-mt-12'
// Smaller card for the deck and the deal.
export const MINI_CARD = 'h-14 w-10 -ml-5 -mt-7 sm:h-[4.5rem] sm:w-[3.25rem] sm:-ml-[1.625rem] sm:-mt-9'

/** Seat position (in %) for `seat`, seen from `mySeat` (use 0 if you're not seated). */
export const seatSpot = (seat, mySeat, n) => {
  const layout = LAYOUTS[n] ?? LAYOUTS[4]
  return SPOTS[layout[(((seat - Math.max(mySeat, 0)) % n) + n) % n]]
}

/** Pixel offset from the centre of a felt of `size` towards a seat, scaled by `k` (1 = the seat itself). */
export const seatOffset = (seat, mySeat, n, size, k = 1) => {
  const spot = seatSpot(seat, mySeat, n)
  return { x: ((spot.x - 50) / 100) * size.w * k, y: ((spot.y - 50) / 100) * size.h * k }
}

/** Where a played card rests: a little way from the centre towards whoever played it. */
export const trickOffset = (seat, mySeat, n, size) => {
  const o = seatOffset(seat, mySeat, n, size, 0.32)
  const clamp = (v, max) => Math.max(-max, Math.min(max, v))
  return { x: clamp(o.x, 80), y: clamp(o.y, 56) }
}
