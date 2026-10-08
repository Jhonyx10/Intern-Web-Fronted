import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useRef, useEffect } from "react";
import { MapboxMap, type MapboxMapHandle, type MapMarker, type MapPolygonFeature } from "@/components/MapboxMap";
import { useMyCompany } from "@/lib/queries/companies";
import { Building2, MapPin, Phone, Mail, User2, Shield, ShieldOff, ChevronDown, Users } from "lucide-react";
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

    if (company?.latitude && company?.longitude) {
      marks.push({
        id: company.id,
        latitude: company.latitude,
        longitude: company.longitude,
        title: company.name,
        color: 'accent',
        hexColor: '#0b6e4f',
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
  }, [company]);

  const polygons = useMemo<MapPolygonFeature[]>(() => {
    const features: MapPolygonFeature[] = [];

    // Exclude polygon from display if we are currently editing it
    if (!isEditingMainGeofence && company?.geofence_enabled && company?.geofence_polygon) {
      features.push({
        id: `company-${company.id}`,
        name: company.name,
        polygon: company.geofence_polygon,
        color: '#0b6e4f',
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

  if (isLoading) return <div>Loading company...</div>;
  if (error) return <div>Failed to load company.</div>;
  if (!company) return <div>No company assigned yet.</div>;

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

  const handleSaveMainGeofence = async () => {
    if (!company) return;
    await updateCompanyGeofence({
      geofence_polygon: draftPolygon,
      geofence_enabled: !!draftPolygon,
    });
    setIsEditingMainGeofence(false);
    setDraftPolygon(null);
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

  return (
    <motion.div className="space-y-6">
      {/* Top row — details left, map right */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--color-muted)] uppercase mb-2">
            Company
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
            {company.name}
          </h2>
          {company.address && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
              <MapPin size={13} /> {company.address}
            </p>
          )}

          <div className="mt-4 space-y-2.5 border-t border-[var(--color-line)] pt-4">
            {company.contact_person && (
              <div className="flex items-start gap-2.5 text-sm text-[var(--color-ink)]">
                <User2 size={14} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
                <span>{company.contact_person}</span>
              </div>
            )}
            {company.contact_email && (
              <div className="flex items-start gap-2.5 text-sm text-[var(--color-ink)]">
                <Mail size={14} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
                <a href={`mailto:${company.contact_email}`} className="hover:text-[var(--color-accent)] transition">
                  {company.contact_email}
                </a>
              </div>
            )}
            {company.contact_phone && (
              <div className="flex items-start gap-2.5 text-sm text-[var(--color-ink)]">
                <Phone size={14} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
                <a href={`tel:${company.contact_phone}`} className="hover:text-[var(--color-accent)] transition">
                  {company.contact_phone}
                </a>
              </div>
            )}
            {!company.contact_person && !company.contact_email && !company.contact_phone && (
              <p className="text-sm text-[var(--color-muted)]">No contact info available.</p>
            )}
          </div>

          {hasCoords && (
            <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-muted)]">
              <Building2 size={13} />
              <span className="font-mono">
                {company.latitude!.toFixed(5)}, {company.longitude!.toFixed(5)}
              </span>
            </div>
          )}

          <div
            className="mt-4 rounded-xl border border-[var(--color-line)] bg-slate-50/50 p-4 border-l-4"
            style={{ borderLeftColor: '#0b6e4f' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[var(--color-ink)]">Main Geofence</h3>
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${company.geofence_enabled ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'
                  }`}
              >
                {company.geofence_enabled ? (
                  <>
                    <Shield size={12} /> Enabled
                  </>
                ) : (
                  <>
                    <ShieldOff size={12} /> Disabled
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1 text-xs text-[var(--color-muted)]">
              {company.geofence_radius_meters && (
                <p>
                  Radius: <strong>{company.geofence_radius_meters} m</strong>
                </p>
              )}
              <p>
                Polygon: {company.geofence_polygon ? <strong className="text-green-600">Defined</strong> : 'None'}
              </p>
            </div>

            {isEditingMainGeofence ? (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void handleSaveMainGeofence()}
                  disabled={isUpdatingMain}
                  className="flex-1 rounded-md bg-[var(--color-accent)] py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                >
                  {isUpdatingMain ? 'Saving...' : 'Save Geofence'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingMainGeofence(false)
                    setDraftPolygon(null)
                  }}
                  disabled={isUpdatingMain}
                  className="flex-1 rounded-md border border-[var(--color-line)] bg-white py-1.5 text-xs font-medium text-[var(--color-ink)] hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingBuildingId(null);
                  setIsEditingMainGeofence(true);
                }}
                className="mt-3 w-full rounded-md border border-[var(--color-accent)] bg-white py-1.5 text-xs font-medium text-[var(--color-accent)] hover:bg-green-50"
              >
                {company.geofence_polygon ? 'Edit Main Geofence' : 'Add Main Geofence'}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
          <MapboxMap
            ref={mapRef}
            heightClassName="h-[360px]"
            center={mapCenter}
            defaultFlyTo={mapCenter}
            zoom={17}
            fitMarkers={false}
            showCampusMarker={false}
            markers={markers}
            polygons={polygons}
            drawEnabled={editingBuildingId !== null || isEditingMainGeofence || isCreatingBuilding}
            onDrawChange={setDraftPolygon}
          />
        </div>
      </div>

      {/* Bottom row — buildings, full width */}
      {company.buildings && (
        <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
          <div className="border-b border-[var(--color-line)] px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin size={18} className="text-[var(--color-muted)]" />
              Buildings <span className="text-sm font-normal text-[var(--color-muted)]">({company.buildings.length})</span>
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsCreatingBuilding(true);
                  setDraftPolygon(null);
                }}
                disabled={isCreatingBuilding}
                className="rounded-xl border border-[var(--color-accent)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-accent)] transition hover:bg-green-50 disabled:opacity-50"
              >
                Add Building
              </button>
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
              >
                Assign interns
              </button>
            </div>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">

            {/* Create Building Form */}
            {isCreatingBuilding && (
              <div className="rounded-xl border border-[var(--color-accent)] bg-green-50/20 p-4 border-l-4">
                <div className="mb-2">
                  <h4 className="text-sm font-semibold text-[var(--color-ink)]">New Building</h4>
                  <p className="text-xs text-[var(--color-muted)]">Draw a geofence on the map and enter details below.</p>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Building Name"
                    value={newBuildingName}
                    onChange={(e) => setNewBuildingName(e.target.value)}
                    className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Building Code (e.g. BLD1)"
                    value={newBuildingCode}
                    onChange={(e) => setNewBuildingCode(e.target.value)}
                    className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                  <p className="text-xs">
                    Polygon: {draftPolygon ? <strong className="text-green-600">Drawn</strong> : <span className="text-[var(--color-muted)]">None</span>}
                  </p>

                  <div className="mt-3 flex gap-2">
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
                      className="flex-1 rounded-md bg-[var(--color-accent)] py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                    >
                      {isCreating ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingBuilding(false);
                        setNewBuildingName('');
                        setNewBuildingCode('');
                        setDraftPolygon(null);
                      }}
                      disabled={isCreating}
                      className="flex-1 rounded-md border border-[var(--color-line)] bg-white py-1.5 text-xs font-medium text-[var(--color-ink)] hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            {company.buildings.map((b, index) => {
              const assignedInterns = getInternsForBuilding(b.id);
              const isExpanded = expandedBuildingIds.has(b.id);

              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-[var(--color-line)] bg-slate-50/50 p-4 border-l-4"
                  style={{ borderLeftColor: BUILDING_COLORS[index % BUILDING_COLORS.length] }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="truncate pr-2 text-sm font-semibold text-[var(--color-ink)]">
                      {b.name || 'Unnamed Building'}
                    </h4>
                    <div
                      className={`flex items-center gap-1.5 text-xs font-medium ${b.geofence_enabled ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'
                        }`}
                    >
                      {b.geofence_enabled ? (
                        <>
                          <Shield size={12} /> Enabled
                        </>
                      ) : (
                        <>
                          <ShieldOff size={12} /> Disabled
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-[var(--color-muted)]">
                    {b.latitude && b.longitude && (
                      <p className="font-mono">
                        {b.latitude.toFixed(5)}, {b.longitude.toFixed(5)}
                      </p>
                    )}
                    {b.geofence_radius_meters && <p>Radius: {b.geofence_radius_meters} m</p>}
                    <p>
                      Polygon: {b.geofence_polygon ? <strong className="text-green-600">Defined</strong> : 'None'}
                    </p>
                  </div>

                  {editingBuildingId === b.id ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => void handleSaveGeofence(b.id)}
                        disabled={isUpdatingBuilding}
                        className="flex-1 rounded-md bg-[var(--color-accent)] py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                      >
                        {isUpdatingBuilding ? 'Saving...' : 'Save Geofence'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingBuildingId(null)
                          setDraftPolygon(null)
                        }}
                        disabled={isUpdatingBuilding}
                        className="flex-1 rounded-md border border-[var(--color-line)] bg-white py-1.5 text-xs font-medium text-[var(--color-ink)] hover:bg-slate-50 disabled:opacity-50"
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
                      className="mt-3 w-full rounded-md border border-[var(--color-accent)] bg-white py-1.5 text-xs font-medium text-[var(--color-accent)] hover:bg-green-50"
                    >
                      {b.geofence_polygon ? 'Edit Geofence' : 'Add Geofence'}
                    </button>
                  )}

                  {/* Interns toggle */}
                  <button
                    onClick={() => toggleBuildingExpand(b.id)}
                    className="mt-3 flex w-full items-center justify-between rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-ink)] transition hover:border-[var(--color-accent)]"
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
                        <div className="mt-2 space-y-1.5 pt-1">
                          {assignedInterns.length === 0 ? (
                            <p className="py-2 text-center text-xs text-[var(--color-muted)]">
                              No interns assigned yet.
                            </p>
                          ) : (
                            assignedInterns.map((intern) => (
                              <div
                                key={intern.id}
                                className="flex items-center justify-between rounded-lg border border-[var(--color-line)] bg-white px-3 py-2"
                              >
                                <div className="min-w-0">
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