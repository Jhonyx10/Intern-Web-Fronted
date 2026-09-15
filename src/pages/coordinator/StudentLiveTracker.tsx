import { useMemo, useRef } from "react";
import {
  MapboxMap,
  type MapboxMapHandle,
  type MapMarker,
  type MapPolygonFeature,
} from "@/components/MapboxMap";
import { useCompanies } from "@/lib/queries/companies";
import { useLatestGeofenceEvents } from "@/lib/queries/geofenceEvents";
import { useLiveInternLocations } from "@/hooks/useLiveInternLocations";
import type { Company } from "@/types";

type LocatedCompany = Company & { latitude: number; longitude: number };

function hasCoordinates(company: Company): company is LocatedCompany {
  return company.latitude !== null && company.longitude !== null;
}

const StudentLiveTracker = () => {
  const { data: companies } = useCompanies();
  const { data: geofenceEvents, isLoading: isEventsLoading } =
    useLatestGeofenceEvents();
  const mapRef = useRef<MapboxMapHandle>(null);

  const approvedCompanies = useMemo<LocatedCompany[]>(
    () =>
      (companies ?? []).filter(
        (company): company is LocatedCompany =>
          Boolean(company.is_approved) && hasCoordinates(company)
      ),
    [companies]
  );

  const companyIds = useMemo(() => approvedCompanies.map(c => c.id), [approvedCompanies]);
  const liveLocations = useLiveInternLocations(companyIds);

  const companyMarkers: MapMarker[] = approvedCompanies.map((company) => ({
    id: company.id,
    longitude: company.longitude,
    latitude: company.latitude,
    title: company.name,
    color: "danger",
    shape: "pin",
    popupHtml: `<strong>${company.name}</strong>${company.address ? `<br/>${company.address}` : ""
      }`,
  }));

  const studentMarkers: MapMarker[] = useMemo(
    () =>
      (geofenceEvents ?? [])
        .filter((event) => event.latitude !== null && event.longitude !== null)
        .map((event) => ({
          id: `student-${event.student_id}`,
          longitude: event.longitude as number,
          latitude: event.latitude as number,
          title: event.student_name,
          color: event.event_type === "exit" ? "danger" : "success",
          popupHtml: `<strong>${event.student_name}</strong><br/>${event.event_type === "exit"
            ? "⚠️ Left premises"
            : "✅ Entered premises"
            } at ${new Date(event.occurred_at).toLocaleTimeString()}`,
        })),
    [geofenceEvents]
  );

  const liveMarkers: MapMarker[] = useMemo(
    () =>
      liveLocations.map((loc) => ({
        id: `live-${loc.intern_id}`,
        longitude: loc.longitude,
        latitude: loc.latitude,
        title: loc.intern_name,
        color: "primary",
        popupHtml: `<strong>${loc.intern_name}</strong><br/>🔵 Live tracking<br/>Seen: ${new Date(loc.recorded_at).toLocaleTimeString()}`,
      })),
    [liveLocations]
  );

  const markers = useMemo(
    () => [...companyMarkers, ...studentMarkers, ...liveMarkers],
    [companyMarkers, studentMarkers, liveMarkers]
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

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">
          Interns Live Tracker
        </h1>
        <p className="text-sm text-slate-500">
          Interns' live positions and recent geofence activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            <h2 className="flex items-center text-sm font-medium text-[var(--color-ink)]">
              <span className="mr-2 relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              Live tracking
              <span className="ml-1 text-slate-400">({liveLocations.length})</span>
            </h2>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {liveLocations.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-500">
                No interns are currently broadcasting their location.
              </p>
            )}

            {liveLocations.length > 0 && (
              <ul className="divide-y divide-[var(--color-line)]">
                {liveLocations.map((loc) => (
                  <li key={loc.intern_id}>
                    <button
                      type="button"
                      onClick={() => mapRef.current?.flyTo(loc.longitude, loc.latitude, 17)}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-blue-600 transition-colors hover:bg-slate-50"
                    >
                      {loc.intern_name}
                      <span className="block text-xs font-normal text-slate-400">
                        Seen: {new Date(loc.recorded_at).toLocaleTimeString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!isEventsLoading && (geofenceEvents?.length ?? 0) > 0 && (
            <div className="border-t border-[var(--color-line)] px-4 py-3">
              <h2 className="text-sm font-medium text-[var(--color-ink)]">
                Recent intern activity{" "}
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

        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
          <MapboxMap
            ref={mapRef}
            markers={markers}
            polygons={polygons}
            fitMarkers
            heightClassName="h-[560px]"
          />
        </div>
      </div>
    </section>
  );
};

export default StudentLiveTracker;