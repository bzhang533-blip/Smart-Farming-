interface Props {
  cells: number[][];
  priceAxis: number[];
  yieldAxis: number[];
  centerPrice: number;
  centerYield: number;
}

function cellStyle(value: number, maxAbs: number): React.CSSProperties {
  if (maxAbs === 0) return {};
  const intensity = Math.min(Math.abs(value) / maxAbs, 1);
  const alpha = 0.08 + intensity * 0.5;
  const rgb = value >= 0 ? "16, 122, 87" : "200, 50, 50";
  return { backgroundColor: `rgba(${rgb}, ${alpha.toFixed(3)})` };
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export default function SensitivityGrid({
  cells,
  priceAxis,
  yieldAxis,
  centerPrice,
  centerYield,
}: Props) {
  const maxAbs = Math.max(1, ...cells.flat().map((v) => Math.abs(v)));
  const rowOrder = priceAxis.map((_, i) => i).reverse();

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-stone-50 px-3 py-2 text-left text-xs font-semibold text-stone-500">
                Cash $/bu ＼ Yield
              </th>
              {yieldAxis.map((y, j) => (
                <th
                  key={j}
                  className={`px-3 py-2 text-right text-xs font-semibold tabular-nums ${
                    near(y, centerYield) ? "text-amber-700" : "text-stone-500"
                  }`}
                >
                  {y.toFixed(0)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowOrder.map((i) => {
              const price = priceAxis[i];
              const isPriceCenter = near(price, centerPrice);
              return (
                <tr key={i}>
                  <th
                    className={`sticky left-0 z-10 bg-stone-50 px-3 py-2 text-left text-xs font-semibold tabular-nums ${
                      isPriceCenter ? "text-amber-700" : "text-stone-600"
                    }`}
                  >
                    ${price.toFixed(2)}
                  </th>
                  {yieldAxis.map((y, j) => {
                    const value = cells[i][j];
                    const isCenter = isPriceCenter && near(y, centerYield);
                    return (
                      <td
                        key={j}
                        style={cellStyle(value, maxAbs)}
                        className={`px-3 py-2 text-right tabular-nums ${
                          isCenter
                            ? "font-bold text-stone-900 outline outline-2 outline-amber-500"
                            : value >= 0
                              ? "text-emerald-900"
                              : "text-red-900"
                        }`}
                      >
                        {value >= 0 ? "" : "−"}${Math.abs(value).toFixed(0)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "rgba(16,122,87,0.45)" }} />
          Profit / acre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "rgba(200,50,50,0.45)" }} />
          Loss / acre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded outline outline-2 outline-amber-500" />
          Your current scenario
        </span>
      </div>
    </div>
  );
}
