"use client";

import React, { useMemo, useState } from "react";
import { RAW_DATA } from "./data/crimeData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { MapPin, Search, CalendarDays, Clock, Filter, Target } from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("bg-white", className)}>{children}</div>;
}

function CardContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

function Badge({ className = "", children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties; variant?: string }) {
  return <span className={cx("inline-flex items-center px-2.5 py-1 text-xs font-semibold", className)} style={style}>{children}</span>;
}

function Button({ className = "", children, onClick, variant }: { className?: string; children: React.ReactNode; onClick?: () => void; variant?: string }) {
  return <button type="button" onClick={onClick} className={cx("inline-flex h-10 items-center justify-center border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50", className)}>{children}</button>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx("w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300", props.className)} />;
}


const crimePalette: Record<string, string> = {
  MURDER: "#ef4444",
  "CAPITAL MURDER": "#7f1d1d",
  MANSLAUGHTER: "#f97316",
  "CRASH/MANSLAUGHTER": "#eab308",
  "CRASH/MURDER": "#a855f7",
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

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl shadow-sm border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function countBy<T extends string | number>(rows: CrimeRow[], getKey: (row: CrimeRow) => T) {
  const map = new Map<T, number>();
  rows.forEach((row) => map.set(getKey(row), (map.get(getKey(row)) || 0) + 1));
  return Array.from(map, ([name, count]) => ({ name, count })).sort((a, b) => Number(a.name) - Number(b.name));
}

function lonToTileX(lon: number, zoom: number) {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function latToTileY(lat: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom);
}

function TileMap({ rows, selected, setSelected }: { rows: CrimeRow[]; selected: CrimeRow | null; setSelected: (row: CrimeRow) => void }) {
  const width = 760;
  const height = 520;
  const tileSize = 256;
  const zoom = 11;
  const centerLat = 30.285;
  const centerLon = -97.735;
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

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-xl bg-slate-200">
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
      <div className="absolute inset-0 bg-slate-950/5" />
      {rows.map((row, idx) => {
        const p = project(row);
        const isActive = selected && selected.date === row.date && selected.time === row.time && selected.address === row.address;
        if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) return null;
        return (
          <button
            key={`${row.date}-${row.time}-${idx}`}
            type="button"
            title={`${row.crime} — ${row.address}`}
            onClick={() => setSelected(row)}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg transition-transform hover:scale-125"
            style={{
              left: p.x,
              top: p.y,
              width: isActive ? 18 : 12,
              height: isActive ? 18 : 12,
              backgroundColor: crimePalette[row.crime] || "#38bdf8",
              boxShadow: isActive ? "0 0 0 8px rgba(239,68,68,.24)" : "0 2px 8px rgba(15,23,42,.28)",
            }}
          />
        );
      })}
      <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm">
        Map tiles © OpenStreetMap contributors
      </div>
    </div>
  );
}

