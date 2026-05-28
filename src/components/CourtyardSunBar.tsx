/**
 * Innenhof-Sonnentracker für Jakobspark.
 *
 * Zeigt für den heutigen Tag eine stündliche Skala, welche Stunden im
 * Innenhof Sonne hatten / haben werden. Berücksichtigt:
 *   1. Sonnenstand (azimuth + altitude) — Sonne muss überm Horizont sein
 *   2. Azimut-Bereich, in dem die Sonne in den nach Norden offenen
 *      Innenhof scheinen kann (grob: -120° bis +60° von Süden gerechnet,
 *      also Ost durch Süd nach West, mit etwas Spielraum)
 *   3. Höhe — nur bei hohen Sonnenständen schafft das Licht über die
 *      4-stöckigen Trakte hinweg in den Hof.
 *
 * Vereinfachtes geometrisches Modell — nicht millimetergenau, aber zeigt
 * Kunden auf einen Blick: "ab 9 Uhr scheint die Sonne in den Innenhof".
 */

import { useMemo } from 'react';
import { useProjectStore } from '@/lib/store';
import { sunPosition } from '@/lib/solar';

/**
 * Stundenweise: scheint die Sonne in den Innenhof?
 * Mininum-Höhe abhängig von der Hof-Geometrie. Annahmen für Jakobspark:
 *   - Hof ca. 14m × 16m, umschlossen von 14m hohen Trakten auf 3 Seiten
 *   - Hof öffnet sich nach Norden
 *   - Damit Sonne in den Hof scheint, braucht es:
 *     · Azimut zwischen ca. 60° (Ost-Süd-Ost) und 300° (West-Nord-West)
 *     · Mindesthöhe ca. 30° (sonst von Süd-Trakt verschattet)
 *     · Bei Nord-Azimut (≈350°-10°) wäre Hof komplett offen, aber dann
 *       steht Sonne nicht im Norden → wird im Sommer relevant um Mittag
 */
function isCourtyardSunny(altitude: number, azimuth: number): {
  sunny: boolean;
  intensity: number; // 0..1
} {
  if (altitude < 5) return { sunny: false, intensity: 0 };

  // Im Sommer (Sonne hoch genug) erreicht Sonne den Hof aus südlichen Richtungen
  // Beim Bodensee-Standort 47.5°N: Mittagshöhe Sommer ~66°, Winter ~19°
  const azimuthFromSouth = ((azimuth - 180 + 540) % 360) - 180; // -180..+180 (0 = Süd)
  const absAz = Math.abs(azimuthFromSouth);

  // Im engen Sommer-Mittag: sehr hohe Sonne + Süd-Azimut → kommt rein
  // Vormittag: Sonne aus O/SO, niedriger → kommt etwas rein wenn hoch genug
  // Nachmittag: analog aus W/SW

  // Faustformel:
  // - absAz < 100° (sonst kommt's nicht über Trakte rein)
  // - Höhe > minHöhe, wo minHöhe vom Azimut abhängt
  if (absAz > 100) return { sunny: false, intensity: 0 };

  // Minimum-Höhe für direkten Lichteinfall:
  // bei südlichem Azimut < 30° → Höhe > 35° nötig (über Süd-Trakt)
  // bei seitlichem Azimut > 60° → Höhe > 20° (kommt seitlich rein)
  const minAlt = 35 - (absAz / 100) * 20;
  if (altitude < minAlt) return { sunny: false, intensity: 0 };

  // Intensität: höher und zentraler = mehr Licht
  const altScore = Math.min(1, (altitude - minAlt) / 30);
  const azScore = 1 - absAz / 120;
  const intensity = Math.max(0.15, altScore * 0.7 + azScore * 0.3);
  return { sunny: true, intensity };
}

export function CourtyardSunBar() {
  const location = useProjectStore((s) => s.location);
  const dateTime = useProjectStore((s) => s.dateTime);
  const massings = useProjectStore((s) => s.massings);

  // Nur anzeigen wenn es ein "Innenhof"-Projekt ist (Jakobspark) und ein U-förmiger Bau vorliegt
  const isCourtyardProject = useMemo(() => {
    return /Jakobspark|Rorschach/i.test(location.label) && massings.length >= 6;
  }, [location.label, massings.length]);

  const hours = useMemo(() => {
    if (!isCourtyardProject) return [];
    const result: Array<{ hour: number; sunny: boolean; intensity: number; alt: number }> = [];
    for (let h = 5; h <= 21; h++) {
      // UTC-Zeit: localMinutes minus MESZ-Offset
      const localMinutes = h * 60;
      const localDate = new Date(Date.UTC(dateTime.year, dateTime.month - 1, dateTime.day, 0, 0));
      const utcMinutes = localMinutes - 120; // MESZ = UTC+2 (Sommer)
      const utc = new Date(localDate.getTime() + utcMinutes * 60 * 1000);
      const pos = sunPosition(utc, location.lat, location.lon);
      const { sunny, intensity } = isCourtyardSunny(pos.altitude, pos.azimuth);
      result.push({ hour: h, sunny, intensity, alt: pos.altitude });
    }
    return result;
  }, [isCourtyardProject, dateTime, location.lat, location.lon]);

  // Total Stunden Sonne im Hof
  const totalSunnyHours = useMemo(() => {
    return hours.filter((h) => h.sunny).length;
  }, [hours]);

  if (!isCourtyardProject) return null;

  return (
    <div className="courtyard-sun-bar">
      <div className="cs-header">
        <div className="cs-icon">☀️</div>
        <div className="cs-title">
          <div className="cs-title-main">Sonne im Innenhof</div>
          <div className="cs-title-sub">
            {totalSunnyHours}h direkter Sonneneinfall heute
          </div>
        </div>
      </div>
      <div className="cs-bar">
        {hours.map((h) => (
          <div
            key={h.hour}
            className={`cs-hour ${h.sunny ? 'sunny' : 'shaded'}`}
            style={{
              opacity: h.sunny ? 0.4 + h.intensity * 0.6 : 0.2,
            }}
            title={`${String(h.hour).padStart(2,'0')}:00 — ${h.sunny ? `Sonne (${Math.round(h.intensity*100)}%)` : 'Schatten'}`}
          >
            <div className="cs-hour-label">{h.hour}</div>
          </div>
        ))}
      </div>
      <div className="cs-legend">
        <span className="cs-legend-item"><span className="cs-swatch sunny"/>Sonne</span>
        <span className="cs-legend-item"><span className="cs-swatch shaded"/>Schatten</span>
      </div>
    </div>
  );
}
