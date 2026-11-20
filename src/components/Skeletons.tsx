import React from 'react';

interface SkeletonBoxProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  dark?: boolean;
  pill?: boolean;
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = '100%',
  height = 14,
  radius,
  dark = false,
  pill = false,
  circle = false,
  className = '',
  style,
}) => (
  <span
    aria-hidden="true"
    className={`skeleton ${dark ? 'skeleton-dark' : ''} ${pill ? 'skeleton-pill' : ''} ${circle ? 'skeleton-circle' : ''} ${className}`.trim()}
    style={{
      width,
      height,
      ...(radius !== undefined ? { borderRadius: radius } : {}),
      ...style,
    }}
  />
);

export type SkeletonColumnType =
  | 'two-line'
  | 'text'
  | 'short'
  | 'pill'
  | 'price'
  | 'actions'
  | 'actions-wide';

interface TableSkeletonRowsProps {
  columns: SkeletonColumnType[];
  rows?: number;
}

export const TableSkeletonRows: React.FC<TableSkeletonRowsProps> = ({
  columns,
  rows = 5,
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={`sk-row-${rowIdx}`} aria-hidden="true">
          {columns.map((col, colIdx) => {
            const widthOffset = ((rowIdx + colIdx) % 3) * 10;
            switch (col) {
              case 'two-line':
                return (
                  <td key={colIdx}>
                    <div className="d-flex flex-column gap-2">
                      <SkeletonBox width={`${68 + (widthOffset % 20)}%`} height={14} />
                      <SkeletonBox width={`${45 + (widthOffset % 15)}%`} height={10} />
                    </div>
                  </td>
                );
              case 'text':
                return (
                  <td key={colIdx}>
                    <SkeletonBox width={`${65 + (widthOffset % 25)}%`} height={13} />
                  </td>
                );
              case 'short':
                return (
                  <td key={colIdx}>
                    <SkeletonBox width={64 + (widthOffset % 20)} height={13} />
                  </td>
                );
              case 'pill':
                return (
                  <td key={colIdx}>
                    <SkeletonBox width={96} height={26} pill />
                  </td>
                );
              case 'price':
                return (
                  <td key={colIdx}>
                    <div className="d-flex flex-column gap-1">
                      <SkeletonBox width={88} height={16} />
                      <SkeletonBox width={54} height={10} />
                    </div>
                  </td>
                );
              case 'actions':
                return (
                  <td key={colIdx} className="text-end">
                    <div className="d-inline-flex align-items-center gap-2">
                      <SkeletonBox width={32} height={32} radius={8} />
                      <SkeletonBox width={32} height={32} radius={8} />
                      <SkeletonBox width={32} height={32} radius={8} />
                    </div>
                  </td>
                );
              case 'actions-wide':
                return (
                  <td key={colIdx} className="text-end">
                    <div className="d-inline-flex align-items-center gap-2">
                      <SkeletonBox width={78} height={30} radius={8} />
                      <SkeletonBox width={32} height={32} radius={8} />
                    </div>
                  </td>
                );
            }
          })}
        </tr>
      ))}
    </>
  );
};

