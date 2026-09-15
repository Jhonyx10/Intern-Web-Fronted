import { useEffect, useState } from 'react';
import { echo, type LiveLocationPayload } from '@/lib/echo';

/**
 * Subscribes to one Pusher private channel per company and maintains a
 * last-known live position for every intern currently broadcasting.
 *
 * Channel:  private-company.{companyId}.locations
 * Event:    .location.updated  (Laravel broadcasts with broadcastAs())
 *
 * Each new ping for the same intern overwrites the previous one so the
 * map always shows the *latest* coordinate, not a trail.
 */
export function useLiveInternLocations(companyIds: number[]) {
    // keyed by intern_id → most-recent payload
    const [liveLocations, setLiveLocations] = useState<Map<number, LiveLocationPayload>>(
        () => new Map()
    );

    useEffect(() => {
        if (companyIds.length === 0) return;

        const channelNames = companyIds.map((id) => `company.${id}.locations`);

        for (const channelName of channelNames) {
            echo
                .private(channelName)
                .listen('.location.updated', (payload: LiveLocationPayload) => {
                    setLiveLocations((prev) => {
                        const next = new Map(prev);
                        next.set(payload.intern_id, payload);
                        return next;
                    });
                });
        }

        return () => {
            for (const channelName of channelNames) {
                echo.leave(channelName);
            }
            // Clear stale positions when we stop listening (e.g. page unmount)
            setLiveLocations(new Map());
        };
        // Re-subscribe whenever the set of companies changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyIds.join(',')]);

    return Array.from(liveLocations.values());
}
