/* ============================================================
   世界猫生ガチャ — データ統合
   core / breeds / wild / countries をまとめ、重みを正規化する。
   ============================================================ */
(function (root) {
  'use strict';

  const core = root.CAT_CORE;
  const breeds = root.CAT_BREEDS;
  const wild = root.CAT_WILD;
  const countries = root.CAT_COUNTRIES;
  if (!core || !breeds || !wild || !countries) throw new Error('data modules are missing');

  /* ---- 純血種のシェアを正規化 ---- */
  const breedSum = breeds.reduce((a, b) => a + b.w, 0);
  breeds.forEach(b => { b.share = b.w / breedSum; });

  /* ---- 国の重みを正規化 ---- */
  const ownedSum = countries.reduce((a, c) => a + c.ownedM, 0);
  const straySum = countries.reduce((a, c) => a + c.strayM, 0);

  const REGION_SCENE = {
    north_america: 'room_modern', latin_america: 'room_warm', west_europe: 'room_modern',
    north_europe: 'room_warm', east_europe: 'room_warm', middle_east: 'room_warm',
    north_africa: 'room_warm', sub_saharan: 'room_warm', south_asia: 'temple',
    southeast_asia: 'temple', east_asia: 'room_modern', oceania: 'room_modern'
  };
  const REGION_OUT = {
    north_america: 'street_eu', latin_america: 'street_br', west_europe: 'street_eu',
    north_europe: 'snow_town', east_europe: 'street_ru', middle_east: 'street_eg',
    north_africa: 'street_ma', sub_saharan: 'village', south_asia: 'street_in',
    southeast_asia: 'street_asia', east_asia: 'street_asia', oceania: 'outback'
  };
  const REGION_AFF = {
    north_america: { community: 0.8, street: 1.0, feral: 1.2 },
    latin_america: { community: 0.9, street: 1.1, feral: 1.0 },
    west_europe: { community: 1.6, street: 0.9, feral: 0.5 },
    north_europe: { community: 1.0, street: 0.8, feral: 0.5 },
    east_europe: { community: 1.0, street: 1.0, feral: 0.8 },
    middle_east: { community: 1.3, street: 1.1, feral: 0.8 },
    north_africa: { community: 1.4, street: 1.2, feral: 0.9 },
    sub_saharan: { community: 1.0, street: 1.2, feral: 0.9 },
    south_asia: { community: 2.0, street: 1.0, feral: 0.7 },
    southeast_asia: { community: 1.6, street: 1.1, feral: 0.8 },
    east_asia: { community: 1.6, street: 0.9, feral: 0.4 },
    oceania: { community: 0.7, street: 0.7, feral: 2.2 }
  };

  countries.forEach(c => {
    const reg = core.REGIONS[c.region];
    c.ownedW = c.ownedM / ownedSum;
    c.strayW = c.strayM / straySum;
    c.regionName = reg.name;
    c.names = c.names || reg.names;
    c.where = c.where || [c.name];
    c.events = c.events || [];
    c.regionEvents = reg.events;
    c.aff = Object.assign({ community: 1, street: 1, feral: 1 }, REGION_AFF[c.region] || {}, c.aff || {});
    c.scene = c.scene || REGION_SCENE[c.region] || 'room_warm';
    c.outScene = c.outScene || REGION_OUT[c.region] || 'street_eu';
    c.note = c.note || null;
  });

  /* ---- 野生種のシェア ---- */
  const wildSum = wild.reduce((a, s) => a + s.pop, 0);
  wild.forEach(s => { s.share = s.pop / wildSum; });

  const DATA = {
    TOTAL: core.TOTAL,
    MASS: core.MASS,
    STRAY_SUB: core.STRAY_SUB,
    PUREBRED_SHARE: core.PUREBRED_SHARE,
    LIFE: core.LIFE,
    COATS: core.COATS,
    MUTATIONS: core.MUTATIONS,
    REGIONS: core.REGIONS,
    BREEDS: breeds,
    WILD: wild,
    COUNTRIES: countries,
    WILD_SUM: wildSum,
    OWNED_SUM: ownedSum,
    STRAY_SUM: straySum,
    BREED_SUM: breedSum,
    STATUS_LABEL: core.STATUS_LABEL,
    SEX_LABEL: core.SEX_LABEL
  };

  root.CATGACHA_DATA = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
