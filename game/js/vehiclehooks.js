// Haken die vehicle.js aanroept maar die in modules wonen die zelf vehicle.js nodig hebben
// (railway.js, parkedcars.js): zo blijft vehicle.js een bladmodule voor die twee (#108).
// De modules zetten hun functie hier bij het laden; zonder die module doet de haak niets.
export const vehicleHooks = {
  crossingSpeedLimit: () => Infinity,
  loweredBoomsNear: () => [],
  snapBoom: () => {},
  manageParkedCars: () => {},
  tickParkedCars: () => {},
};
