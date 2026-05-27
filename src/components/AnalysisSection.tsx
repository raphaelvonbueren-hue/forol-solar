import { useProjectStore } from '@/lib/store';
import type { AnalysisPrecision, ApartmentResult } from '@/types';

const APARTMENT_COLORS = [
  '#D32F2F', '#F5A623', '#2E7D32', '#4A90E2',
  '#9C27B0', '#00897B', '#E91E63', '#FF6F00',
  '#5E35B1', '#C0CA33', '#0288D1', '#8D6E63',
];

/** Liest die globale "computeHeatmapNow"-Funktion, die Scene.tsx registriert. */
declare global {
  // eslint-disable-next-line no-var
  var __forolComputeHeatmap: (() => Promise<void>) | undefined;
}

export function AnalysisSection() {
  const analysisConfig = useProjectStore((s) => s.analysisConfig);
  const setAnalysisConfig = useProjectStore((s) => s.setAnalysisConfig);
  const apartmentResults = useProjectStore((s) => s.apartmentResults);
  const setApartmentResults = useProjectStore((s) => s.setApartmentResults);
  const setHeatmap = useProjectStore((s) => s.setHeatmap);
  const location = useProjectStore((s) => s.location);
  const heatmapResults = useProjectStore((s) => s.heatmapResults);

  const computing = useProjectStore((s) => s.computing);
  const computeProgress = useProjectStore((s) => s.computeProgress);
  const computeStatus = useProjectStore((s) => s.computeStatus);
  const setComputing = useProjectStore((s) => s.setComputing);
  const setComputeProgress = useProjectStore((s) => s.setComputeProgress);
  const setComputeStatus = useProjectStore((s) => s.setComputeStatus);
  const requestCancel = useProjectStore((s) => s.requestCancel);
  const resetCancel = useProjectStore((s) => s.resetCancel);

  async function handleRun() {
    if (computing) return;
    setComputing(true);
    setComputeProgress(0);
    resetCancel();
    setComputeStatus('Starte Berechnung …');
    try {
      if (typeof window.__forolComputeHeatmap !== 'function') {
        throw new Error('3D-Szene noch nicht bereit');
      }
      await window.__forolComputeHeatmap();
      setComputeStatus('Berechnung abgeschlossen');
    } catch (err) {
      const error = err as Error;
      if (error.name === 'CancellationError') {
        setComputeStatus('Berechnung abgebrochen');
      } else {
        setComputeStatus(`Fehler: ${error.message}`);
      }
    } finally {
      setComputing(false);
      setComputeProgress(0);
    }
  }

  function handleCancel() {
    requestCancel();
    setComputeStatus('Wird abgebrochen …');
  }

  function handleClear() {
    setHeatmap(null, null);
    setApartmentResults([]);
    setComputeStatus('Heatmap entfernt');
  }

  function handleCSVExport() {
    if (apartmentResults.length === 0) {
      alert('Keine Wohnungs-Daten. Erst Wohnungen aufteilen und Heatmap berechnen.');
      return;
    }
    let csv = 'Wohnung;Etage;Min Sonnenstunden/Jahr;Mittelwert h/Jahr;Max h/Jahr;Anzahl Messpunkte\n';
    for (const a of apartmentResults) {
      csv += `"${a.name}";"${a.massingName}";${a.minSunHours.toFixed(0)};${a.avgSunHours.toFixed(0)};${a.maxSunHours.toFixed(0)};${a.sampleCount}\n`;
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const safeName = location.label.replace(/[^a-zA-Z0-9äöüÄÖÜ\s_-]/g, '').replace(/\s+/g, '_').slice(0, 40) || 'projekt';
    const a = document.createElement('a');
    a.href = url;
    a.download = `forol-solar_wohnungen_${safeName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const hasResults = heatmapResults !== null && heatmapResults.length > 0;
  const minHours = hasResults ? Math.min(...heatmapResults!) : 0;
  const maxHours = hasResults ? Math.max(...heatmapResults!) : 0;

  return (
    <div className="section">
      <div className="section-title">
        <span className="num">4</span>Verschattungs-Heatmap
      </div>
      <div className="field">
        <div className="field-label"><span>Genauigkeit</span></div>
        <select
          value={analysisConfig.precision}
          onChange={(e) => setAnalysisConfig({ precision: e.target.value as AnalysisPrecision })}
        >
          <option value="fast">Schnell · 12 Tage</option>
          <option value="medium">Mittel · 52 Tage</option>
          <option value="accurate">Genau · 365 Tage</option>
        </select>
      </div>
      <div className="field">
        <div className="field-label">
          <span>Sample-Abstand</span>
          <span className="value">{analysisConfig.sampleSpacing.toFixed(2)} m</span>
        </div>
        <input
          type="range" min={0.5} max={3} step={0.25}
          value={analysisConfig.sampleSpacing}
          onChange={(e) => setAnalysisConfig({ sampleSpacing: parseFloat(e.target.value) })}
        />
      </div>
      <div className="btn-row" style={{ marginTop: 4 }}>
        <button
          className="btn primary"
          style={{ flex: computing ? 2 : 1 }}
          onClick={handleRun}
          disabled={computing}
        >
          {computing ? `Berechne … ${(computeProgress * 100).toFixed(0)}%` : 'Heatmap berechnen'}
        </button>
        {computing && (
          <button className="btn" onClick={handleCancel}>
            Abbrechen
          </button>
        )}
      </div>
      <div
        className={`status-msg ${
          computeStatus.startsWith('Fehler') ? 'error'
          : computeStatus.includes('abgeschlossen') ? 'success'
          : ''
        }`}
      >
        {computeStatus}
      </div>
      {computing && (
        <div style={{ background: 'var(--border)', height: 4, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
          <div
            style={{
              background: 'var(--forol-red)',
              height: '100%',
              width: `${computeProgress * 100}%`,
              transition: 'width 0.15s',
            }}
          />
        </div>
      )}
      {hasResults && (
        <>
          <button className="btn" style={{ marginTop: 6 }} onClick={handleClear}>
            Heatmap entfernen
          </button>
          <div style={{ marginTop: 10, fontSize: 10 }}>
            <div
              style={{
                height: 10,
                background: 'linear-gradient(to right,#1a1450,#3b5fbf,#52b788,#ffd166,#d62828)',
                borderRadius: 2,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray)', marginTop: 2 }}>
              <span>{Math.round(minHours)} h</span>
              <span>Sonnenstunden pro Jahr</span>
              <span>{Math.round(maxHours)} h</span>
            </div>
          </div>
        </>
      )}
      {apartmentResults.length > 0 && <ApartmentStatsTable results={apartmentResults} onExport={handleCSVExport} />}
    </div>
  );
}

function ApartmentStatsTable({
  results,
  onExport,
}: {
  results: ApartmentResult[];
  onExport: () => void;
}) {
  return (
    <div className="apt-stats">
      <div className="apt-stats-title">Auswertung pro Wohnung</div>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Wohnung</th>
            <th>Etage</th>
            <th className="num">Min</th>
            <th className="num">Ø</th>
            <th className="num">Max</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={r.id}>
              <td className="color-swatch">
                <span
                  className="swatch-dot"
                  style={{ background: APARTMENT_COLORS[i % APARTMENT_COLORS.length] }}
                />
              </td>
              <td className="name">{r.name}</td>
              <td>{r.massingName}</td>
              <td className="num">{Math.round(r.minSunHours)}</td>
              <td className="num" style={{ fontWeight: 600 }}>{Math.round(r.avgSunHours)}</td>
              <td className="num">{Math.round(r.maxSunHours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn" style={{ marginTop: 8, width: '100%' }} onClick={onExport}>
        CSV exportieren
      </button>
    </div>
  );
}
