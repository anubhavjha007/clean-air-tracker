function validateAction(body) {
  const errors = [];

  if (!body.title || body.title.trim().length < 3) {
    errors.push('Action title is required.');
  }

  if (!body.sector || body.sector.trim().length < 2) {
    errors.push('Sector is required.');
  }

  const validAgencies = [
    'PCB',
    'ULB',
    'Transport Dept',
    'PWD',
    'Other',
    'Shared/Unclear'
  ];

  if (
    body.responsibleAgency &&
    !validAgencies.includes(body.responsibleAgency)
  ) {
    errors.push('Invalid agency.');
  }

  const validRoles = [
    'Planning',
    'Implementing',
    'Enforcing',
    'Monitoring'
  ];

  if (
    body.role &&
    !validRoles.includes(body.role)
  ) {
    errors.push('Invalid role.');
  }

  const validStatuses = [
    'Not Started',
    'In Progress',
    'Done'
  ];

  if (
    body.status &&
    !validStatuses.includes(body.status)
  ) {
    errors.push('Invalid status.');
  }

  if (
    body.budgetINR !== null &&
    body.budgetINR !== undefined &&
    body.budgetINR !== '' &&
    Number(body.budgetINR) < 0
  ) {
    errors.push('Budget cannot be negative.');
  }

  return errors;
}

function validateSourceContribution(city) {
  const inside = Object.values(
    city.sourceContribution || {}
  ).reduce((sum, value) => sum + Number(value || 0), 0);

  const total =
    inside + Number(city.outsideContributionPct || 0);

  return {
    inside,
    outside: Number(city.outsideContributionPct || 0),
    total,
    valid: Math.abs(total - 1) <= 0.03
  };
}

function validateObservation(body) {
  const errors = [];
  const sourceTypes = [
    'traffic',
    'dust',
    'open-burning',
    'industrial-smoke'
  ];
  const intensities = [
    'low',
    'medium',
    'high'
  ];

  if (!body.cityId || typeof body.cityId !== 'string') {
    errors.push('City is required.');
  }

  if (!sourceTypes.includes(body.sourceType)) {
    errors.push('Invalid source type.');
  }

  if (body.latitude === undefined || body.latitude === '' || !Number.isFinite(Number(body.latitude))) {
    errors.push('Latitude is required and must be a number.');
  } else if (Number(body.latitude) < -90 || Number(body.latitude) > 90) {
    errors.push('Latitude must be between -90 and 90.');
  }

  if (body.longitude === undefined || body.longitude === '' || !Number.isFinite(Number(body.longitude))) {
    errors.push('Longitude is required and must be a number.');
  } else if (Number(body.longitude) < -180 || Number(body.longitude) > 180) {
    errors.push('Longitude must be between -180 and 180.');
  }

  if (!body.time || typeof body.time !== 'string') {
    errors.push('Observation time is required.');
  }

  if (!intensities.includes(body.intensity)) {
    errors.push('Invalid intensity.');
  }

  if (body.durationMinutes === undefined || body.durationMinutes === '' || !Number.isFinite(Number(body.durationMinutes))) {
    errors.push('Duration is required and must be a number.');
  } else if (Number(body.durationMinutes) <= 0) {
    errors.push('Duration must be greater than zero.');
  }

  return errors;
}

module.exports = {
  validateAction,
  validateSourceContribution,
  validateObservation
};