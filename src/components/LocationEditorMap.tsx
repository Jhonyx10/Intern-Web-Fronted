import { useMemo, useRef, useState } from 'react'
import { MapPin, Pentagon, Trash2 } from 'lucide-react'
import { MapboxMap, type MapboxMapHandle, type MapMarker } from '@/components/MapboxMap'

const MAIN_COLOR = '#0b6e4f'

export type LocationEdit = {
    latitude: number | null
    longitude: number | null
    polygon: GeoJSON.Polygon | null
}

type Mode = 'pin' | 'area'

type Props = {
    initialPoint: { latitude: number; longitude: number } | null
    initialPolygon: GeoJSON.Polygon | null
    onChange: (value: LocationEdit) => void
    heightClassName?: string
}

/**
 * Editable version of the company map: click to place the pin, draw or reshape
 * the geofence area. Built on MapboxMap (drawEnabled + pickPointMode).
 * Mount it only while editing: MapboxMap creates its draw control on mount.
 */
export function LocationEditorMap({
    initialPoint,
    initialPolygon,
    onChange,
    heightClassName = 'h-[460px]',
}: Props) {
    const mapRef = useRef<MapboxMapHandle>(null)
    const initialCenter = useRef<[number, number] | undefined>(
        initialPoint ? [initialPoint.longitude, initialPoint.latitude] : undefined
    )
    const draft = useRef<LocationEdit>({
        latitude: initialPoint?.latitude ?? null,
        longitude: initialPoint?.longitude ?? null,
        polygon: initialPolygon,
    })

    const [point, setPoint] = useState(initialPoint)
    const [hasArea, setHasArea] = useState(Boolean(initialPolygon))
    const [mode, setMode] = useState<Mode>('pin')

    function commit(patch: Partial<LocationEdit>) {
        draft.current = { ...draft.current, ...patch }
        onChange(draft.current)
    }

    const markers = useMemo<MapMarker[]>(
        () =>
            point
                ? [
                    {
                        id: 'edit-pin',
                        latitude: point.latitude,
                        longitude: point.longitude,
                        title: 'Company location',
                        color: 'accent',
                        shape: 'pin',
                        hexColor: MAIN_COLOR,
                    },
                ]
                : [],
        [point]
    )

    function handleLoad() {
        if (!initialPolygon) return
        mapRef.current?.loadPolygon(initialPolygon)
        const pts = (initialPolygon.coordinates[0] ?? []).map((c) => [c[0], c[1]] as [number, number])
        if (initialPoint) pts.push([initialPoint.longitude, initialPoint.latitude])
        mapRef.current?.fitBounds(pts, 19)
    }

    function choosePin() {
        setMode('pin')
        mapRef.current?.setSimpleSelect()
    }

    function chooseArea() {
        setMode('area')
        if (hasArea) mapRef.current?.setSimpleSelect()
        else mapRef.current?.startDrawPolygon()
    }

    function removeArea() {
        mapRef.current?.clearDraw()
        setMode('pin')
    }

    const hint =
        mode === 'pin'
            ? 'Click the map to set the company location.'
            : hasArea
                ? 'Click the area, then drag its corners to reshape it. Drag a midpoint to add a corner.'
                : 'Click to add corners. Double-click the last corner to finish.'

    const btn = (active: boolean) =>
        `inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${active
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
            : 'border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:text-[var(--color-accent)]'
        }`

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] bg-slate-50/50 px-4 py-2.5">
                <button type="button" onClick={choosePin} className={btn(mode === 'pin')}>
                    <MapPin size={14} /> Move pin
                </button>
                <button type="button" onClick={chooseArea} className={btn(mode === 'area')}>
                    <Pentagon size={14} /> {hasArea ? 'Edit area' : 'Draw area'}
                </button>
                {hasArea && (
                    <button
                        type="button"
                        onClick={removeArea}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                        <Trash2 size={14} /> Remove area
                    </button>
                )}
                <p className="ml-auto text-xs text-[var(--color-muted)]">{hint}</p>
            </div>

            <MapboxMap
                ref={mapRef}
                heightClassName={heightClassName}
                center={initialCenter.current}
                zoom={initialPoint ? 17 : 14}
                markers={markers}
                fitMarkers={false}
                fitRouteBounds={false}
                drawEnabled
                pickPointMode={mode === 'pin'}
                onMapClick={(longitude, latitude) => {
                    setPoint({ latitude, longitude })
                    commit({ latitude, longitude })
                }}
                onDrawChange={(polygon) => {
                    setHasArea(Boolean(polygon))
                    commit({ polygon })
                }}
                onLoad={handleLoad}
            />
        </div>
    )
}