export const CatalogoHotelesSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => (
  <div className="row g-3 g-md-4" aria-hidden="true">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={`sk-hotel-${idx}`} className="col-12 col-md-6">
        <div className="luxury-card h-100 overflow-hidden shadow-sm">
          <div className="cat-hero position-relative">
            <SkeletonBox width="100%" height="100%" radius={0} style={{ display: 'block' }} />
            <div className="position-absolute bottom-0 start-0 w-100 p-3 d-flex flex-column gap-2">
              <SkeletonBox width={96} height={24} pill dark />
              <SkeletonBox width="60%" height={24} dark />
            </div>
          </div>
          <div className="p-3 p-md-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
            <div className="d-flex flex-column gap-2" style={{ minWidth: 160 }}>
              <SkeletonBox width={100} height={11} />
              <SkeletonBox width={165} height={16} />
            </div>
            <SkeletonBox width={175} height={40} radius={10} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const CatalogoHabitacionesSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="row g-3 g-md-4" aria-hidden="true">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={`sk-room-${idx}`} className="col-12 col-md-6 col-lg-4">
        <div className="luxury-card h-100 d-flex flex-column shadow-sm overflow-hidden">
          <div className="cat-room-img">
            <SkeletonBox width="100%" height="100%" radius={0} style={{ display: 'block' }} />
          </div>
          <div className="p-3 p-md-4 d-flex flex-column flex-grow-1 justify-content-between gap-3">
            <div className="d-flex flex-column gap-2">
              <SkeletonBox width="65%" height={18} />
              <SkeletonBox width="48%" height={12} />
              <SkeletonBox width={130} height={24} pill className="my-1" />
              <SkeletonBox width="100%" height={12} />
              <SkeletonBox width="82%" height={12} />
            </div>
            <div className="pt-3 border-top d-flex justify-content-between align-items-center">
              <div className="d-flex flex-column gap-1">
                <SkeletonBox width={80} height={10} />
                <SkeletonBox width={105} height={22} />
              </div>
              <SkeletonBox width={110} height={38} radius={10} />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ReservacionesMobileSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="d-flex flex-column gap-3" aria-hidden="true">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={`sk-res-mob-${idx}`}
        className="rounded-4 p-3 shadow-sm"
        style={{ backgroundColor: '#ffffff', border: '1px solid #e4e4e7' }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <SkeletonBox width={88} height={26} radius={8} />
          <SkeletonBox width={116} height={24} pill />
        </div>
        <div className="d-flex flex-column gap-2 mb-3">
          <SkeletonBox width="72%" height={16} />
          <SkeletonBox width="56%" height={12} />
        </div>
        <div
          className="rounded-3 p-2 mb-3 d-flex justify-content-between align-items-center"
          style={{ backgroundColor: '#fafafa', border: '1px solid #f4f4f5' }}
        >
          <div className="d-flex flex-column gap-1">
            <SkeletonBox width={48} height={9} />
            <SkeletonBox width={80} height={14} />
          </div>
          <SkeletonBox width={18} height={12} />
          <div className="d-flex flex-column align-items-end gap-1">
            <SkeletonBox width={42} height={9} />
            <SkeletonBox width={80} height={14} />
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
          <div className="d-flex flex-column gap-1">
            <SkeletonBox width={40} height={9} />
            <SkeletonBox width={92} height={18} />
          </div>
          <SkeletonBox width={105} height={34} radius={10} />
        </div>
      </div>
    ))}
  </div>
);

