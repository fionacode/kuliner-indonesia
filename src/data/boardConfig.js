export const boardConfig = {
  ladders: [
    { start: 3, end: 22 },
    { start: 7, end: 26 },
    { start: 15, end: 27 },
    { start: 25, end: 46 },
    { start: 28, end: 47 }
  ],
  snakes: [
    { start: 48, end: 27 },
    { start: 43, end: 18 },
    { start: 37, end: 24 },
    { start: 29, end: 13 },
    { start: 16, end: 4 }
  ],
  regions: {
    Jawa: { start: 1, end: 10, label: "Jawa" },
    Sulawesi: { start: 11, end: 20, label: "Sulawesi" },
    Kalimantan: { start: 21, end: 30, label: "Kalimantan" },
    Sumatra: { start: 31, end: 40, label: "Sumatra" },
    Papua: { start: 41, end: 50, label: "Papua" }
  }
};

/**
 * Helper to get the row and column (0-indexed) for a given box number.
 * The board uses a boustrophedon (snake) pattern:
 * - Bottom row (Row 4, index 4): 1 -> 10 (Left to Right)
 * - Row 3 (index 3): 20 -> 11 (Right to Left)
 * - Row 2 (index 2): 21 -> 30 (Left to Right)
 * - Row 1 (index 1): 40 -> 31 (Right to Left)
 * - Top row (Row 0, index 0): 41 -> 50 (Left to Right)
 * 
 * @param {number} cellNum - 1 to 50
 * @returns {{row: number, col: number}}
 */
export function getCellCoords(cellNum) {
  if (cellNum < 1 || cellNum > 50) return { row: 4, col: -1 }; // START area represented off-board
  
  const rowFromBottom = Math.floor((cellNum - 1) / 10);
  const row = 4 - rowFromBottom; // index from top (0 is top, 4 is bottom)
  
  let col;
  if (rowFromBottom % 2 === 0) {
    // Even rows (0, 2, 4 from bottom) go Left -> Right
    col = (cellNum - 1) % 10;
  } else {
    // Odd rows (1, 3 from bottom) go Right -> Left
    col = 9 - ((cellNum - 1) % 10);
  }
  
  return { row, col };
}

/**
 * Returns the region name for a given cell number.
 * @param {number} cellNum 
 * @returns {string}
 */
export function getRegionForCell(cellNum) {
  if (cellNum <= 0) return "START";
  if (cellNum <= 10) return "Jawa";
  if (cellNum <= 20) return "Sulawesi";
  if (cellNum <= 30) return "Kalimantan";
  if (cellNum <= 40) return "Sumatra";
  return "Papua";
}
