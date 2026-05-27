import { describe, it, expect } from 'vitest';
import { parseUrlParams } from './url-params';

describe('parseUrlParams', () => {
  it('Default-Werte ohne Parameter', () => {
    const p = parseUrlParams('');
    expect(p.embed).toBe(false);
    expect(p.compact).toBe(false);
    expect(p.lat).toBeNull();
    expect(p.lon).toBeNull();
    expect(p.label).toBeNull();
    expect(p.demo).toBeNull();
    expect(p.readonly).toBe(false);
  });

  it('embed=1 aktiviert auch compact', () => {
    const p = parseUrlParams('?embed=1');
    expect(p.embed).toBe(true);
    expect(p.compact).toBe(true);
  });

  it('compact=1 ohne embed', () => {
    const p = parseUrlParams('?compact=1');
    expect(p.embed).toBe(false);
    expect(p.compact).toBe(true);
  });

  it('Koordinaten werden geparsed', () => {
    const p = parseUrlParams('?lat=47.37&lon=8.54');
    expect(p.lat).toBe(47.37);
    expect(p.lon).toBe(8.54);
  });

  it('Ungültige Koordinaten werden zu null', () => {
    const p = parseUrlParams('?lat=abc&lon=NaN');
    expect(p.lat).toBeNull();
    expect(p.lon).toBeNull();
  });

  it('Label kann gesetzt werden', () => {
    const p = parseUrlParams('?label=Musterhaus%20Z%C3%BCrich');
    expect(p.label).toBe('Musterhaus Zürich');
  });

  it('Demo-Parameter', () => {
    const p = parseUrlParams('?demo=ch144');
    expect(p.demo).toBe('ch144');
  });

  it('Mehrere Parameter kombiniert', () => {
    const p = parseUrlParams('?embed=1&lat=47.37&lon=8.54&label=Foo&demo=ch144&readonly=1');
    expect(p.embed).toBe(true);
    expect(p.compact).toBe(true);
    expect(p.lat).toBe(47.37);
    expect(p.lon).toBe(8.54);
    expect(p.label).toBe('Foo');
    expect(p.demo).toBe('ch144');
    expect(p.readonly).toBe(true);
  });
});
