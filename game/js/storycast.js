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
  rikus: { skin: '#e2b48e', hair: '#3a2a1e', top: '#1f7a44', under: '#e8e4da', glasses: true, phones: '#1b1d22' },
  mem: { skin: '#ecc8a8', hair: '#c9c6c0', top: '#223a66', under: '#f4f1ea', scarf: '#c8102e', glasses: true },
};

// Rikus, Tammo's childhood friend from the Oosterpark and the night DJ of
// Radio Nachtstreek (the narrator): FC-green jacket, stubble, thick-rimmed
// glasses, a bit of a belly from the night shifts.
export const RIKUS_LOOK = {
  shirt: 0x1f7a44, skin: 0xe2b48e, hair: 0x3a2a1e, variant: 'male', pants: 0x2b2f3a, shoes: 0xe8e4da, hairStyle: 'short', seed: 1672,
  look: { top: 'jacket', topColor: 0x1f7a44, facial: 'stubble', glasses: true, shades: false, scarf: false, bottom: 'jeans', shoeType: 'sneaker', age: 'adult', build: 'heavy', buildScale: 1.06, hat: null, bag: null, umbrella: null },
};

// Mem Terpstra, Jelle's mother (the "Mem" of Us Mem Snacks) and an old
// friend of Oma Trijntje: navy coat, white collar, glasses, grey bun and the
// pompeblêd-red scarf her son copied from her.
export const MEM_LOOK = {
  shirt: 0x223a66, skin: 0xecc8a8, hair: 0xc9c6c0, variant: 'female', pants: 0x2a2a30, shoes: 0x3a2a1a, hairStyle: 'bun', seed: 1953,
  look: { top: 'coat', under: 0xf4f1ea, glasses: true, shades: false, scarf: true, scarfColor: 0xc8102e, bottom: 'skirt', shoeType: 'leather', age: 'old', build: 'avg', heightScale: 0.94, hat: null, bag: 'shoulder', umbrella: null },
};

// Rotor Roelf, the helicopter dealer from Eelde (shops.js): red jacket and cap
// in his shop colour, aviator glasses, a salesman's grin.
export const ROTOR_LOOK = {
  shirt: 0xb8322a, skin: 0xe2b48c, hair: 0x5a4632, variant: 'male', pants: 0x2b2f3a, shoes: 0x2a2a2a, hairStyle: 'short', seed: 5512,
  look: { top: 'jacket', topColor: 0xb8322a, hat: 'cap', hatColor: 0xb8322a, glasses: true, shades: true, scarf: false, bottom: 'jeans', shoeType: 'sneaker', age: 'adult', build: 'avg', bag: null, umbrella: null },
};

// Boer Roelf and Hilje, the farmers at the carbid field on the Beijumerweg
// (carbid.js), who hide the Eierbal in the story (storyarc.js s-carbid).
export const ROELF_LOOK = {
  shirt: 0x2f4f7a, skin: 0xe2b48c, variant: 'male', seed: 5101, pants: 0x2f4f7a, shoes: 0x2a2a2a, hairStyle: 'short', hair: 0xb8b2a8,
  look: { age: 'old', hat: 'flatcap', hatColor: 0x4a4038, top: 'jacket', bottom: 'trousers', bag: null, umbrella: null, glasses: false },
};
export const HILJE_LOOK = {
  shirt: 0x7a3a4a, skin: 0xd9a57c, variant: 'female', seed: 5102, pants: 0x3a3a40, shoes: 0x2a2a2a, hairStyle: 'bun', hair: 0xc8c2b8,
  look: { age: 'old', top: 'coat', bottom: 'skirt', bag: null, umbrella: null },
};
