"use client";

/* eslint-disable @next/next/no-img-element -- Dynamic map tiles use computed third-party URLs. */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RAW_DATA } from "./data/crimeData";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarDays,
  Clock,
  Crosshair,
  Filter,
  LocateFixed,
  RotateCcw,
  Search,
  ShieldAlert,
  Table2,
} from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cx("border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </section>
  );
}

function Badge({
  className = "",
  children,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cx(
        "inline-flex min-h-6 items-center rounded px-2 text-[11px] font-semibold uppercase tracking-[0.08em]",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      >
        {children}
      </select>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-l border-slate-200 px-4 py-3 first:border-l-0">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="truncate text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

const crimePalette: Record<string, string> = {
  MURDER: "#b91c1c",
  // "MURDER": "#450a0a",
  // MURDER: "#c2410c",
  // "MURDER": "#a16207",
  // "MURDER": "#6d28d9",
};

type CrimeRow = {
  date: string;
  time: string;
  hour: number;
  year: number;
  month: string;
  address: string;
  crime: string;
  code: number;
  lat: number;
  lon: number;
  x: number;
  y: number;
};

type CountDatum = {
  name: string | number;
  count: number;
};

function countBy<T extends string | number>(
  rows: CrimeRow[],
  getKey: (row: CrimeRow) => T,
) {
  const map = new Map<T, number>();
  rows.forEach((row) => {
    const key = getKey(row);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map, ([name, count]) => ({ name, count })).sort(
    (a, b) => Number(a.name) - Number(b.name),
  );
}

function lonToTileX(lon: number, zoom: number) {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function latToTileY(lat: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

function sameIncident(a: CrimeRow | null, b: CrimeRow) {
  return Boolean(
    a &&
      a.date === b.date &&
      a.time === b.time &&
      a.address === b.address &&
      a.crime === b.crime,
  );
}

function TileMap({
  rows,
  selected,
  setSelected,
}: {
  rows: CrimeRow[];
  selected: CrimeRow | null;
  setSelected: (row: CrimeRow) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 760, height: 540 });
  const tileSize = 256;
  const zoom = 11;
  const centerLat = 30.285;
  const centerLon = -97.735;
  const { width, height } = viewport;
  const centerX = lonToTileX(centerLon, zoom) * tileSize;
  const centerY = latToTileY(centerLat, zoom) * tileSize;
  const topLeftX = centerX - width / 2;
  const topLeftY = centerY - height / 2;

  const startTileX = Math.floor(topLeftX / tileSize);
  const startTileY = Math.floor(topLeftY / tileSize);
  const endTileX = Math.floor((topLeftX + width) / tileSize);
  const endTileY = Math.floor((topLeftY + height) / tileSize);
  const maxTile = Math.pow(2, zoom);

  const tiles = [];
  for (let x = startTileX; x <= endTileX; x++) {
    for (let y = startTileY; y <= endTileY; y++) {
      if (y >= 0 && y < maxTile) {
        const wrappedX = ((x % maxTile) + maxTile) % maxTile;
        tiles.push({
          key: `${x}-${y}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
          left: x * tileSize - topLeftX,
          top: y * tileSize - topLeftY,
        });
      }
    }
  }

  const project = (row: CrimeRow) => ({
    x: lonToTileX(row.lon, zoom) * tileSize - topLeftX,
    y: latToTileY(row.lat, zoom) * tileSize - topLeftY,
  });

  useEffect(() => {
    if (!mapRef.current) return;
    const mapElement: HTMLDivElement = mapRef.current;

    function updateViewport() {
      setViewport((current) => {
        const next = {
          width: Math.max(Math.round(mapElement.clientWidth), 1),
          height: Math.max(Math.round(mapElement.clientHeight), 1),
        };

        return current.width === next.width && current.height === next.height ? current : next;
      });
    }

    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(mapElement);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={mapRef}
      className="relative h-[68vh] min-h-[460px] w-full overflow-hidden bg-slate-200 lg:h-[calc(100vh-292px)] lg:min-h-[560px]"
    >
      {tiles.map((tile) => (
        <img
          key={tile.key}
          src={tile.url}
          alt=""
          className="absolute h-[256px] w-[256px] select-none"
          style={{ left: tile.left, top: tile.top }}
          draggable={false}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute inset-0 bg-slate-950/10" />
      {rows.map((row, index) => {
        const point = project(row);
        const isActive = sameIncident(selected, row);
        if (point.x < -20 || point.x > width + 20 || point.y < -20 || point.y > height + 20) {
          return null;
        }

        return (
          <button
            key={`${row.date}-${row.time}-${row.address}-${index}`}
            type="button"
            title={`${row.crime} - ${row.address}`}
            onClick={() => setSelected(row)}
            className={cx(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 shadow transition-[box-shadow,opacity] duration-200 hover:opacity-100 focus:outline-none focus:ring-4 focus:ring-slate-900/20",
              isActive ? "z-20 opacity-100" : "z-10 opacity-80",
            )}
            style={{
              left: point.x,
              top: point.y,
              width: isActive ? 18 : 11,
              height: isActive ? 18 : 11,
              backgroundColor: crimePalette[row.crime] || "#334155",
              boxShadow: isActive
                ? "0 0 0 7px rgba(185,28,28,.22), 0 10px 18px rgba(15,23,42,.28)"
                : "0 3px 8px rgba(15,23,42,.30)",
            }}
          />
        );
      })}
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded border border-slate-900/10 bg-white/92 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
        <LocateFixed className="h-4 w-4 text-slate-500" />
        Austin metro operational view
      </div>
      <div className="absolute bottom-4 left-4 rounded border border-slate-900/10 bg-white/90 px-3 py-2 text-[11px] text-slate-600 shadow-sm backdrop-blur">
        Map tiles © OpenStreetMap contributors
      </div>
    </div>
  );
}

function SelectedIncident({ selected }: { selected: CrimeRow | null }) {
  return (
    <div className="border-t border-slate-200 bg-white p-4 lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Selected Incident
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">Case inspection</h2>
        </div>
        <Crosshair className="h-5 w-5 text-slate-400" />
      </div>

      {selected ? (
        <div className="mt-5 space-y-5">
          <Badge className="text-white" style={{ backgroundColor: crimePalette[selected.crime] || "#334155" }}>
            {selected.crime}
          </Badge>
          <div>
            <p className="text-xl font-semibold leading-tight text-slate-950">{selected.address}</p>
            <p className="mt-1 text-sm text-slate-500">
              {selected.date} at {selected.time}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Latitude
              </p>
              <p className="mt-1 font-mono text-slate-900">{selected.lat.toFixed(5)}</p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Longitude
              </p>
              <p className="mt-1 font-mono text-slate-900">{selected.lon.toFixed(5)}</p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Hour
              </p>
              <p className="mt-1 font-mono text-slate-900">{String(selected.hour).padStart(2, "0")}:00</p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Code
              </p>
              <p className="mt-1 font-mono text-slate-900">{selected.code}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm leading-6 text-slate-500">
          Select a point on the map or a record in the table to inspect location, time, offense, and coordinates.
        </p>
      )}
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Panel className="rounded">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="h-64 p-3">{children}</div>
    </Panel>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-full items-end gap-2 px-2 pb-2">
      {[44, 70, 52, 88, 62, 76, 48, 66].map((height, index) => (
        <div
          key={index}
          className="flex-1 rounded-t bg-slate-200"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: CountDatum }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{String(label ?? payload[0].payload?.name ?? "")}</p>
      <p className="text-slate-600">{payload[0].value} incidents</p>
    </div>
  );
}

export default function CrimeDataExplorer() {
  const data = RAW_DATA as CrimeRow[];
  const [crime, setCrime] = useState("all");
  const [year, setYear] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CrimeRow | null>(data[0]);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const years = useMemo(() => Array.from(new Set(data.map((row) => row.year))).sort(), [data]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return data.filter(
      (row) =>
        (crime === "all" || row.crime === crime) &&
        (year === "all" || String(row.year) === year) &&
        (!normalizedQuery ||
          row.address.toLowerCase().includes(normalizedQuery) ||
          row.crime.toLowerCase().includes(normalizedQuery)),
    );
  }, [data, crime, year, query]);

  const byCrime = useMemo(
    () => countBy(filtered, (row) => row.crime).sort((a, b) => b.count - a.count),
    [filtered],
  );
  const byYear = useMemo(() => countBy(filtered, (row) => row.year), [filtered]);
  const byMonth = useMemo(() => countBy(filtered, (row) => row.month), [filtered]);
  const byHour = useMemo(() => countBy(filtered, (row) => row.hour), [filtered]);
  const byAddress = useMemo(
    () => countBy(filtered, (row) => row.address).sort((a, b) => b.count - a.count).slice(0, 5),
    [filtered],
  );

  const peakHour = byHour.slice().sort((a, b) => b.count - a.count)[0];
  const latestIncident = data[data.length - 1];
  const firstIncident = data[0];
  const nightCount = filtered.filter((row) => row.hour >= 20 || row.hour < 5).length;
  const nightShare = filtered.length ? Math.round((nightCount / filtered.length) * 100) : 0;
  const selectedInFiltered = selected && filtered.some((row) => sameIncident(selected, row));

  function resetFilters() {
    setCrime("all");
    setYear("all");
    setQuery("");
    setSelected(data[0]);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-white/15 bg-white/10 text-slate-200">Investigative Intelligence</Badge>
              <span className="font-mono text-xs text-slate-400">
                Austin homicide records / {firstIncident.date} to {latestIncident.date}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Homicide Analytics Command View
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:w-[560px]">
            <div className="rounded border border-white/10 bg-white/5 p-3">
              <p className="text-slate-400">Records</p>
              <p className="mt-1 font-mono text-lg text-white">{data.length}</p>
            </div>
            <div className="rounded border border-white/10 bg-white/5 p-3">
              <p className="text-slate-400">Visible</p>
              <p className="mt-1 font-mono text-lg text-white">{filtered.length}</p>
            </div>
            <div className="rounded border border-white/10 bg-white/5 p-3">
              <p className="text-slate-400">Years</p>
              <p className="mt-1 font-mono text-lg text-white">{years.length}</p>
            </div>
            <div className="rounded border border-white/10 bg-white/5 p-3">
              <p className="text-slate-400">Night share</p>
              <p className="mt-1 font-mono text-lg text-white">{nightShare}%</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[280px_1fr] lg:px-6">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Panel className="rounded">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-950">Filters</h2>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
            <div className="space-y-4 p-4">
              <div className="space-y-1.5">
                <FieldLabel>Address</FieldLabel>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search records"
                    className="h-10 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              {/* <SelectField label="Offense Type" value={crime} onChange={setCrime}>
                <option value="all">All offense types</option>
                {crimeTypes.map((crimeType) => (
                  <option key={crimeType} value={crimeType}>
                    {crimeType}
                  </option>
                ))}
              </SelectField> */}

              <SelectField label="Year" value={year} onChange={setYear}>
                <option value="all">All years</option>
                {years.map((entryYear) => (
                  <option key={entryYear} value={String(entryYear)}>
                    {entryYear}
                  </option>
                ))}
              </SelectField>
            </div>
          </Panel>

          <Panel className="rounded">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-950">Frequent Locations</h2>
              <p className="mt-0.5 text-xs text-slate-500">Highest recurrence in current view</p>
            </div>
            <div className="divide-y divide-slate-100">
              {byAddress.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => setQuery(String(entry.name))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-300"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-slate-800">{entry.name}</span>
                  <span className="font-mono text-xs text-slate-500">{entry.count}</span>
                </button>
              ))}
            </div>
          </Panel>
        </aside>

        <div className="space-y-4">
          <Panel className="overflow-hidden rounded">
            <div className="grid border-b border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Visible Cases"
                value={filtered.length}
                detail={`${Math.round((filtered.length / data.length) * 100)}% of dataset`}
                icon={<ShieldAlert className="h-4 w-4" />}
              />
              <Metric
                label="Peak Hour"
                value={peakHour ? `${String(peakHour.name).padStart(2, "0")}:00` : "--"}
                detail={`${peakHour?.count ?? 0} incidents`}
                icon={<Clock className="h-4 w-4" />}
              />
              <Metric
                label="Active Years"
                value={byYear.length}
                detail={year === "all" ? "full range" : String(year)}
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <Metric
                label="Offense Mix"
                value={byCrime.length}
                detail="types visible"
                icon={<Activity className="h-4 w-4" />}
              />
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
              <TileMap rows={filtered} selected={selectedInFiltered ? selected : null} setSelected={setSelected} />
              <SelectedIncident selected={selectedInFiltered ? selected : null} />
            </div>
          </Panel>

          <section className="grid gap-4 xl:grid-cols-3">
            <ChartPanel title="Monthly Distribution" subtitle="Incident volume by month">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byMonth} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#475569" }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="count" fill="#334155" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton />
              )}
            </ChartPanel>

            <ChartPanel title="Annual Trend" subtitle="Case volume by year">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={byYear} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#0f172a"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#0f172a" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton />
              )}
            </ChartPanel>

            <ChartPanel title="Hour Pattern" subtitle="Incident timing across the day">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byHour} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="count" fill="#334155" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton />
              )}
            </ChartPanel>
          </section>

          <Panel className="overflow-hidden rounded">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-slate-500" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Incident Records</h2>
                  <p className="text-xs text-slate-500">First 80 records in the current analytical view</p>
                </div>
              </div>
              <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
                {Math.min(filtered.length, 80)} shown
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Date</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Time</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Offense</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Address</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Coordinates</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Code</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 80).map((row, index) => (
                    <tr
                      key={`${row.date}-${row.time}-${row.address}-${index}`}
                      onClick={() => setSelected(row)}
                      className={cx(
                        "cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50",
                        sameIncident(selected, row) && "bg-amber-50/70",
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">{row.date}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">{row.time}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge
                          className="border border-slate-200 bg-white text-slate-700"
                          style={{ borderLeftColor: crimePalette[row.crime] || "#334155", borderLeftWidth: 4 }}
                        >
                          {row.crime}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.address}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                        {row.lat.toFixed(4)}, {row.lon.toFixed(4)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{row.code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
