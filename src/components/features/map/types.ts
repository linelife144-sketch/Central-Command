export type LngLatTuple = [number, number];

export interface GeofenceOverlay {
  center: LngLatTuple;
  radiusMeters: number;
}
