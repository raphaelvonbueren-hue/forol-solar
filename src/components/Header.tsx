import { useRef } from 'react';
import { useProjectStore } from '@/lib/store';
import { createCH144Demo } from '@/lib/demo-ch144';
import type { Project } from '@/types';

export function Header() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportProject = useProjectStore((s) => s.exportProject);
  const importProject = useProjectStore((s) => s.importProject);
  const location = useProjectStore((s) => s.location);

  function loadCH144Demo() {
    importProject(createCH144Demo());
  }

  function handleExport() {
    const project = exportProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeName =
      location.label
        .replace(/[^a-zA-Z0-9äöüÄÖÜ\s_-]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 40) || 'projekt';
    const a = document.createElement('a');
    a.href = url;
    a.download = `forol-solar_${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const project = JSON.parse(text) as Project;
      if (!project.version) throw new Error('Ungültiges Projekt-Format');
      importProject(project);
    } catch (err) {
      alert(`Projekt konnte nicht geladen werden: ${(err as Error).message}`);
    }
    e.target.value = '';
  }

  return (
    <header className="header">
      <div className="brand">
        <div className="logo">FOROL</div>
        <div className="tool-title">Sonnen- und Schattenanalyse</div>
      </div>
      <div className="header-meta">
        <div className="ref">3D-SOLAR v7.0 · React</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
        <button className="btn primary" onClick={loadCH144Demo} title="FOROL CH144 Demo-Projekt laden">
          ⭐ CH144
        </button>
        <button className="btn" onClick={() => fileInputRef.current?.click()}>
          📂 Laden
        </button>
        <button className="btn" onClick={handleExport}>
          💾 Speichern
        </button>
      </div>
    </header>
  );
}