export const DashboardConsultasSkeleton: React.FC = () => (
  <div aria-hidden="true">
    {/* Filtros */}
    <div className="row g-3 mb-4 p-3 rounded-4 border" style={{ backgroundColor: '#fafaf9' }}>
      <div className="col-md-5 d-flex flex-column gap-2">
        <SkeletonBox width={140} height={12} />
        <SkeletonBox width="100%" height={40} radius={10} />
      </div>
      <div className="col-md-5 d-flex flex-column gap-2">
        <SkeletonBox width={105} height={12} />
        <SkeletonBox width="100%" height={40} radius={10} />
      </div>
      <div className="col-md-2 d-flex align-items-end">
        <SkeletonBox width="100%" height={40} radius={10} />
      </div>
    </div>

    {/* 4 KPIs */}
    <div className="row g-3 mb-4">
      <div className="col-12 col-sm-6 col-xl-3">
        <div className="stat-box wow-kpi wow-kpi-dark d-flex justify-content-between align-items-center h-100">
          <div className="d-flex flex-column gap-2 flex-grow-1 me-3">
            <SkeletonBox width={115} height={12} dark />
            <SkeletonBox width={135} height={28} dark />
            <SkeletonBox width={125} height={11} dark />
            <SkeletonBox width={110} height={24} dark className="mt-1" />
          </div>
          <SkeletonBox width={38} height={38} radius={10} dark />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={`sk-kpi-${i}`} className="col-12 col-sm-6 col-xl-3">
          <div className="stat-box wow-kpi d-flex justify-content-between align-items-center h-100">
            <div className="d-flex flex-column gap-2 flex-grow-1 me-3">
              <SkeletonBox width={125} height={12} />
              <SkeletonBox width={90} height={28} />
              <SkeletonBox width={115} height={11} />
              <SkeletonBox width={110} height={6} pill className="mt-1" />
            </div>
            <SkeletonBox width={38} height={38} radius={10} />
          </div>
        </div>
      ))}
    </div>

    {/* 3 Insights */}
    <div className="row g-3 mb-4">
      {[0, 1, 2].map((i) => (
        <div key={`sk-ins-${i}`} className="col-12 col-md-4">
          <div className="wow-insight d-flex flex-column gap-2">
            <SkeletonBox width={95} height={11} />
            <SkeletonBox width={110} height={22} />
            <SkeletonBox width="75%" height={12} />
          </div>
        </div>
      ))}
    </div>

    {/* Gráficas */}
    <div className="row g-4">
      <div className="col-12 col-lg-6">
        <div className="p-4 rounded-4 border h-100 bg-white shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex flex-column gap-2">
              <SkeletonBox width={210} height={16} />
              <SkeletonBox width={170} height={11} />
            </div>
            <SkeletonBox width={95} height={24} pill />
          </div>
          <div className="d-flex justify-content-center my-3">
            <SkeletonBox width={140} height={140} circle />
          </div>
          <div className="d-flex flex-column gap-3 mt-3">
            {[85, 68, 54, 42, 30].map((w, idx) => (
              <div key={idx} className="d-flex flex-column gap-1">
                <div className="d-flex justify-content-between">
                  <SkeletonBox width={130} height={11} />
                  <SkeletonBox width={90} height={11} />
                </div>
                <SkeletonBox width={`${w}%`} height={10} pill />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-6">
        <div className="p-4 rounded-4 border h-100 bg-white shadow-sm d-flex flex-column justify-content-between">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex flex-column gap-2">
              <SkeletonBox width={220} height={16} />
              <SkeletonBox width={160} height={11} />
            </div>
            <SkeletonBox width={80} height={24} pill />
          </div>
          <div
            className="d-flex align-items-end justify-content-between gap-2 pt-4 pb-2 px-2 border-bottom"
            style={{ height: '220px' }}
          >
            {[55, 78, 62, 95, 120, 145, 98].map((h, idx) => (
              <div key={idx} className="d-flex flex-column align-items-center flex-fill gap-2">
                <SkeletonBox width={34} height={h} radius="8px 8px 0 0" />
                <SkeletonBox width={30} height={11} />
              </div>
            ))}
          </div>
          <div className="d-flex justify-content-between mt-3">
            <SkeletonBox width={190} height={11} />
            <SkeletonBox width={95} height={11} />
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-7">
        <div className="p-4 rounded-4 border h-100 bg-white shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex flex-column gap-2">
              <SkeletonBox width={210} height={16} />
              <SkeletonBox width={180} height={11} />
            </div>
            <SkeletonBox width={120} height={24} pill />
          </div>
          <div
            className="d-flex align-items-end justify-content-between gap-1 pt-4 pb-2 px-1 border-bottom"
            style={{ height: '210px' }}
          >
            {[82, 48, 96, 110, 64, 52, 132, 124, 58, 74, 70, 118].map((h, idx) => (
              <div key={idx} className="d-flex flex-column align-items-center flex-fill gap-2">
                <SkeletonBox width={22} height={h} radius="6px 6px 0 0" />
                <SkeletonBox width={20} height={10} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-5">
        <div className="p-4 rounded-4 border h-100 bg-white shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex flex-column gap-2">
              <SkeletonBox width={200} height={16} />
              <SkeletonBox width={150} height={11} />
            </div>
            <SkeletonBox width={84} height={24} pill />
          </div>
          <div className="d-flex flex-column gap-3 mt-3">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="p-3 rounded-3 border bg-light d-flex flex-column gap-2">
                <div className="d-flex justify-content-between align-items-center">
                  <SkeletonBox width={130} height={16} />
                  <SkeletonBox width={80} height={16} />
                </div>
                <div className="d-flex justify-content-between">
                  <SkeletonBox width={90} height={11} />
                  <SkeletonBox width={95} height={11} />
                </div>
                <SkeletonBox width="100%" height={10} pill />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ResumenSedesSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="row g-3" aria-hidden="true">
    {Array.from({ length: count }).map((_, idx) => (
      <div className="col-md-6" key={`sk-resumen-${idx}`}>
        <div className="stat-box d-flex justify-content-between align-items-center">
          <div className="d-flex flex-column gap-2">
            <SkeletonBox width={118} height={22} pill />
            <SkeletonBox width={190} height={20} />
            <SkeletonBox width={165} height={12} />
          </div>
          <div className="d-flex flex-column align-items-end gap-1">
            <SkeletonBox width={48} height={36} />
            <SkeletonBox width={68} height={11} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ChatHistorySkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="d-flex flex-column gap-2" aria-hidden="true">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={`sk-chat-${idx}`}
        className="p-2 rounded-3 d-flex align-items-center justify-content-between"
        style={{ backgroundColor: '#fafaf9', border: '1px solid var(--border-subtle)' }}
      >
        <div className="d-flex flex-column gap-2 flex-grow-1 me-2">
          <SkeletonBox width={`${70 + (idx % 2) * 15}%`} height={13} />
          <SkeletonBox width="52%" height={10} />
        </div>
        <SkeletonBox width={28} height={28} radius={8} />
      </div>
    ))}
  </div>
);
