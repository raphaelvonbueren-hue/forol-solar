import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Controls } from '@/components/Controls';
import { SalesSidebar } from '@/components/SalesSidebar';
import { SalesTopNav } from '@/components/SalesTopNav';
import { ApartmentDetailModal } from '@/components/ApartmentDetailModal';
import { ContactButton } from '@/components/ContactButton';
import { CourtyardSunBar } from '@/components/CourtyardSunBar';
import { SunBar } from '@/components/SunBar';
import { Scene } from '@/components/Scene';
import { StatsBar } from '@/components/StatsBar';
import { parseUrlParams } from '@/lib/url-params';
import { useProjectStore } from '@/lib/store';
import { createCH144Demo } from '@/lib/demo-ch144';
import { createJakobsparkDemo } from '@/lib/demo-jakobspark';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchProjectBySlug } from '@/lib/db-projects';

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [urlParams] = useState(() => parseUrlParams());
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const importProject = useProjectStore((s) => s.importProject);
  const setLocation = useProjectStore((s) => s.setLocation);
  const uiMode = useProjectStore((s) => s.uiMode);
  const setUiMode = useProjectStore((s) => s.setUiMode);

  // URL-Parameter beim Start anwenden
  useEffect(() => {
    // edit=1 schaltet den Editor-Modus ein
    if (urlParams.edit) {
      setUiMode('editor');
    }

    // ?project=ch144 — aus Supabase laden
    if (urlParams.project) {
      if (!isSupabaseConfigured) {
        setLoadState('error');
        setLoadError('Supabase ist nicht konfiguriert. ENV-Variablen fehlen.');
        return;
      }
      setLoadState('loading');
      fetchProjectBySlug(urlParams.project)
        .then((project) => {
          importProject(project);
          setLoadState('idle');
        })
        .catch((e) => {
          // Fallback: wenn ?project=X nicht in DB, dann hardcoded Demo laden (für ch144 + jakobspark)
          if (urlParams.project === 'ch144') {
            console.warn('CH144 nicht in DB, lade hardcoded Demo:', e.message);
            importProject(createCH144Demo());
            setLoadState('idle');
          } else if (urlParams.project === 'jakobspark') {
            console.warn('Jakobspark nicht in DB, lade hardcoded Demo:', e.message);
            importProject(createJakobsparkDemo());
            setLoadState('idle');
          } else {
            setLoadState('error');
            setLoadError(e.message);
          }
        });
      return;
    }

    // ?demo=ch144 / ?demo=jakobspark — hardcoded laden (Fallback wenn kein Supabase)
    if (urlParams.demo === 'ch144') {
      importProject(createCH144Demo());
    } else if (urlParams.demo === 'jakobspark') {
      importProject(createJakobsparkDemo());
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
      {!urlParams.embed && uiMode === 'sales' && <SalesTopNav />}
      <div className={`main ${isMobile ? 'mobile' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {uiMode === 'sales' ? <SalesSidebar /> : <Controls />}
        <Scene />
        {uiMode === 'sales' && <SunBar />}
        {uiMode === 'sales' && <ContactButton />}
        {uiMode === 'sales' && <CourtyardSunBar />}
        {uiMode === 'sales' && <ApartmentDetailModal />}
        {loadState === 'loading' && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <div className="loading-text">Projekt wird geladen …</div>
          </div>
        )}
        {loadState === 'error' && (
          <div className="loading-overlay">
            <div className="loading-error">
              <div className="loading-error-title">Projekt konnte nicht geladen werden</div>
              <div className="loading-error-msg">{loadError}</div>
            </div>
          </div>
        )}
        {isMobile && (
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Sidebar schließen' : 'Sidebar öffnen'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        )}
      </div>
      {!urlParams.compact && <StatsBar />}
    </>
  );
}
