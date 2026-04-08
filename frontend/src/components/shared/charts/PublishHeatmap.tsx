import { useState, useMemo, useCallback } from "react";

interface HeatmapCell {
  day: number;
  hour: number;
  value: number;
}

interface PublishHeatmapProps {
  data: HeatmapCell[];
  maxValue?: number;
  height?: number;
  dayLabels?: string[];
  emptyMessage?: string;
  testId?: string;
}

const DEFAULT_DAY_LABELS = ["Pzt", "Sal", "Car", "Per", "Cum", "Cmt", "Paz"];
const HOUR_LABELS = [0, 4, 8, 12, 16, 20];
const CELL_SIZE = 16;
const CELL_GAP = 2;
const BASE_COLOR = "99, 102, 241"; // #6366f1 in rgb
const LABEL_WIDTH = 32;
const HEADER_HEIGHT = 20;

export function PublishHeatmap({
  data,
  maxValue: maxValueProp,
  height = 200,
  dayLabels = DEFAULT_DAY_LABELS,
  emptyMessage = "Veri bulunamadi",
  testId = "publish-heatmap",
}: PublishHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    day: number;
    hour: number;
    value: number;
  } | null>(null);

  const cellMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of data) {
      map.set(`${cell.day}-${cell.hour}`, cell.value);
    }
    return map;
  }, [data]);

  const maxValue = useMemo(() => {
    if (maxValueProp !== undefined) return maxValueProp;
    if (data.length === 0) return 1;
    return Math.max(1, ...data.map((d) => d.value));
  }, [data, maxValueProp]);

  const getOpacity = useCallback(
    (value: number) => {
      if (value === 0) return 0.05;
      return 0.05 + (value / maxValue) * 0.95;
    },
    [maxValue],
  );

  if (!data || data.length === 0) {
    return (
      <div
        data-testid={testId}
        className="flex items-center justify-center text-sm text-neutral-400"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  const svgWidth = LABEL_WIDTH + 24 * (CELL_SIZE + CELL_GAP);
  const svgHeight = HEADER_HEIGHT + 7 * (CELL_SIZE + CELL_GAP);

  return (
    <div data-testid={testId} className="relative w-full overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="block"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Hour labels */}
        {HOUR_LABELS.map((h) => (
          <text
            key={`h-${h}`}
            x={LABEL_WIDTH + h * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2}
            y={12}
            textAnchor="middle"
            className="fill-neutral-400"
            style={{ fontSize: 10 }}
          >
            {String(h).padStart(2, "0")}
          </text>
        ))}

        {/* Day labels + cells */}
        {Array.from({ length: 7 }, (_, day) => (
          <g key={`day-${day}`}>
            <text
              x={0}
              y={HEADER_HEIGHT + day * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2 + 4}
              className="fill-neutral-500"
              style={{ fontSize: 11, fontWeight: 500 }}
            >
              {dayLabels[day]}
            </text>
            {Array.from({ length: 24 }, (_, hour) => {
              const value = cellMap.get(`${day}-${hour}`) ?? 0;
              const cx = LABEL_WIDTH + hour * (CELL_SIZE + CELL_GAP);
              const cy = HEADER_HEIGHT + day * (CELL_SIZE + CELL_GAP);
              return (
                <rect
                  key={`${day}-${hour}`}
                  x={cx}
                  y={cy}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={3}
                  fill={`rgba(${BASE_COLOR}, ${getOpacity(value)})`}
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    const rect = (
                      e.target as SVGRectElement
                    ).getBoundingClientRect();
                    const parent = (
                      e.target as SVGRectElement
                    ).closest("[data-testid]")!.getBoundingClientRect();
                    setTooltip({
                      x: rect.left - parent.left + CELL_SIZE / 2,
                      y: rect.top - parent.top - 8,
                      day,
                      hour,
                      value,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span className="font-medium text-neutral-700">
            {dayLabels[tooltip.day]} {String(tooltip.hour).padStart(2, "0")}:00
          </span>
          <span className="ml-1.5 text-neutral-500">{tooltip.value}</span>
        </div>
      )}
    </div>
  );
}
