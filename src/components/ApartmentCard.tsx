import type { SalesApartment } from '@/lib/apartment-selectors';
import { STATUS_LABELS, STATUS_COLORS, formatCHF } from '@/lib/apartment-selectors';

interface Props {
  apartment: SalesApartment;
  selected: boolean;
  hovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function ApartmentCard({ apartment, selected, hovered, onClick, onMouseEnter, onMouseLeave }: Props) {
  const s = apartment.sales;
  const status = s.status ?? 'available';
  const statusColor = STATUS_COLORS[status];
  const thumbnail = s.thumbnailColor ?? '#999';

  return (
    <div
      className={`apt-card ${selected ? 'selected' : ''} ${hovered ? 'hovered' : ''} status-${status}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="apt-thumb"
        style={{ background: `linear-gradient(135deg, ${thumbnail} 0%, ${thumbnail}dd 50%, ${thumbnail}99 100%)` }}
      >
        <div className="apt-thumb-overlay">
          <div className="apt-floor">{s.floorLabel ?? '—'}</div>
        </div>
      </div>
      <div className="apt-body">
        <div className="apt-top">
          <div className="apt-name">{apartment.name}</div>
          {s.price !== undefined && (
            <div className="apt-price">
              <span className="ccy">CHF</span> {formatCHF(s.price)}
            </div>
          )}
        </div>
        <div className="apt-meta">
          {s.areaSqm !== undefined && (
            <div className="apt-stat">
              <div className="apt-stat-val">{s.areaSqm.toFixed(0)}</div>
              <div className="apt-stat-lbl">m² Fläche</div>
            </div>
          )}
          {s.rooms !== undefined && (
            <div className="apt-stat">
              <div className="apt-stat-val">{s.rooms.toFixed(1)}</div>
              <div className="apt-stat-lbl">Zimmer</div>
            </div>
          )}
          <div className="apt-status-pill" style={{ background: statusColor }}>
            {STATUS_LABELS[status]}
          </div>
        </div>
      </div>
    </div>
  );
}
