import { describe, it, expect } from 'vitest';
import { lonLatToTileFloat, tileToLonLat, metersPerPixel, swissimageTileUrl } from './swissimage';

const ZURICH = { lat: 47.3769, lon: 8.5417 };

describe('lonLatToTileFloat', () => {
  it('z=0: Welt-Mitte (lon=0, lat=0) liegt bei (0.5, 0.5)', () => {
    const t = lonLatToTileFloat(0, 0, 0);
    expect(t.x).toBeCloseTo(0.5, 10);
    expect(t.y).toBeCloseTo(0.5, 10);
  });

  it('z=0: Längen-Ränder bilden auf x=0 und x=1 ab', () => {
    expect(lonLatToTileFloat(-180, 0, 0).x).toBeCloseTo(0, 10);
    expect(lonLatToTileFloat(180, 0, 0).x).toBeCloseTo(1, 10);
  });

  it('Zürich bei z=19 fällt in die erwartete Kachel', () => {
    const t = lonLatToTileFloat(ZURICH.lon, ZURICH.lat, 19);
    // x ist rein algebraisch (keine Transzendenten) → Kachelspalte exakt prüfbar.
    expect(Math.floor(t.x)).toBe(274583);
    // y über Mercator → großzügige Schranke statt brüchiger Festwert.
    expect(t.y).toBeGreaterThan(183500);
    expect(t.y).toBeLessThan(183750);
  });

  it('monoton: lon↑ ⇒ x↑, lat↑ ⇒ y↓ (Norden = kleineres y)', () => {
    const base = lonLatToTileFloat(ZURICH.lon, ZURICH.lat, 17);
    const east = lonLatToTileFloat(ZURICH.lon + 0.01, ZURICH.lat, 17);
    const north = lonLatToTileFloat(ZURICH.lon, ZURICH.lat + 0.01, 17);
    expect(east.x).toBeGreaterThan(base.x);
    expect(north.y).toBeLessThan(base.y);
  });
});

describe('tileToLonLat', () => {
  it('z=0 Ecke (0,0) = NW-Ecke der Mercator-Welt (-180°, ~85.0511°)', () => {
    const c = tileToLonLat(0, 0, 0);
    expect(c.lon).toBeCloseTo(-180, 10);
    expect(c.lat).toBeCloseTo(85.0511287798, 6);
  });

  it('Round-trip lon/lat → Kachel → lon/lat bleibt genau (mehrere Zoomstufen)', () => {
    for (const z of [12, 15, 17, 19]) {
      const t = lonLatToTileFloat(ZURICH.lon, ZURICH.lat, z);
      const back = tileToLonLat(t.x, t.y, z);
      expect(back.lon).toBeCloseTo(ZURICH.lon, 9);
      expect(back.lat).toBeCloseTo(ZURICH.lat, 9);
    }
  });
});

describe('metersPerPixel', () => {
  it('Äquator bei z=0 = 156543.03392 m/px', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(156543.03392, 5);
  });

  it('halbiert sich pro Zoomstufe', () => {
    expect(metersPerPixel(47.3769, 18)).toBeCloseTo(metersPerPixel(47.3769, 19) * 2, 10);
  });

  it('nimmt mit der Breite ab (Zürich < Äquator)', () => {
    expect(metersPerPixel(47.3769, 19)).toBeLessThan(metersPerPixel(0, 19));
  });

  it('Zürich bei z=19 ist ~0.2 m/px', () => {
    const mpp = metersPerPixel(47.3769, 19);
    expect(mpp).toBeGreaterThan(0.19);
    expect(mpp).toBeLessThan(0.21);
  });
});

describe('swissimageTileUrl', () => {
  it('baut die WMTS-URL im EPSG:3857-Schema', () => {
    expect(swissimageTileUrl(19, 274583, 183620)).toBe(
      'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/19/274583/183620.jpeg',
    );
  });
});
