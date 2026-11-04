// seed.js
// Source-contribution numbers (transport/residential/industries/dust/waste/dgSets/brickKilns/seaSalt/outside)
// are pulled directly from Table A3 of the CEEW-UrbanEmissions report
// "How Robust are Urban India's Clean Air Plans? An Assessment of 102 Cities" (2020),
// which itself compiles the ApNA city-programme source-apportionment data.
// These are REAL figures. Fractions sum to ~1 (transport+residential+industries+dust+waste+
// dgSets+brickKilns+seaSalt = "within-boundary", outside = contribution from outside the city).
//
// planStatus fields (hasLegalMandate, hasBudget, sourceDataInPlan, isDuplicatePlan) are
// ILLUSTRATIVE demo data, calibrated to match the report's aggregate findings (e.g. "only
// 9/102 plans had budgets", "UP's 15 cities share one identical plan", "only 25/102 plans had
// source data actually integrated"). They are NOT scraped per-city from the real CPCB plans —
// swap these for real data (e.g. by scraping https://cpcb.nic.in/Actionplan/) before using this
// for anything other than a demo. Actions are seeded illustratively for the same reason.

function action(id, title, sector, responsibleAgency, role, status, budgetINR) {
  return { id, title, sector, responsibleAgency, role, status, budgetINR: budgetINR || null };
}

