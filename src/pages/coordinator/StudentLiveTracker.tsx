import { useMemo, useRef, useState } from "react";
import {
  MapboxMap,
  type MapboxMapHandle,
  type MapMarker,
  type MapPolygonFeature,
} from "@/components/MapboxMap";
import { useCompanies } from "@/lib/queries/companies";
import { useLatestGeofenceEvents } from "@/lib/queries/geofenceEvents";
import { useAttendanceMonitoring, type AttendanceRecord } from "@/lib/queries/attendance";
import { useAuth } from "@/lib/auth";
import { useLiveInternLocations } from "@/hooks/useLiveInternLocations";
import { useTheme } from "@/context/ThemeContext"; // adjust path as needed
import type { Company } from "@/types";
import {
  MapPin,
  X,
  Building2,
  User,
  Navigation,
  Clock,
  Coffee,
} from "lucide-react";

type LocatedCompany = Company & { latitude: number; longitude: number };

function hasCoordinates(company: Company): company is LocatedCompany {
  return company.latitude !== null && company.longitude !== null;
}

// Standard ray-casting algorithm. Expects [longitude, latitude] pairs to match
// GeoJSON's coordinate order, same convention used by MapMarker/geofence_polygon.
function isPointInPolygon(
  point: [number, number],
  polygon: number[][]
): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Attendance fields can be full ISO strings or plain "HH:MM:SS" values.
function formatLogTime(value: string) {
  if (value.includes("T")) return formatTime(value);
  const [h, m] = value.split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour) || m === undefined) return value;
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type MatchedArea = {
  name: string;
  address?: string | null;
  type: "company" | "building";
};

type GeofenceStatus = { inside: boolean; locationName: string | null };

type WorkStatus =
  | { kind: "break"; since: string }
  | { kind: "working" }
  | { kind: "out" };

const StatusPill = ({ inside }: { inside: boolean }) =>
  inside ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Inside
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Outside
    </span>
  );

const WorkStatusPill = ({ status }: { status: WorkStatus }) => {
  if (status.kind === "break") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
        <Coffee className="h-3 w-3" />
        On lunch break · since {formatLogTime(status.since)}
      </span>
    );
  }
  if (status.kind === "working") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        Working
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Timed out
    </span>
  );
};

