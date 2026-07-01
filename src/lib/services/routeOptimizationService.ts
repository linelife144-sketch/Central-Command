export interface RouteStop {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
}

export interface OptimizedRouteResult {
  orderedStops: RouteStop[];
  routeCoordinates: Array<[number, number]>;
  totalDistanceMeters: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(
  pointA: { latitude: number; longitude: number },
  pointB: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6_371_000;
  const dLatitude = toRadians(pointB.latitude - pointA.latitude);
  const dLongitude = toRadians(pointB.longitude - pointA.longitude);
  const latitudeA = toRadians(pointA.latitude);
  const latitudeB = toRadians(pointB.latitude);

  const a = Math.sin(dLatitude / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(dLongitude / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

export function isValidRouteStop(stop: Partial<RouteStop>): stop is RouteStop {
  return typeof stop.id === 'string'
    && stop.id.length > 0
    && typeof stop.latitude === 'number'
    && Number.isFinite(stop.latitude)
    && stop.latitude >= -90
    && stop.latitude <= 90
    && typeof stop.longitude === 'number'
    && Number.isFinite(stop.longitude)
    && stop.longitude >= -180
    && stop.longitude <= 180;
}

export function optimizeRoute(
  stops: RouteStop[],
  startPoint?: { latitude: number; longitude: number },
): OptimizedRouteResult {
  const validStops = stops.filter((stop) => isValidRouteStop(stop));

  if (validStops.length === 0) {
    return {
      orderedStops: [],
      routeCoordinates: [],
      totalDistanceMeters: 0,
    };
  }

  if (validStops.length === 1) {
    return {
      orderedStops: validStops,
      routeCoordinates: [[validStops[0].longitude, validStops[0].latitude]],
      totalDistanceMeters: 0,
    };
  }

  const remainingStops = [...validStops];
  const orderedStops: RouteStop[] = [];
  let currentPoint = startPoint ?? {
    latitude: remainingStops[0].latitude,
    longitude: remainingStops[0].longitude,
  };
  let totalDistanceMeters = 0;

  while (remainingStops.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remainingStops.length; index += 1) {
      const candidate = remainingStops[index];
      const distance = haversineDistanceMeters(currentPoint, candidate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const [nearestStop] = remainingStops.splice(nearestIndex, 1);
    orderedStops.push(nearestStop);

    if (orderedStops.length > 1 || startPoint) {
      totalDistanceMeters += nearestDistance;
    }

    currentPoint = {
      latitude: nearestStop.latitude,
      longitude: nearestStop.longitude,
    };
  }

  return {
    orderedStops,
    routeCoordinates: orderedStops.map((stop) => [stop.longitude, stop.latitude]),
    totalDistanceMeters: Math.round(totalDistanceMeters),
  };
}
