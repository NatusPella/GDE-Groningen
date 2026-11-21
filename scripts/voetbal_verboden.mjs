// De lijst met echte clubwoorden die in de spelnamen niet mogen voorkomen (constitution 2, ADR 0043): alleen voor de tests en audits, bewust buiten game/ (text_audit scant de spelcode).
export const FORBIDDEN_CLUB_WORDS = ['VV', 'SV', 'FC', 'SC', 'RKSV', 'PSV', 'AZ', 'Ajax', 'Feyenoord', 'Heerenveen', 'Emmen', 'Cambuur', 'Twente', 'Zwolle', 'Volendam', 'Almere', 'Sparta', 'Sittard', 'Go Ahead',
  'Real', 'Barcelona', 'Bayern', 'Juventus', 'Milan', 'Inter', 'Manchester', 'Liverpool', 'Arsenal', 'Chelsea', 'Paris', 'Atletico', 'Atlético', 'Dortmund', 'Benfica', 'Celtic', 'Galatasaray', 'Madrid', 'Eredivisie', 'Champions', 'Europa League'];
export function hasForbiddenWord(text) {
  const t = String(text || '');
  return FORBIDDEN_CLUB_WORDS.some((w) => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu').test(t));
}