const StudentLiveTracker = () => {
  const { token } = useAuth();
  const { data: companies } = useCompanies();
  const { data: geofenceEvents } = useLatestGeofenceEvents();
  // Today's time logs, used to tell who is on their lunch break.
  const { data: todayLogs } = useAttendanceMonitoring({ range: "today" }, token);
  const mapRef = useRef<MapboxMapHandle>(null);
  const [selectedInternId, setSelectedInternId] = useState<
    number | string | null
  >(null);
  const { themeColor, hoverColor } = useTheme();

  const approvedCompanies = useMemo<LocatedCompany[]>(
    () =>
      (companies ?? []).filter(
        (company): company is LocatedCompany =>
          Boolean(company.is_approved) && hasCoordinates(company)
      ),
    [companies]
  );

  const companyIds = useMemo(
    () => approvedCompanies.map((c) => c.id),
    [approvedCompanies]
  );
  const liveLocations = useLiveInternLocations(companyIds);

  const selectedIntern = useMemo(
    () =>
      liveLocations.find((loc) => loc.intern_id === selectedInternId) ?? null,
    [liveLocations, selectedInternId]
  );

  const matchedArea = useMemo<MatchedArea | null>(() => {
    if (!selectedIntern) return null;
    const point: [number, number] = [
      selectedIntern.longitude,
      selectedIntern.latitude,
    ];

    for (const company of approvedCompanies) {
      if (
        company.geofence_enabled &&
        company.geofence_polygon?.coordinates?.[0]
      ) {
        if (isPointInPolygon(point, company.geofence_polygon.coordinates[0])) {
          return {
            name: company.name,
            address: company.address,
            type: "company",
          };
        }
      }
      if (company.buildings) {
        for (const b of company.buildings) {
          if (
            b.geofence_polygon?.type === "Polygon" &&
            b.geofence_polygon.coordinates?.[0]
          ) {
            if (isPointInPolygon(point, b.geofence_polygon.coordinates[0])) {
              return {
                name: `${b.name || "Unnamed Building"} — ${company.name}`,
                address: company.address,
                type: "building",
              };
            }
          }
        }
      }
    }
    return null;
  }, [selectedIntern, approvedCompanies]);

  // Geofence status for every visible intern
  const internGeofenceStatuses = useMemo<Map<number | string, GeofenceStatus>>(() => {
    const map = new Map<number | string, GeofenceStatus>();
    for (const loc of liveLocations) {
      const point: [number, number] = [loc.longitude, loc.latitude];
      let found: GeofenceStatus | null = null;

      outer: for (const company of approvedCompanies) {
        // Check company-level polygon first
        if (company.geofence_enabled && company.geofence_polygon?.coordinates?.[0]) {
          if (isPointInPolygon(point, company.geofence_polygon.coordinates[0])) {
            found = { inside: true, locationName: company.name };
            break outer;
          }
        }
        // Check building polygons
        if (company.buildings) {
          for (const b of company.buildings) {
            if (b.geofence_polygon?.type === "Polygon" && b.geofence_polygon.coordinates?.[0]) {
              if (isPointInPolygon(point, b.geofence_polygon.coordinates[0])) {
                found = {
                  inside: true,
                  locationName: `${b.name || "Unnamed Building"} — ${company.name}`,
                };
                break outer;
              }
            }
          }
        }
      }

      map.set(loc.intern_id, found ?? { inside: false, locationName: null });
    }
    return map;
  }, [liveLocations, approvedCompanies]);

  // Work status (on lunch break / working / timed out) for every visible
  // intern, derived from today's latest time log. Matches by name first, then
  // falls back to the id.
  const internWorkStatuses = useMemo<Map<number | string, WorkStatus>>(() => {
    const latestByName = new Map<string, AttendanceRecord>();
    const latestById = new Map<number, AttendanceRecord>();

    for (const log of todayLogs ?? []) {
      if (!log.time_in) continue;
      const nameKey = normalizeName(log.student_name);
      const byName = latestByName.get(nameKey);
      if (!byName || (byName.time_in && log.time_in > byName.time_in)) {
        latestByName.set(nameKey, log);
      }
      const byId = latestById.get(log.student_id);
      if (!byId || (byId.time_in && log.time_in > byId.time_in)) {
        latestById.set(log.student_id, log);
      }
    }

    const map = new Map<number | string, WorkStatus>();
    for (const loc of liveLocations) {
      const log =
        latestByName.get(normalizeName(loc.intern_name)) ??
        latestById.get(Number(loc.intern_id));
      if (!log) continue;

      if (log.time_out) {
        map.set(loc.intern_id, { kind: "out" });
      } else if (log.break_out && !log.break_in) {
        map.set(loc.intern_id, { kind: "break", since: log.break_out });
      } else {
        map.set(loc.intern_id, { kind: "working" });
      }
    }
    return map;
  }, [liveLocations, todayLogs]);

  const companyMarkers: MapMarker[] = useMemo(
    () =>
      approvedCompanies.map((company) => ({
        id: company.id,
        longitude: company.longitude,
        latitude: company.latitude,
        title: company.name,
        color: "danger",
        shape: "pin",
        popupHtml: `<strong>${company.name}</strong>${company.address ? `<br/>${company.address}` : ""
          }`,
      })),
    [approvedCompanies]
  );

  // Theme-colored intern dots: `color` stays a valid semantic token (required
  // by the type), `hexColor` is what actually paints the marker, overriding
  // the Tailwind class via inline style in MapboxMap's markerColorTarget.
  const liveMarkers: MapMarker[] = useMemo(
    () =>
      liveLocations.map((loc) => ({
        id: `live-${loc.intern_id}`,
        longitude: loc.longitude,
        latitude: loc.latitude,
        title: loc.intern_name,
        color: "primary",
        hexColor: loc.intern_id === selectedInternId ? hoverColor : themeColor,
        popupHtml: `<strong>${loc.intern_name}</strong><br/>Seen: ${new Date(
          loc.recorded_at
        ).toLocaleTimeString()}`,
      })),
    [liveLocations, selectedInternId, themeColor, hoverColor]
  );

  const markers: MapMarker[] = useMemo(
    () => [...companyMarkers, ...liveMarkers],
    [companyMarkers, liveMarkers]
  );

  const polygons = useMemo<MapPolygonFeature[]>(() => {
    const features: MapPolygonFeature[] = [];
    for (const company of approvedCompanies) {
      if (company.geofence_enabled && company.geofence_polygon) {
        features.push({
          id: company.id,
          name: company.name,
          polygon: company.geofence_polygon,
        });
      }
      if (company.buildings) {
        for (const b of company.buildings) {
          if (b.geofence_polygon?.type === "Polygon") {
            features.push({
              id: `building-${b.id}`,
              name: b.name || "Unnamed Building",
              polygon: b.geofence_polygon,
            });
          }
        }
      }
    }
    return features;
  }, [approvedCompanies]);

  const handleSelect = (loc: (typeof liveLocations)[number]) => {
    setSelectedInternId(loc.intern_id);
    mapRef.current?.flyTo(loc.longitude, loc.latitude, 17);
  };

  // Marker clicks on the map itself also open the panel — MapboxMap already
  // handles the flyTo internally for marker clicks, so this only needs to
  // update selection state, not move the camera.
  const handleMarkerClick = (id: number | string) => {
    if (typeof id === "string" && id.startsWith("live-")) {
      const internIdStr = id.slice("live-".length);
      const match = liveLocations.find(
        (loc) => String(loc.intern_id) === internIdStr
      );
      if (match) setSelectedInternId(match.intern_id);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">
          Interns Live Tracker
        </h1>
        <p className="text-sm text-slate-500">
          Live positions — click a name or pin to see where they're doing their
          OJT.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <aside className="flex max-h-[640px] flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            <h2 className="flex items-center text-sm font-medium text-[var(--color-ink)]">
              <span className="relative mr-2 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              </span>
              Attendance Timetable
              <span className="ml-1 text-slate-400">
                ({liveLocations.length})
              </span>
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {liveLocations.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                No interns are currently broadcasting their location.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {liveLocations.map((loc) => {
                  const status = internGeofenceStatuses.get(loc.intern_id);
                  const workStatus = internWorkStatuses.get(loc.intern_id);
                  const isSelected = selectedInternId === loc.intern_id;
                  return (
                    <li key={loc.intern_id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(loc)}
                        className={`flex w-full items-start gap-3 border-l-4 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                          isSelected ? "bg-slate-50" : ""
                        }`}
                        style={{
                          borderLeftColor: isSelected
                            ? themeColor
                            : "transparent",
                        }}
                      >
                        <span
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: themeColor }}
                        >
                          {getInitials(loc.intern_name)}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold leading-snug text-slate-800">
                              {loc.intern_name}
                            </span>
                            {status && <StatusPill inside={status.inside} />}
                          </span>

                          {workStatus && (
                            <span className="mt-1 flex">
                              <WorkStatusPill status={workStatus} />
                            </span>
                          )}

                          {status?.inside && status.locationName && (
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-emerald-700">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {status.locationName}
                              </span>
                            </span>
                          )}

                          <span className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                            Last seen {formatTime(loc.recorded_at)}
                          </span>

                          <span className="mt-1 flex items-center gap-1 font-mono text-[11px] text-slate-400">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {(geofenceEvents?.length ?? 0) > 0 && (
              <div className="border-t border-[var(--color-line)] px-4 py-3">
                <h2 className="text-sm font-medium text-[var(--color-ink)]">
                  Recent activity{" "}
                  <span className="text-slate-400">
                    ({geofenceEvents!.length})
                  </span>
                </h2>
                <ul className="mt-2 space-y-1.5">
                  {geofenceEvents!.map((event) => (
                    <li
                      key={event.student_id}
                      className="flex items-start gap-1.5 text-xs text-slate-500"
                    >
                      <span
                        className={
                          event.event_type === "exit"
                            ? "text-red-600"
                            : "text-green-600"
                        }
                      >
                        {event.event_type === "exit" ? "⚠️" : "✅"}
                      </span>
                      <span className="min-w-0 flex-1">
                        {event.student_name}
                        <span className="text-slate-400">
                          {" "}
                          — {formatTime(event.occurred_at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
          <MapboxMap
            ref={mapRef}
            markers={markers}
            polygons={polygons}
            fitMarkers
            heightClassName="h-[560px]"
            onMarkerClick={handleMarkerClick}
          />

          {selectedIntern && (
            <div className="absolute right-12 top-4 w-72 rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" style={{ color: themeColor }} />
                  <h3 className="text-sm font-semibold text-slate-800">
                    {selectedIntern.intern_name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedInternId(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {matchedArea?.name ??
                      (selectedIntern as any).company_name ??
                      "Outside any known geofence"}
                  </span>
                </div>
                {matchedArea?.address && (
                  <div className="pl-5 text-[11px] text-slate-400">
                    {matchedArea.address}
                  </div>
                )}
                {(selectedIntern as any).coordinator_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Coordinator: {(selectedIntern as any).coordinator_name}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Navigation className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">
                    {selectedIntern.latitude.toFixed(6)},&nbsp;
                    {selectedIntern.longitude.toFixed(6)}
                  </span>
                </div>
                {(() => {
                  const status = internGeofenceStatuses.get(selectedIntern.intern_id);
                  if (!status) return null;
                  return (
                    <div className="flex items-center gap-2">
                      {status.inside ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Inside geofence{status.locationName ? ` — ${status.locationName}` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Outside geofence
                        </span>
                      )}
                    </div>
                  );
                })()}
                {(() => {
                  const workStatus = internWorkStatuses.get(selectedIntern.intern_id);
                  if (!workStatus) return null;
                  return (
                    <div className="flex items-center gap-2">
                      <WorkStatusPill status={workStatus} />
                    </div>
                  );
                })()}
                <div className="text-[11px] text-slate-400">
                  Last seen{" "}
                  {new Date(selectedIntern.recorded_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default StudentLiveTracker;