const cities = [
  {
    id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', waqiStation: 'mumbai', year: 2018,
    sourceContribution: { transport: 0.164, residential: 0.032, industries: 0.15, dust: 0.126, waste: 0.038, dgSets: 0.019, brickKilns: 0.023, seaSalt: 0.121 },
    outsideContributionPct: 0.326,
    planStatus: { hasLegalMandate: false, hasBudget: true, sourceDataInPlan: false, isDuplicatePlan: false },
    actions: [
      action('mum-1', 'Deploy mechanical street sweepers on arterial roads', 'Dust', 'ULB', 'Implementing', 'In Progress', 70000000),
      action('mum-2', 'Install CAAQMS across the city', 'Monitoring', 'PCB', 'Monitoring', 'In Progress', 150000000),
      action('mum-3', 'C&D waste screening and covering enforcement', 'Construction', 'Shared/Unclear', null, 'Not Started', null),
      action('mum-4', 'Retrofit BEST buses with particulate filters', 'Transport', 'Transport Dept', 'Implementing', 'Not Started', 400000000),
    ],
  },
  {
    id: 'pune', name: 'Pune', state: 'Maharashtra', waqiStation: 'pune', year: 2015,
    sourceContribution: { transport: 0.241, residential: 0.059, industries: 0.098, dust: 0.234, waste: 0.065, dgSets: 0.029, brickKilns: 0.027 },
    outsideContributionPct: 0.248,
    planStatus: { hasLegalMandate: false, hasBudget: true, sourceDataInPlan: false, isDuplicatePlan: false },
    actions: [
      action('pun-1', 'Widen cycling lane network', 'Transport', 'ULB', 'Implementing', 'In Progress', 30000000),
      action('pun-2', 'Zig-zag technology mandate for brick kilns', 'Industry', 'PCB', 'Enforcing', 'Not Started', null),
      action('pun-3', 'Door-to-door segregated waste collection', 'Waste', 'ULB', 'Implementing', 'Done', 20000000),
    ],
  },
  {
    id: 'nagpur', name: 'Nagpur', state: 'Maharashtra', waqiStation: 'nagpur', year: 2015,
    sourceContribution: { transport: 0.172, residential: 0.068, industries: 0.267, dust: 0.11, waste: 0.116, dgSets: 0.019, brickKilns: 0.033 },
    outsideContributionPct: 0.215,
    planStatus: { hasLegalMandate: false, hasBudget: true, sourceDataInPlan: false, isDuplicatePlan: false },
    actions: [
      action('nag-1', 'OCEMS installation in gross-polluting industries', 'Industry', 'PCB', 'Monitoring', 'In Progress', 20000000),
      action('nag-2', 'Shift polluting industries to conforming zones', 'Industry', 'Shared/Unclear', null, 'Not Started', null),
      action('nag-3', 'Extensive drive against open waste burning', 'Waste', 'ULB', 'Enforcing', 'Not Started', null),
    ],
  },
  {
    id: 'kanpur', name: 'Kanpur', state: 'Uttar Pradesh', waqiStation: 'kanpur', year: 2015,
    sourceContribution: { transport: 0.138, residential: 0.339, industries: 0.065, dust: 0.09, waste: 0.089, dgSets: 0.041, brickKilns: 0.012 },
    outsideContributionPct: 0.225,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: false, isDuplicatePlan: true },
    actions: [
      action('kan-1', 'Maximise LPG/PNG coverage for domestic cooking', 'Residential', 'Shared/Unclear', null, 'Not Started', null),
      action('kan-2', 'Widening roads', 'Transport', 'PWD', null, 'Not Started', null),
      action('kan-3', 'Remote-sensor PUC systems', 'Transport', 'Transport Dept', 'Monitoring', 'Not Started', null),
    ],
  },
  {
    id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', waqiStation: 'lucknow', year: 2018,
    sourceContribution: { transport: 0.13, residential: 0.243, industries: 0.043, dust: 0.139, waste: 0.075, dgSets: 0.033, brickKilns: 0.035 },
    outsideContributionPct: 0.301,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: false, isDuplicatePlan: true },
    actions: [
      action('luc-1', 'Maximise LPG/PNG coverage for domestic cooking', 'Residential', 'Shared/Unclear', null, 'Not Started', null),
      action('luc-2', 'Widening roads', 'Transport', 'PWD', null, 'Not Started', null),
      action('luc-3', 'Remote-sensor PUC systems', 'Transport', 'Transport Dept', 'Monitoring', 'Not Started', null),
    ],
  },
  {
    id: 'agra', name: 'Agra', state: 'Uttar Pradesh', waqiStation: 'agra', year: 2015,
    sourceContribution: { transport: 0.14, residential: 0.238, industries: 0.003, dust: 0.107, waste: 0.124, dgSets: 0.028, brickKilns: 0 },
    outsideContributionPct: 0.36,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: false, isDuplicatePlan: true },
    actions: [
      action('agr-1', 'Maximise LPG/PNG coverage for domestic cooking', 'Residential', 'Shared/Unclear', null, 'Not Started', null),
      action('agr-2', 'Widening roads', 'Transport', 'PWD', null, 'Not Started', null),
    ],
  },
  {
    id: 'varanasi', name: 'Varanasi', state: 'Uttar Pradesh', waqiStation: 'varanasi', year: 2015,
    sourceContribution: { transport: 0.135, residential: 0.209, industries: 0.003, dust: 0.083, waste: 0.162, dgSets: 0.034, brickKilns: 0.062 },
    outsideContributionPct: 0.313,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: false, isDuplicatePlan: true },
    actions: [
      action('var-1', 'Maximise LPG/PNG coverage for domestic cooking', 'Residential', 'Shared/Unclear', null, 'Not Started', null),
      action('var-2', 'Ghat and riverfront dust control', 'Dust', 'ULB', 'Implementing', 'Not Started', null),
    ],
  },
  {
    id: 'amritsar', name: 'Amritsar', state: 'Punjab', waqiStation: 'amritsar', year: 2015,
    sourceContribution: { transport: 0.105, residential: 0.107, industries: 0.073, dust: 0.071, waste: 0.062, dgSets: 0.032, brickKilns: 0.022 },
    outsideContributionPct: 0.528,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: false, isDuplicatePlan: false },
    actions: [
      action('amr-1', 'Crop-residue burning control (with state agri dept)', 'Regional Coordination', 'Shared/Unclear', null, 'Not Started', null),
      action('amr-2', 'Industrial emission monitoring', 'Industry', 'PCB', 'Monitoring', 'In Progress', null),
    ],
  },
  {
    id: 'ludhiana', name: 'Ludhiana', state: 'Punjab', waqiStation: 'ludhiana', year: 2015,
    sourceContribution: { transport: 0.164, residential: 0.079, industries: 0.08, dust: 0.123, waste: 0.092, dgSets: 0.027, brickKilns: 0.029 },
    outsideContributionPct: 0.407,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: false, isDuplicatePlan: false },
    actions: [
      action('lud-1', 'Industrial emission monitoring', 'Industry', 'PCB', 'Monitoring', 'In Progress', null),
      action('lud-2', 'Door-to-door segregated waste collection', 'Waste', 'ULB', 'Implementing', 'Not Started', null),
    ],
  },
  {
    id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', waqiStation: 'jaipur', year: 2015,
    sourceContribution: { transport: 0.241, residential: 0.135, industries: 0.024, dust: 0.176, waste: 0.085, dgSets: 0.022, brickKilns: 0.018 },
    outsideContributionPct: 0.299,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: false, isDuplicatePlan: true },
    actions: [
      action('jai-1', 'Multi-level parking to cut cruising traffic', 'Transport', 'ULB', 'Implementing', 'Not Started', null),
      action('jai-2', 'Pothole-free road maintenance', 'Dust', 'PWD', null, 'Not Started', null),
    ],
  },
  {
    id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', waqiStation: 'ahmedabad', year: 2018,
    sourceContribution: { transport: 0.149, residential: 0.066, industries: 0.124, dust: 0.177, waste: 0.084, dgSets: 0.065, brickKilns: 0.007 },
    outsideContributionPct: 0.328,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: true, isDuplicatePlan: false },
    actions: [
      action('ahm-1', 'BRTS electrification', 'Transport', 'Transport Dept', 'Implementing', 'In Progress', null),
      action('ahm-2', 'OCEMS in gross polluting industries', 'Industry', 'PCB', 'Monitoring', 'Done', null),
    ],
  },
  {
    id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', waqiStation: 'hyderabad', year: 2018,
    sourceContribution: { transport: 0.165, residential: 0.048, industries: 0.148, dust: 0.186, waste: 0.129, dgSets: 0.068, brickKilns: 0.002 },
    outsideContributionPct: 0.253,
    planStatus: { hasLegalMandate: false, hasBudget: true, sourceDataInPlan: false, isDuplicatePlan: false },
    actions: [
      action('hyd-1', 'Metro rail extension', 'Transport', 'Transport Dept', 'Implementing', 'In Progress', 900000000),
      action('hyd-2', 'C&D waste collection centres', 'Construction', 'ULB', 'Implementing', 'In Progress', 50000000),
    ],
  },
  {
    id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', waqiStation: 'chennai', year: 2015,
    sourceContribution: { transport: 0.246, residential: 0.036, industries: 0.128, dust: 0.235, waste: 0.156, dgSets: 0.016, brickKilns: 0.031, seaSalt: 0.018 },
    outsideContributionPct: 0.133,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: false, isDuplicatePlan: false },
    actions: [
      action('che-1', 'Beach/coastal dust and construction control', 'Dust', 'Shared/Unclear', null, 'Not Started', null),
      action('che-2', 'Public bus fleet CNG conversion', 'Transport', 'Transport Dept', 'Implementing', 'In Progress', null),
    ],
  },
  {
    id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', waqiStation: 'bengaluru', year: 2015,
    sourceContribution: { transport: 0.265, residential: 0.099, industries: 0.021, dust: 0.23, waste: 0.161, dgSets: 0.04, brickKilns: 0.026 },
    outsideContributionPct: 0.157,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: true, isDuplicatePlan: false },
    actions: [
      action('ben-1', 'Expand metro + last-mile connectivity', 'Transport', 'Transport Dept', 'Implementing', 'In Progress', null),
      action('ben-2', 'Landfill fire prevention at waste sites', 'Waste', 'ULB', 'Enforcing', 'Not Started', null),
    ],
  },
  {
    id: 'kolkata', name: 'Kolkata', state: 'West Bengal', waqiStation: 'kolkata', year: 2018,
    sourceContribution: { transport: 0.135, residential: 0.086, industries: 0.176, dust: 0.125, waste: 0.128, dgSets: 0.094, brickKilns: 0.067 },
    outsideContributionPct: 0.19,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: false, isDuplicatePlan: false },
    actions: [
      action('kol-1', 'Phase out old commercial diesel vehicles', 'Transport', 'Transport Dept', 'Enforcing', 'Not Started', null),
      action('kol-2', 'Industrial cluster relocation study', 'Industry', 'Shared/Unclear', null, 'Not Started', null),
    ],
  },
  {
    id: 'chandigarh', name: 'Chandigarh', state: 'Chandigarh', waqiStation: 'chandigarh', year: 2015,
    sourceContribution: { transport: 0.106, residential: 0.115, industries: 0.014, dust: 0.127, waste: 0.09, dgSets: 0.026, brickKilns: 0.014 },
    outsideContributionPct: 0.509,
    planStatus: { hasLegalMandate: false, hasBudget: false, sourceDataInPlan: false, isDuplicatePlan: false },
    actions: [
      action('cha-1', 'Regional airshed coordination with Punjab/Haryana', 'Regional Coordination', 'Shared/Unclear', null, 'Not Started', null),
      action('cha-2', 'Cycle-track network expansion', 'Transport', 'ULB', 'Implementing', 'In Progress', null),
    ],
  },
];

module.exports = cities;
