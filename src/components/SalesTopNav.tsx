import { useProjectStore } from '@/lib/store';

export type SalesView = 'projekt' | 'angebot' | 'umgebung' | 'galerie' | 'faq';

const TABS: { id: SalesView; label: string }[] = [
  { id: 'projekt', label: 'Projekt' },
  { id: 'angebot', label: 'Angebot' },
  { id: 'umgebung', label: 'Umgebung' },
  { id: 'galerie', label: 'Galerie' },
  { id: 'faq', label: 'FAQ & Downloads' },
];

export function SalesTopNav() {
  const view = useProjectStore((s) => s.salesView);
  const setView = useProjectStore((s) => s.setSalesView);

  return (
    <nav className="sales-topnav">
      <div className="sales-topnav-inner">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`topnav-tab ${view === tab.id ? 'active' : ''}`}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
