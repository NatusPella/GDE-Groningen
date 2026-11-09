// #800 (punt 14): de intrinsieke tweede laag per activiteit, in één tabel. Dit is geen nieuwe
// teller of munteenheid: het maakt zichtbaar wat een activiteit al te bieden heeft naast de
// medaille — een variant, een verzameling of een eigen leerlijn. Activiteiten zonder zo'n laag
// staan bewust niet in deze tabel; docs/ACTIVITEITEN-TWEEDE-LAAG.md noemt ze als uitzondering.
export const ACTIVITEIT_LAAG = {
  discgolf: 'de volle achttien holes na je eerste goud',
  kartbaan: 'de tijdattack: je snelste ronde telt apart',
  skatepark: 'de langste keten: één reeks, niet de som',
  hengelen: 'het visboek: elke soort een keer vangen',
  carillon: 'drie liedjes, elk met een eigen record',
  vliegschool: 'twintig lessen, per toestel je eigen leerlijn',
  wandeling: 'de stempels onderweg: elke etappe een eigen doel',
  regatta: 'de vaste baan op de Hoornse Plas met een eigen record',
};

export const laagVan = (id) => ACTIVITEIT_LAAG[String(id || '')] || '';
export const aantalMetLaag = () => Object.keys(ACTIVITEIT_LAAG).length;
