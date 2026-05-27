import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Controls } from '@/components/Controls';
import { Scene } from '@/components/Scene';
import { StatsBar } from '@/components/StatsBar';
import { parseUrlParams } from '@/lib/url-params';
import { useProjectStore } from '@/lib/store';
import { createCH144Demo } from '@/lib/demo-ch144';

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [urlParams] = useState(() => parseUrlParams());
  const importProject = useProjectStore((s) => s.importProject);
  const setLocation = useProjectStore((s) => s.setLocation);

  // URL-Parameter beim Start anwenden
  useEffect(() => {
    if (urlParams.demo === 'ch144') {
      importProject(createCH144Demo());
    } else if (urlParams.lat !== null && urlParams.lon !== null) {
      setLocation({
        lat: urlParams.lat,
        lon: urlParams.lon,
        label: urlParams.label || `${urlParams.lat.toFixed(4)}, ${urlParams.lon.toFixed(4)}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1000px)');
    const update = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Embed-Klasse auf <body> setzen, damit Layout funktioniert
  useEffect(() => {
    if (urlParams.embed) {
      document.body.classList.add('embed-mode');
    } else {
      document.body.classList.remove('embed-mode');
    }
    return () => document.body.classList.remove('embed-mode');
  }, [urlParams.embed]);

  return (
    <>
      {!urlParams.embed && <Header />}
      <div className={`main ${isMobile ? 'mobile' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Controls />
        <Scene />
        {isMobile && (
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Steuerung schließen' : 'Steuerung öffnen'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        )}
      </div>
      {!urlParams.compact && <StatsBar />}
    </>
  );
}
