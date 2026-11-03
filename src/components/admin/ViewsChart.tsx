/** 30-day page views — pure SVG/CSS bar chart with per-bar hover tooltips. */
export function ViewsChart({ data }: { data: { day: string; views: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.views));
  // nice ceiling for gridlines
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  const ceil = Math.ceil(max / mag) * mag;
  const ticks = [0, ceil / 2, ceil];
  const W = 600;
  const H = 180;
  const gap = 2;
  const bw = W / data.length;
  const total = data.reduce((s, d) => s + d.views, 0);
  const fmtDay = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return (
    <figure className="adm-chart" aria-label={`Page views over the last ${data.length} days, ${total.toLocaleString()} in total`}>
      <div className="adm-chart-plot">
        <div className="adm-chart-axis" aria-hidden="true">
          {[...ticks].reverse().map((t) => (
            <span key={t}>{t >= 1000 ? `${(t / 1000).toFixed(t % 1000 ? 1 : 0)}k` : t}</span>
          ))}
        </div>
        <div className="adm-chart-area">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-hidden="true">
            {ticks.map((t) => (
              <line key={t} x1="0" x2={W} y1={H - (t / ceil) * H} y2={H - (t / ceil) * H} className="adm-chart-grid" vectorEffect="non-scaling-stroke" />
            ))}
            {data.map((d, i) => {
              const h = d.views ? Math.max(2, (d.views / ceil) * H) : 0;
              return <rect key={d.day} x={i * bw + gap / 2} y={H - h} width={Math.max(1, bw - gap)} height={h} rx="2" className="adm-chart-bar" />;
            })}
          </svg>
          <div className="adm-chart-hits">
            {data.map((d) => (
              <span key={d.day} className="adm-chart-hit" tabIndex={0}>
                <span className="adm-chart-tip">
                  <strong>{d.views.toLocaleString()}</strong> views
                  <br />
                  {fmtDay(d.day)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="adm-chart-x" aria-hidden="true">
        <span>{fmtDay(data[0]?.day ?? '')}</span>
        <span>{fmtDay(data[Math.floor(data.length / 2)]?.day ?? '')}</span>
        <span>{fmtDay(data[data.length - 1]?.day ?? '')}</span>
      </div>
      <details className="adm-chart-table">
        <summary>View as table</summary>
        <table className="adm-table adm-table-compact">
          <thead>
            <tr>
              <th>Day</th>
              <th className="is-num">Views</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <td>{fmtDay(d.day)}</td>
                <td className="is-num">{d.views.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
