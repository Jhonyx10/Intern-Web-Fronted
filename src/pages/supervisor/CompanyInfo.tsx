import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useRef, useEffect } from "react";
import { MapboxMap, type MapboxMapHandle, type MapMarker, type MapPolygonFeature } from "@/components/MapboxMap";
import { useMyCompany } from "@/lib/queries/companies";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User2,
  Shield,
  ShieldOff,
  ChevronDown,
  Users,
  Plus,
  Pencil,
  Crosshair,
  Hexagon,
  UserPlus,
  Info,
  Check,
  X,
} from "lucide-react";
import {
  useSupervisorInterns,
  useAssignInternsToBuilding,
  useUpdateBuilding,
  useUpdateCompanyGeofence,
  useCreateBuilding,
} from "@/lib/queries/supervisor";
import { AssignInternsModal } from "@/components/modal/AssignInternsModal";
import type { GeofencePolygon } from "@/types";

const BUILDING_COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];
const MAIN_COLOR = '#0b6e4f';

const panel =
  "rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]";

const inputClass =
  "w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20";

const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const outlineBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const accentOutlineBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-accent)]/40 bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/5 hover:border-[var(--color-accent)]";

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${enabled
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
        : 'bg-slate-100 text-slate-500 ring-slate-300/60'
        }`}
    >
      {enabled ? <Shield size={11} /> : <ShieldOff size={11} />}
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  );
}

function MiniStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'good';
}) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-[var(--color-line)]">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums ${tone === 'good' ? 'text-emerald-600' : 'text-[var(--color-ink)]'
          }`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className={`${panel} flex items-center gap-3.5 px-5 py-4`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-muted)]">{label}</p>
        <p className="text-xl font-bold leading-tight tabular-nums text-[var(--color-ink)]">{value}</p>
        {hint && <p className="truncate text-[11px] text-[var(--color-muted)]">{hint}</p>}
      </div>
    </div>
  );
}

function ContactRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm text-[var(--color-ink)]">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[var(--color-muted)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1 self-center break-words">{children}</div>
    </div>
  );
}

