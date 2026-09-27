// Looks of the story's Frisian cast, shared by the cutscene actors
// (missionstory.js), Jelle's fierljep (fierljep.js) and the phone portraits
// (storycontact.js). Pure data. `look` overrides buildPersonMesh's random
// choices (models3d_people.js opts.look).

// Jelle Terpstra, "de Fryske Snackkening": vain, tall, royal-blue blazer,
// white shirt, cream trousers, blond quiff and moustache, sunglasses day and
// night, a red scarf (the pompeblêd red).
export const JELLE_LOOK = {
  shirt: 0x1d4f9c, skin: 0xe9c29c, hair: 0xe8c86a, variant: 'male', pants: 0xf2eee2, shoes: 0x5a3a1e, hairStyle: 'short', seed: 1581,
  look: { top: 'blazer', under: 0xf7f5ef, facial: 'moustache', glasses: true, shades: true, scarf: true, scarfColor: 0xc8102e, bottom: 'trousers', shoeType: 'leather', age: 'adult', build: 'avg', heightScale: 1.06, buildScale: 1.02, hat: null, bag: null },
};

// Durk & Douwe: identical twin henchmen, big and slow, matching red hoodies
// and beanies. Durk: blue beanie and a full beard; Douwe: white beanie and a
// moustache.
const TWIN = { shirt: 0xc8102e, skin: 0xe6b98f, hair: 0x8a6a3a, variant: 'male', pants: 0x2b3a55, shoes: 0x3a2a1a, hairStyle: 'buzz' };
const TWIN_LOOK = { top: 'hoodie', hat: 'beanie', bottom: 'jeans', shoeType: 'boot', age: 'adult', build: 'heavy', heightScale: 1.13, buildScale: 1.17, glasses: false, scarf: false, bag: null, umbrella: null };
export const DURK_LOOK = { ...TWIN, seed: 777, look: { ...TWIN_LOOK, hatColor: 0x1d4f9c, facial: 'beard' } };
export const DOUWE_LOOK = { ...TWIN, seed: 778, look: { ...TWIN_LOOK, hatColor: 0xeeeeea, facial: 'moustache' } };

// Flat colours for the 2D phone portraits (storycontact.js).
export const PORTRAITS = {
  jelle: { skin: '#e9c29c', hair: '#e8c86a', top: '#1d4f9c', under: '#f7f5ef', scarf: '#c8102e', shades: true, moustache: true },
  durk: { skin: '#e6b98f', hair: '#8a6a3a', top: '#c8102e', beanie: '#1d4f9c', beard: true, big: true },
  douwe: { skin: '#e6b98f', hair: '#8a6a3a', top: '#c8102e', beanie: '#eeeeea', moustache: true, big: true },
};
