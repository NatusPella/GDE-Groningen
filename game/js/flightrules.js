// Flying and the things on the ground (issue #139): a pigeon (or anything
// else that flies) only touches a prop that reaches up to its height.
// alt: height of the flier's feet above the ground; h: height of the prop.
export const FLIGHT_MARGIN = 0.15;
export const touchesProp = (alt, h = 1) => !(alt > h + FLIGHT_MARGIN);
