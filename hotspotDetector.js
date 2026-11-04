const HOTSPOT_MIN_OBSERVATIONS = 5;
const HOTSPOT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const HOTSPOT_RADIUS_METERS = 500;
const EARTH_RADIUS_METERS = 6371000;

function toRadians(value) {
  return value * Math.PI / 180;
}

function haversineDistanceMeters(first, second) {
  const latitudeDelta = toRadians(second.lat - first.lat);
  const longitudeDelta = toRadians(second.lng - first.lng);
  const firstLatitude = toRadians(first.lat);
  const secondLatitude = toRadians(second.lat);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
    Math.cos(secondLatitude) *
    Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

function isValidObservation(observation) {
  const latitude = Number(observation?.location?.lat);
  const longitude = Number(observation?.location?.lng);
  const time = Date.parse(observation?.time);

  return Boolean(
    observation?.id &&
    observation?.cityId &&
    observation?.sourceType &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    Number.isFinite(time)
  );
}

function normalizeObservation(observation) {
  return {
    ...observation,
    latitude: Number(observation.location.lat),
    longitude: Number(observation.location.lng),
    timestamp: Date.parse(observation.time)
  };
}

function groupObservations(observations) {
  const groups = new Map();
  const seenIds = new Set();

  observations
    .filter(isValidObservation)
    .forEach(observation => {
      if (seenIds.has(observation.id)) {
        return;
      }

      seenIds.add(observation.id);
      const normalized = normalizeObservation(observation);
      const key = `${normalized.cityId}:${normalized.sourceType}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(normalized);
    });

  return groups;
}

function calculateCenter(observations) {
  return observations.reduce(
    (center, observation) => ({
      lat: center.lat + observation.latitude / observations.length,
      lng: center.lng + observation.longitude / observations.length
    }),
    { lat: 0, lng: 0 }
  );
}

function detectHotspots(observations) {
  const hotspots = [];

  for (const group of groupObservations(observations).values()) {
    group.sort((first, second) =>
      first.timestamp - second.timestamp ||
      first.id.localeCompare(second.id)
    );

    const remaining = new Set(group.map(observation => observation.id));

    while (remaining.size > 0) {
      const seed = group.find(observation => remaining.has(observation.id));
      const candidates = group.filter(observation => {
        return (
          remaining.has(observation.id) &&
          observation.timestamp - seed.timestamp <= HOTSPOT_WINDOW_MS &&
          haversineDistanceMeters(
            { lat: seed.latitude, lng: seed.longitude },
            { lat: observation.latitude, lng: observation.longitude }
          ) <= HOTSPOT_RADIUS_METERS
        );
      });

      if (candidates.length < HOTSPOT_MIN_OBSERVATIONS) {
        remaining.delete(seed.id);
        continue;
      }

      const center = calculateCenter(candidates);
      const members = candidates.filter(observation =>
        haversineDistanceMeters(
          center,
          { lat: observation.latitude, lng: observation.longitude }
        ) <= HOTSPOT_RADIUS_METERS
      );

      if (members.length < HOTSPOT_MIN_OBSERVATIONS) {
        remaining.delete(seed.id);
        continue;
      }

      members.forEach(observation => remaining.delete(observation.id));

      const firstObserved = Math.min(
        ...members.map(observation => observation.timestamp)
      );
      const lastObserved = Math.max(
        ...members.map(observation => observation.timestamp)
      );

      hotspots.push({
        id: `hotspot-${members[0].cityId}-${members[0].sourceType}-${members[0].id}`,
        cityId: members[0].cityId,
        sourceType: members[0].sourceType,
        latitude: center.lat,
        longitude: center.lng,
        observationCount: members.length,
        observationIds: members.map(observation => observation.id),
        firstObserved: new Date(firstObserved).toISOString(),
        lastObserved: new Date(lastObserved).toISOString(),
        radiusMeters: HOTSPOT_RADIUS_METERS,
        status: 'Potential'
      });
    }
  }

  return hotspots;
}

module.exports = {
  detectHotspots,
  haversineDistanceMeters,
  HOTSPOT_MIN_OBSERVATIONS,
  HOTSPOT_WINDOW_MS,
  HOTSPOT_RADIUS_METERS
};