const CompanyInfo = () => {
  const { data: company, isLoading, error } = useMyCompany();
  const { data: interns } = useSupervisorInterns();
  const { mutateAsync: assignToBuilding, isPending: isAssigning } = useAssignInternsToBuilding();
  const { mutateAsync: updateBuilding, isPending: isUpdatingBuilding } = useUpdateBuilding();
  const { mutateAsync: updateCompanyGeofence, isPending: isUpdatingMain } = useUpdateCompanyGeofence();
  const { mutateAsync: createBuilding, isPending: isCreating } = useCreateBuilding();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [expandedBuildingIds, setExpandedBuildingIds] = useState<Set<number>>(new Set());
  const [editingBuildingId, setEditingBuildingId] = useState<number | null>(null);
  const [isEditingMainGeofence, setIsEditingMainGeofence] = useState(false);
  const [isCreatingBuilding, setIsCreatingBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingCode, setNewBuildingCode] = useState('');
  const [draftPolygon, setDraftPolygon] = useState<GeofencePolygon | null>(null);
  // New center point picked on the map (null = unchanged)
  const [draftCenter, setDraftCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [isPickingCenter, setIsPickingCenter] = useState(false);
  const mapRef = useRef<MapboxMapHandle>(null);

  useEffect(() => {
    if (editingBuildingId) {
      const activeBuilding = company?.buildings?.find(b => b.id === editingBuildingId);
      if (activeBuilding?.geofence_polygon && activeBuilding.geofence_polygon.type === 'Polygon') {
        const poly = activeBuilding.geofence_polygon as GeofencePolygon;
        setDraftPolygon(poly);
        const timer = setTimeout(() => {
          mapRef.current?.loadPolygon(poly);
        }, 800);
        return () => clearTimeout(timer);
      }
    } else if (isEditingMainGeofence && company) {
      if (company.geofence_polygon && company.geofence_polygon.type === 'Polygon') {
        const poly = company.geofence_polygon as GeofencePolygon;
        setDraftPolygon(poly);
        const timer = setTimeout(() => {
          mapRef.current?.loadPolygon(poly);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [editingBuildingId, isEditingMainGeofence, company]);

  const markers = useMemo<MapMarker[]>(() => {
    const marks: MapMarker[] = [];

    // While editing the main geofence, the marker follows the picked center point
    const useDraft = isEditingMainGeofence && draftCenter !== null;
    const mainLat = useDraft ? draftCenter!.lat : company?.latitude;
    const mainLng = useDraft ? draftCenter!.lng : company?.longitude;

    if (company && mainLat && mainLng) {
      marks.push({
        id: company.id,
        latitude: mainLat,
        longitude: mainLng,
        title: company.name,
        color: 'accent',
        hexColor: MAIN_COLOR,
        popupHtml: `<strong>${company.name}</strong><br/>${company.address ?? 'Main HQ'}`,
      });
    }

    company?.buildings?.forEach((b, index) => {
      if (b.latitude && b.longitude) {
        marks.push({
          id: `building-marker-${b.id}`,
          latitude: b.latitude,
          longitude: b.longitude,
          title: b.name || 'Unnamed Building',
          color: 'accent',
          hexColor: BUILDING_COLORS[index % BUILDING_COLORS.length],
          popupHtml: `<strong>${b.name || 'Unnamed Building'}</strong>`,
        });
      }
    });

    return marks;
  }, [company, isEditingMainGeofence, draftCenter]);

  const polygons = useMemo<MapPolygonFeature[]>(() => {
    const features: MapPolygonFeature[] = [];

    // Exclude polygon from display if we are currently editing it
    if (!isEditingMainGeofence && company?.geofence_enabled && company?.geofence_polygon) {
      features.push({
        id: `company-${company.id}`,
        name: company.name,
        polygon: company.geofence_polygon,
        color: MAIN_COLOR,
      });
    }

    company?.buildings?.forEach((b, index) => {
      // Exclude polygon from display if we are currently editing it (MapboxDraw will show the active one)
      if (b.id !== editingBuildingId && b.geofence_enabled && b.geofence_polygon?.type === 'Polygon') {
        features.push({
          id: `building-${b.id}`,
          name: b.name || 'Unnamed Building',
          polygon: b.geofence_polygon,
          color: BUILDING_COLORS[index % BUILDING_COLORS.length],
        });
      }
    });

    return features;
  }, [company, editingBuildingId, isEditingMainGeofence]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[84px] rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="h-[420px] rounded-2xl bg-slate-100" />
          <div className="h-[420px] rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${panel} p-8 text-center text-sm text-red-600`}>Failed to load company.</div>
    );
  }
  if (!company) {
    return (
      <div className={`${panel} p-8 text-center text-sm text-[var(--color-muted)]`}>
        No company assigned yet.
      </div>
    );
  }

  const hasCoords = company.latitude != null && company.longitude != null;

  const getAssignedIds = (buildingId: number): number[] =>
    (interns ?? [])
      .filter((intern) => intern.building_id === buildingId)
      .map((intern) => intern.id);

  const getInternsForBuilding = (buildingId: number) =>
    (interns ?? []).filter((intern) => intern.building_id === buildingId);

  const toggleBuildingExpand = (buildingId: number) => {
    setExpandedBuildingIds((prev) => {
      const next = new Set(prev);
      if (next.has(buildingId)) {
        next.delete(buildingId);
      } else {
        next.add(buildingId);
      }
      return next;
    });
  };

  const mapCenter = hasCoords ? [company.longitude!, company.latitude!] as [number, number] : undefined;

  const resetMainEditing = () => {
    setIsEditingMainGeofence(false);
    setIsPickingCenter(false);
    setDraftCenter(null);
    setDraftPolygon(null);
  };

  const handleSaveMainGeofence = async () => {
    if (!company) return;
    await updateCompanyGeofence({
      geofence_polygon: draftPolygon,
      geofence_enabled: !!draftPolygon,
      ...(draftCenter ? { latitude: draftCenter.lat, longitude: draftCenter.lng } : {}),
    });
    resetMainEditing();
  };

  const handleSaveGeofence = async (buildingId: number) => {
    if (!company) return;
    await updateBuilding({
      companyId: company.id,
      buildingId,
      input: {
        geofence_polygon: draftPolygon,
        geofence_enabled: !!draftPolygon,
      },
    });
    setEditingBuildingId(null);
    setDraftPolygon(null);
  };

  const buildings = company.buildings ?? [];
  const assignedInternCount = (interns ?? []).filter((i) => i.building_id != null).length;
  const activeGeofences =
    (company.geofence_enabled ? 1 : 0) + buildings.filter((b) => b.geofence_enabled).length;
  const totalGeofenceSlots = 1 + buildings.length;

  // What the map is currently being used for (drives the banner + highlight ring)
  const editingBuilding = buildings.find((b) => b.id === editingBuildingId);
  const mapBanner: string | null = isEditingMainGeofence
    ? isPickingCenter
      ? 'Click anywhere on the map to place the center point.'
      : 'Editing main geofence. Draw or adjust the polygon on the map.'
    : editingBuildingId !== null
      ? `Editing ${editingBuilding?.name || 'building'} geofence. Draw or adjust the polygon on the map.`
      : isCreatingBuilding
        ? 'Draw the new building’s boundary on the map, then fill in the details below.'
        : null;

  const resetCreateForm = () => {
    setIsCreatingBuilding(false);
    setNewBuildingName('');
    setNewBuildingCode('');
    setDraftPolygon(null);
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Summary strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile
          icon={<Building2 size={18} />}
          label="Buildings"
          value={buildings.length}
          hint={buildings.length === 0 ? 'None added yet' : 'On this campus'}
        />
        <SummaryTile
          icon={<Users size={18} />}
          label="Interns assigned"
          value={assignedInternCount}
          hint={`of ${(interns ?? []).length} total`}
        />
        <SummaryTile
          icon={<Shield size={18} />}
          label="Active geofences"
          value={`${activeGeofences} / ${totalGeofenceSlots}`}
          hint={activeGeofences === 0 ? 'Attendance isn’t location-checked' : 'Location-checked attendance'}
        />
      </div>

      {/* Top row: details left, map right */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className={`${panel} flex flex-col p-5`}>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Company
              </p>
              <h2 className="text-lg font-semibold leading-snug tracking-tight text-[var(--color-ink)]">
                {company.name}
              </h2>
              {company.address && (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-[var(--color-muted)]">
                  <MapPin size={13} className="mt-0.5 shrink-0" /> {company.address}
                </p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="mt-5 space-y-3 border-t border-[var(--color-line)] pt-5">
            {company.contact_person && (
              <ContactRow icon={<User2 size={14} />}>{company.contact_person}</ContactRow>
            )}
            {company.contact_email && (
              <ContactRow icon={<Mail size={14} />}>
                <a href={`mailto:${company.contact_email}`} className="transition hover:text-[var(--color-accent)]">
                  {company.contact_email}
                </a>
              </ContactRow>
            )}
            {company.contact_phone && (
              <ContactRow icon={<Phone size={14} />}>
                <a href={`tel:${company.contact_phone}`} className="transition hover:text-[var(--color-accent)]">
                  {company.contact_phone}
                </a>
              </ContactRow>
            )}
            {!company.contact_person && !company.contact_email && !company.contact_phone && (
              <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-[var(--color-muted)]">
                No contact info available.
              </p>
            )}
            {hasCoords && (
              <ContactRow icon={<Crosshair size={14} />}>
                <span className="font-mono text-xs text-[var(--color-muted)]">
                  {company.latitude!.toFixed(5)}, {company.longitude!.toFixed(5)}
                </span>
              </ContactRow>
            )}
          </div>

          {/* Main geofence */}
          <div
            className={`mt-5 rounded-xl border bg-slate-50/60 p-4 transition ${isEditingMainGeofence
              ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/15'
              : 'border-[var(--color-line)]'
              }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MAIN_COLOR }} />
                Main Geofence
              </h3>
              <StatusPill enabled={!!company.geofence_enabled} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniStat
                label="Radius"
                value={company.geofence_radius_meters ? `${company.geofence_radius_meters} m` : '—'}
              />
              <MiniStat
                label="Polygon"
                value={company.geofence_polygon ? 'Defined' : 'None'}
                tone={company.geofence_polygon ? 'good' : 'default'}
              />
            </div>

            {isEditingMainGeofence ? (
              <div className="mt-4 space-y-3">
                <ol className="space-y-1.5 text-[11px] text-[var(--color-muted)]">
                  <li className="flex gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[10px] font-bold text-[var(--color-accent)]">1</span>
                    Draw or adjust the polygon on the map.
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[10px] font-bold text-[var(--color-accent)]">2</span>
                    Optionally move the center point.
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[10px] font-bold text-[var(--color-accent)]">3</span>
                    Save your changes.
                  </li>
                </ol>

                {/* Center point: pick it by clicking the map */}
                <div>
                  <button
                    type="button"
                    onClick={() => setIsPickingCenter((p) => !p)}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition ${isPickingCenter
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                      : 'border-[var(--color-accent)]/40 bg-white text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5'
                      }`}
                  >
                    {isPickingCenter ? <Check size={13} /> : <Crosshair size={13} />}
                    {isPickingCenter ? 'Done placing center' : 'Edit center location'}
                  </button>

                  {!isPickingCenter && draftCenter && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px]">
                      <span className="font-medium text-emerald-700">New center set. Save to apply.</span>
                      <button
                        type="button"
                        onClick={() => setDraftCenter(null)}
                        className="font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => void handleSaveMainGeofence()}
                    disabled={isUpdatingMain}
                    className={`${primaryBtn} flex-1`}
                  >
                    {isUpdatingMain ? 'Saving...' : 'Save Geofence'}
                  </button>
                  <button
                    onClick={resetMainEditing}
                    disabled={isUpdatingMain}
                    className={`${outlineBtn} flex-1`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingBuildingId(null);
                  setDraftCenter(null);
                  setIsPickingCenter(false);
                  setIsEditingMainGeofence(true);
                }}
                className={`${accentOutlineBtn} mt-4 w-full`}
              >
                <Pencil size={13} />
                {company.geofence_polygon ? 'Edit Main Geofence' : 'Add Main Geofence'}
              </button>
            )}
          </div>
        </div>

        {/* Map */}
        <div className={`${panel} flex flex-col overflow-hidden`}>
          <div className="relative">
            <MapboxMap
              ref={mapRef}
              heightClassName="h-[420px] lg:h-full lg:min-h-[420px]"
              center={mapCenter}
              defaultFlyTo={mapCenter}
              zoom={17}
              fitMarkers={false}
              showCampusMarker={false}
              markers={markers}
              polygons={polygons}
              drawEnabled={editingBuildingId !== null || isEditingMainGeofence || isCreatingBuilding}
              onDrawChange={setDraftPolygon}
              pickPointMode={isPickingCenter}
              onMapClick={
                isPickingCenter
                  ? (lng, lat) => setDraftCenter({ lat, lng })
                  : undefined
              }
            />

            {/* Editing hint (doesn't block map interaction) */}
            <AnimatePresence>
              {mapBanner && (
                <motion.div
                  key="map-banner"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-14"
                >
                  <div className="flex max-w-full items-center gap-2 rounded-full bg-slate-900/85 px-3.5 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
                    <Info size={13} className="shrink-0 text-emerald-300" />
                    <span className="truncate">{mapBanner}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--color-line)] bg-slate-50/60 px-4 py-2.5 text-[11px] text-[var(--color-muted)]">
            <span className="flex items-center gap-1.5 font-medium text-[var(--color-ink)]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MAIN_COLOR }} />
              Main
            </span>
            {buildings.map((b, index) => (
              <span key={b.id} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: BUILDING_COLORS[index % BUILDING_COLORS.length] }}
                />
                {b.name || 'Unnamed Building'}
              </span>
            ))}
            {buildings.length === 0 && <span>Buildings you add will appear here.</span>}
          </div>
        </div>
      </div>

      {/* Bottom row: buildings, full width */}
      {company.buildings && (
        <div className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-6 py-4">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
                <MapPin size={17} className="text-[var(--color-muted)]" />
                Buildings
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-[var(--color-muted)]">
                  {buildings.length}
                </span>
              </h3>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                Give each building its own geofence and assign interns to it.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsCreatingBuilding(true);
                  setDraftPolygon(null);
                }}
                disabled={isCreatingBuilding}
                className={`${accentOutlineBtn} px-4 disabled:opacity-50`}
              >
                <Plus size={14} /> Add Building
              </button>
              <button onClick={() => setIsAssignModalOpen(true)} className={`${primaryBtn} px-4`}>
                <UserPlus size={14} /> Assign interns
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Create Building Form */}
            <AnimatePresence initial={false}>
              {isCreatingBuilding && (
                <motion.div
                  key="create-form"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent)]/[0.04] p-5 ring-2 ring-[var(--color-accent)]/10 md:col-span-2 lg:col-span-3"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-ink)]">New building</h4>
                      <p className="text-xs text-[var(--color-muted)]">
                        Draw the boundary on the map above, then enter the details.
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${draftPolygon
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                        : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                        }`}
                    >
                      <Hexagon size={11} />
                      {draftPolygon ? 'Polygon drawn' : 'No polygon yet'}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
                        Building name
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. Main Office"
                        value={newBuildingName}
                        onChange={(e) => setNewBuildingName(e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
                        Building code
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. BLD1"
                        value={newBuildingCode}
                        onChange={(e) => setNewBuildingCode(e.target.value)}
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    <button onClick={resetCreateForm} disabled={isCreating} className={outlineBtn}>
                      <X size={13} /> Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!company) return;
                        await createBuilding({
                          companyId: company.id,
                          input: {
                            name: newBuildingName,
                            code: newBuildingCode,
                            geofence_polygon: draftPolygon,
                            geofence_enabled: !!draftPolygon
                          }
                        });
                        setIsCreatingBuilding(false);
                        setNewBuildingName('');
                        setNewBuildingCode('');
                        setDraftPolygon(null);
                      }}
                      disabled={isCreating || !newBuildingName || !newBuildingCode}
                      className={primaryBtn}
                    >
                      <Check size={13} />
                      {isCreating ? 'Saving...' : 'Save building'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {buildings.length === 0 && !isCreatingBuilding && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] bg-slate-50/50 px-6 py-12 text-center md:col-span-2 lg:col-span-3">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-inset ring-[var(--color-line)]">
                  <Building2 size={22} />
                </div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">No buildings yet</p>
                <p className="mt-1 max-w-sm text-xs text-[var(--color-muted)]">
                  Add a building to give it its own geofence, then assign interns to the place
                  they report to.
                </p>
                <button
                  onClick={() => {
                    setIsCreatingBuilding(true);
                    setDraftPolygon(null);
                  }}
                  className={`${primaryBtn} mt-4 px-4`}
                >
                  <Plus size={14} /> Add your first building
                </button>
              </div>
            )}

            {company.buildings.map((b, index) => {
              const assignedInterns = getInternsForBuilding(b.id);
              const isExpanded = expandedBuildingIds.has(b.id);
              const color = BUILDING_COLORS[index % BUILDING_COLORS.length];
              const isEditing = editingBuildingId === b.id;

              return (
                <div
                  key={b.id}
                  className={`rounded-xl border bg-white p-4 transition ${isEditing
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/15'
                    : 'border-[var(--color-line)] hover:shadow-[var(--shadow-soft)]'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${color}1F`, color }}
                      >
                        <Building2 size={15} />
                      </span>
                      <h4 className="truncate text-sm font-semibold text-[var(--color-ink)]">
                        {b.name || 'Unnamed Building'}
                      </h4>
                    </div>
                    <StatusPill enabled={!!b.geofence_enabled} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MiniStat
                      label="Radius"
                      value={b.geofence_radius_meters ? `${b.geofence_radius_meters} m` : '—'}
                    />
                    <MiniStat
                      label="Polygon"
                      value={b.geofence_polygon ? 'Defined' : 'None'}
                      tone={b.geofence_polygon ? 'good' : 'default'}
                    />
                  </div>
                  {b.latitude && b.longitude && (
                    <p className="mt-2 font-mono text-[11px] text-[var(--color-muted)]">
                      {b.latitude.toFixed(5)}, {b.longitude.toFixed(5)}
                    </p>
                  )}

                  {isEditing ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => void handleSaveGeofence(b.id)}
                        disabled={isUpdatingBuilding}
                        className={`${primaryBtn} flex-1`}
                      >
                        {isUpdatingBuilding ? 'Saving...' : 'Save Geofence'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingBuildingId(null)
                          setDraftPolygon(null)
                        }}
                        disabled={isUpdatingBuilding}
                        className={`${outlineBtn} flex-1`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsEditingMainGeofence(false);
                        setEditingBuildingId(b.id);
                      }}
                      className={`${accentOutlineBtn} mt-3 w-full`}
                    >
                      <Pencil size={13} />
                      {b.geofence_polygon ? 'Edit Geofence' : 'Add Geofence'}
                    </button>
                  )}

                  {/* Interns toggle */}
                  <button
                    onClick={() => toggleBuildingExpand(b.id)}
                    aria-expanded={isExpanded}
                    className="mt-2 flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-[var(--color-ink)] transition hover:bg-slate-100"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users size={13} className="text-[var(--color-muted)]" />
                      {assignedInterns.length} intern{assignedInterns.length === 1 ? '' : 's'}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-[var(--color-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pt-1">
                          {assignedInterns.length === 0 ? (
                            <p className="rounded-lg bg-slate-50 py-3 text-center text-xs text-[var(--color-muted)]">
                              No interns assigned yet.
                            </p>
                          ) : (
                            assignedInterns.map((intern) => (
                              <div
                                key={intern.id}
                                className="flex items-center gap-2.5 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-2"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                  {intern.first_name?.[0]}
                                  {intern.last_name?.[0]}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-[var(--color-ink)]">
                                    {intern.last_name}, {intern.first_name}
                                  </p>
                                  <p className="text-[11px] text-[var(--color-muted)]">{intern.student_number}</p>
                                </div>
                                {intern.section?.name && (
                                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
                                    {intern.section.name}
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AssignInternsModal
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        isLoading={isAssigning}
        buildings={(company.buildings ?? []).map((b) => ({ id: b.id, name: b.name || 'Unnamed Building' }))}
        interns={interns ?? []}
        getAssignedIds={getAssignedIds}
        onAssign={async (buildingId, studentIds, dateStart, dateEnd) => {
          await assignToBuilding({ buildingId, studentIds, dateStart, dateEnd });
          setIsAssignModalOpen(false);
        }}
      />
    </motion.div>
  );
};

export default CompanyInfo;