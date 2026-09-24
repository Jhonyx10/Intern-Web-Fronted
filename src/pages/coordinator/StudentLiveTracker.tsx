import { useMemo, useRef, useState } from "react";
import {
  MapboxMap,
  type MapboxMapHandle,
  type MapMarker,
  type MapPolygonFeature,
} from "@/components/MapboxMap";
import { useCompanies } from "@/lib/queries/companies";
import { useLatestGeofenceEvents } from "@/lib/queries/geofenceEvents";
import { useLiveInternLocations } from "@/hooks/useLiveInternLocations";
import { useTheme } from "@/context/ThemeContext"; // adjust path as needed
import type { Company } from "@/types";
import { MapPin, X, Building2, User } from "lucide-react";

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

type MatchedArea = {
  name: string;
  address?: string | null;
  type: "company" | "building";
};

const StudentLiveTracker = () => {
  const { data: companies } = useCompanies();
  const { data: geofenceEvents } = useLatestGeofenceEvents();
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

  const companyMarkers: MapMarker[] = useMemo(
    () =>
      approvedCompanies.map((company) => ({
        id: company.id,
        longitude: company.longitude,
        latitude: company.latitude,
        title: company.name,
        color: "danger",
        shape: "pin",
        popupHtml: `<strong>${company.name}</strong>${
          company.address ? `<br/>${company.address}` : ""
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
        <aside className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            <h2 className="flex items-center text-sm font-medium text-[var(--color-ink)]">
              <span className="mr-2 relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              Attendance Timetable
              <span className="ml-1 text-slate-400">
                ({liveLocations.length})
              </span>
            </h2>
          </div>

          {liveLocations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              No interns are currently broadcasting their location.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Student</th>
                  <th className="px-4 py-2 font-medium">Last Seen</th>
                  <th className="px-4 py-2 font-medium text-right">Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {liveLocations.map((loc) => (
                  <tr
                    key={loc.intern_id}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                      selectedInternId === loc.intern_id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => handleSelect(loc)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {loc.intern_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(loc.recorded_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(loc);
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                      >
                        <MapPin className="h-3 w-3" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {(geofenceEvents?.length ?? 0) > 0 && (
            <div className="border-t border-[var(--color-line)] px-4 py-3">
              <h2 className="text-sm font-medium text-[var(--color-ink)]">
                Recent activity{" "}
                <span className="text-slate-400">
                  ({geofenceEvents!.length})
                </span>
              </h2>
              <ul className="mt-2 space-y-1">
                {geofenceEvents!.map((event) => (
                  <li key={event.student_id} className="text-xs text-slate-500">
                    <span
                      className={
                        event.event_type === "exit"
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    >
                      {event.event_type === "exit" ? "⚠️" : "✅"}
                    </span>{" "}
                    {event.student_name} —{" "}
                    {new Date(event.occurred_at).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
            <div className="absolute right-4 top-4 w-72 rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-lg">
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