function MapView({ rows, selected, setSelected }: { rows: CrimeRow[]; selected: CrimeRow | null; setSelected: (row: CrimeRow) => void }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Incident map</h2>
            <p className="text-sm text-slate-500">Real map view using the converted latitude/longitude coordinates.</p>
          </div>
          <Badge className="rounded-full bg-slate-100 text-slate-700">{rows.length} visible</Badge>
        </div>
        <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
          <div className="relative bg-slate-950 p-4">
            <TileMap rows={rows} selected={selected} setSelected={setSelected} />
          </div>
          <div className="border-l bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Selected incident</h3>
            {selected ? (
              <div className="mt-4 space-y-4">
                <Badge className="rounded-full text-white" style={{ backgroundColor: crimePalette[selected.crime] || "#0f172a" }}>{selected.crime}</Badge>
                <div>
                  <p className="text-xl font-semibold text-slate-950">{selected.address}</p>
                  <p className="text-sm text-slate-500">{selected.date} at {selected.time}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  <p>Lat: {selected.lat.toFixed(5)}</p>
                  <p>Lon: {selected.lon.toFixed(5)}</p>
                  <p>Offense code: {selected.code}</p>
                </div>
              </div>
            ) : <p className="mt-4 text-sm text-slate-500">Click a point on the map to inspect an incident.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CrimeDataExplorer() {
  const data = RAW_DATA as CrimeRow[];
  const [crime, setCrime] = useState("all");
  const [year, setYear] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CrimeRow | null>(data[0]);

  const crimeTypes = useMemo(() => Array.from(new Set(data.map((d) => d.crime))).sort(), [data]);
  const years = useMemo(() => Array.from(new Set(data.map((d) => d.year))).sort(), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((row) =>
      (crime === "all" || row.crime === crime) &&
      (year === "all" || String(row.year) === year) &&
      (!q || row.address.toLowerCase().includes(q) || row.crime.toLowerCase().includes(q))
    );
  }, [data, crime, year, query]);

  const byCrime = useMemo(() => countBy(filtered, (r) => r.crime).sort((a, b) => b.count - a.count), [filtered]);
  const byYear = useMemo(() => countBy(filtered, (r) => r.year), [filtered]);
  const byHour = useMemo(() => countBy(filtered, (r) => r.hour), [filtered]);
  const dateRange = `${data[0].date} → ${data[data.length - 1].date}`;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <Badge className="mb-3 rounded-full bg-white/10 text-white hover:bg-white/10">CSV data explorer</Badge>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Homicide incident map + dashboard</h1>
              <p className="mt-3 max-w-3xl text-slate-300">Interactive visualization for {data.length} uploaded incident records. Filter by offense type, year, and address, then inspect individual map points.</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-sm text-slate-200">
              <p className="font-medium text-white">Dataset range</p>
              <p>{dateRange}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Visible incidents" value={filtered.length} icon={<Target className="h-5 w-5" />} />
          <StatCard label="Total records" value={data.length} icon={<MapPin className="h-5 w-5" />} />
          <StatCard label="Years covered" value={years.length} icon={<CalendarDays className="h-5 w-5" />} />
          <StatCard label="Peak visible hour" value={`${byHour.slice().sort((a, b) => b.count - a.count)[0]?.name ?? "—"}:00`} icon={<Clock className="h-5 w-5" />} />
        </section>

        <Card className="rounded-2xl shadow-sm border-slate-200">
          <CardContent className="p-5">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto] md:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search address or offense..." className="h-10 rounded-xl pl-9" />
              </div>
              <select value={crime} onChange={(e) => setCrime(e.target.value)} title="Filter by crime type" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">
                <option value="all">All crime types</option>
                {crimeTypes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={year} onChange={(e) => setYear(e.target.value)} title="Filter by year" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">
                <option value="all">All years</option>
                {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
              <Button variant="outline" className="rounded-xl" onClick={() => { setCrime("all"); setYear("all"); setQuery(""); }}><Filter className="mr-2 h-4 w-4" />Reset</Button>
            </div>
          </CardContent>
        </Card>

        <MapView rows={filtered} selected={selected} setSelected={setSelected} />

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl shadow-sm border-slate-200 lg:col-span-1">
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold">By offense type</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%"><BarChart data={byCrime} layout="vertical" margin={{ left: 24 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm border-slate-200 lg:col-span-1">
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold">By year</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%"><LineChart data={byYear}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="count" strokeWidth={3} dot /></LineChart></ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm border-slate-200 lg:col-span-1">
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold">By hour of day</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%"><BarChart data={byHour}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-2xl shadow-sm border-slate-200">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Visible records</h2>
              <Badge className="rounded-full bg-slate-100 text-slate-700">showing first 60</Badge>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Date</th><th className="p-3">Time</th><th className="p-3">Offense</th><th className="p-3">Address</th><th className="p-3">Lat/Lon</th></tr></thead>
                <tbody>{filtered.slice(0, 60).map((row, idx) => <tr key={`${row.date}-${row.time}-${idx}`} className="border-t hover:bg-slate-50" onClick={() => setSelected(row)}><td className="p-3">{row.date}</td><td className="p-3">{row.time}</td><td className="p-3"><Badge className="rounded-full border border-slate-300 bg-white text-slate-700">{row.crime}</Badge></td><td className="p-3">{row.address}</td><td className="p-3 text-slate-500">{row.lat.toFixed(4)}, {row.lon.toFixed(4)}</td></tr>)}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
