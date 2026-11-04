function calculateActionCompleteness(action) {

  let score = 0;


  // Action title
  if (
    action.title &&
    action.title.trim().length > 0
  ) {
    score += 20;
  }


  // Sector
  if (
    action.sector &&
    action.sector.trim().length > 0
  ) {
    score += 10;
  }


  // Clear agency
  if (
    action.responsibleAgency &&
    action.responsibleAgency !== 'Shared/Unclear'
  ) {
    score += 20;
  }


  // Clear role
  if (action.role) {
    score += 20;
  }


  // Status
  if (action.status) {
    score += 10;
  }


  // Budget
  if (
    action.budgetINR &&
    Number(action.budgetINR) > 0
  ) {
    score += 20;
  }


  return score;
}


// ============================================================
// MAIN SCORE
// ============================================================

function calculateScore(city) {

  const actions =
    Array.isArray(city.actions)
      ? city.actions
      : [];


  const totalActions =
    actions.length;


  const denominator =
    totalActions > 0
      ? totalActions
      : 1;


  // ==========================================================
  // 1. LEGAL MANDATE
  // ==========================================================

  let legal = 0;


  if (
    city.planStatus &&
    city.planStatus.hasLegalMandate === true
  ) {
    legal = 25;
  }


  // ==========================================================
  // 2. ACCOUNTABILITY
  // ==========================================================

  const accountableActions =
    actions.filter(action => {

      const hasAgency =
        action.responsibleAgency &&
        action.responsibleAgency !== 'Shared/Unclear';


      const hasRole =
        Boolean(action.role);


      return hasAgency && hasRole;

    });


  const accountability =
    Math.round(
      (
        accountableActions.length /
        denominator
      ) * 25
    );


  // ==========================================================
  // 3. SOURCE DATA
  // ==========================================================

  let source = 0;


  if (
    city.planStatus &&
    city.planStatus.sourceDataInPlan === true
  ) {
    source = 25;
  }


  // ==========================================================
  // 4. BUDGET
  // ==========================================================

  const budgetedActions =
    actions.filter(action => {

      return (
        Number(action.budgetINR) > 0
      );

    });


  const budget =
    Math.round(
      (
        budgetedActions.length /
        denominator
      ) * 25
    );


  // ==========================================================
  // ACTION COMPLETENESS
  // ==========================================================

  let completenessTotal = 0;


  for (const action of actions) {

    completenessTotal +=
      calculateActionCompleteness(
        action
      );

  }


  const actionCompleteness =
    Math.round(
      completenessTotal /
      denominator
    );


  // ==========================================================
  // REGIONAL COORDINATION
  // ==========================================================

  const regionalAction =
    actions.find(action => {

      return (
        action.sector ===
        'Regional Coordination'
      );

    });


  let regionalActionAccountable =
    false;


  if (regionalAction) {

    const agencyIsClear =
      regionalAction.responsibleAgency &&
      regionalAction.responsibleAgency !==
        'Shared/Unclear';


    const roleIsClear =
      Boolean(regionalAction.role);


    regionalActionAccountable =
      agencyIsClear &&
      roleIsClear;

  }


  const outsideContribution =
    Number(
      city.outsideContributionPct || 0
    );


  const regionalRisk =
    outsideContribution >= 0.30 &&
    !regionalActionAccountable;


  // ==========================================================
  // DUPLICATE PLAN
  // ==========================================================

  let duplicatePlanFlag =
    false;


  if (
    city.planStatus &&
    city.planStatus.isDuplicatePlan === true
  ) {
    duplicatePlanFlag = true;
  }


  // ==========================================================
  // TOTAL
  // ==========================================================

  const total =
    legal +
    accountability +
    source +
    budget;


  // ==========================================================
  // PLAN HEALTH
  // ==========================================================

  let health = 'Critical';


  if (total >= 75) {

    health = 'Strong';

  } else if (total >= 50) {

    health = 'Moderate';

  } else if (total >= 25) {

    health = 'Weak';

  }


  // ==========================================================
  // GAPS
  // ==========================================================

  const gaps = [];


  // Legal gap
  if (legal === 0) {

    gaps.push({

      type: 'legal',

      severity: 'high',

      title:
        'No clear legal mandate',

      recommendation:
        'Define the legal or institutional mandate responsible for implementing and enforcing the clean-air plan.'

    });

  }


  // Accountability gap
  if (accountability < 20) {

    gaps.push({

      type: 'accountability',

      severity: 'high',

      title:
        'Weak action ownership',

      recommendation:
        'Assign one accountable agency and one operational role to each mitigation action.'

    });

  }


  // Source-data gap
  if (source === 0) {

    gaps.push({

      type: 'source',

      severity: 'medium',

      title:
        'Source-apportionment data missing',

      recommendation:
        'Use source-contribution evidence to prioritize sectors responsible for PM2.5.'

    });

  }


  // Budget gap
  if (budget < 15) {

    gaps.push({

      type: 'budget',

      severity: 'high',

      title:
        'Weak budget visibility',

      recommendation:
        'Attach budget allocations to mitigation actions so implementation can be financially tracked.'

    });

  }


  // Regional gap
  if (regionalRisk) {

    gaps.push({

      type: 'regional',

      severity: 'high',

      title:
        'Regional pollution risk detected',

      recommendation:
        'Create an accountable regional-coordination action because a significant share of PM2.5 originates outside the city.'

    });

  }


  // Duplicate gap
  if (duplicatePlanFlag) {

    gaps.push({

      type: 'duplicate',

      severity: 'medium',

      title:
        'Potential duplicate or copied plan',

      recommendation:
        'Compare mitigation actions with plans from similar cities and verify whether interventions are locally justified.'

    });

  }


  // ==========================================================
  // RETURN RESULT
  // ==========================================================

  return {

    total: total,

    health: health,

    breakdown: {

      legal: legal,

      accountability:
        accountability,

      source: source,

      budget: budget

    },

    actionCompleteness:
      actionCompleteness,

    regionalRisk:
      regionalRisk,

    duplicatePlanFlag:
      duplicatePlanFlag,

    gaps: gaps,

    accountableActions:
      accountableActions.length,

    totalActions:
      totalActions,

    budgetedActions:
      budgetedActions.length,

    regionalActionAccountable:
      regionalActionAccountable

  };

}


// ============================================================
// WHAT-IF SIMULATOR
// ============================================================

function simulateScore(
  city,
  changes
) {

  const current =
    calculateScore(city);


  const options =
    changes || {};


  let legal =
    current.breakdown.legal;


  let accountability =
    current.breakdown.accountability;


  let source =
    current.breakdown.source;


  let budget =
    current.breakdown.budget;


  // Fix legal mandate
  if (
    options.addLegalMandate === true
  ) {
    legal = 25;
  }


  // Fix accountability
  if (
    options.improveAccountability === true
  ) {
    accountability = 25;
  }


  // Add source data
  if (
    options.addSourceData === true
  ) {
    source = 25;
  }


  // Add budget
  if (
    options.addBudget === true
  ) {
    budget = 25;
  }


  const projectedScore =
    legal +
    accountability +
    source +
    budget;


  const improvement =
    projectedScore -
    current.total;


  return {

    currentScore:
      current.total,

    projectedScore:
      projectedScore,

    improvement:
      improvement,

    breakdown: {

      legal:
        legal,

      accountability:
        accountability,

      source:
        source,

      budget:
        budget

    }

  };

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  calculateScore,
  calculateActionCompleteness,
  simulateScore
};