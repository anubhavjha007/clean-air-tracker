require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const ai = require('./ai/aiService');
const cities = require('./seed');

const {
  calculateScore,
  simulateScore
} = require('./scoring');

const {
  getPolicyAdvice
} = require('./ai/aiService');

const {
  validateAction,
  validateSourceContribution,
  validateObservation
} = require('./validator');

const {
  detectHotspots
} = require('./hotspotDetector');


const app =
  express();


app.use(cors());

app.use(
  express.json()
);


app.use(
  express.static(
    path.join(
      __dirname,
      '..',
      'public'
    )
  )
);


const WAQI_TOKEN =
  process.env.WAQI_TOKEN || 'demo';

const observations = [];


const HOTSPOT_ACTION_MATCHERS = {
  traffic: {
    label: 'traffic',
    patterns: [
      /\btransport\b/i,
      /\btraffic\b/i,
      /\bvehicle emissions?\b/i,
      /\bvehicular pollution\b/i,
      /\broad transport\b/i
    ]
  },
  dust: {
    label: 'dust',
    patterns: [
      /\bdust\b/i,
      /\broad maintenance\b/i,
      /\bconstruction\b/i
    ]
  },
  'open-burning': {
    label: 'open burning',
    patterns: [
      /\bopen burning\b/i,
      /\bwaste burning\b/i,
      /\bsolid waste\b/i,
      /\bwaste management\b/i,
      /\bbiomass burning\b/i,
      /^waste$/i
    ]
  },
  'industrial-smoke': {
    label: 'industrial smoke',
    patterns: [
      /\bindustrial emissions?\b/i,
      /\bindustrial pollution\b/i,
      /\bindustrial\b/i,
      /\bindustry\b/i,
      /\bfactory emissions?\b/i
    ]
  }
};


function actionMatchesHotspotSource(action, sourceType) {
  const matcher = HOTSPOT_ACTION_MATCHERS[sourceType];

  if (!matcher) {
    return false;
  }

  const fields = [action.sector, action.title]
    .filter(value => typeof value === 'string');

  return fields.some(field =>
    matcher.patterns.some(pattern => pattern.test(field))
  );
}


function matchHotspotsToActions(hotspots, actions) {
  return hotspots.map(hotspot => {
    const matchingActions = actions
      .filter(action => actionMatchesHotspotSource(action, hotspot.sourceType))
      .map(action => ({
        id: action.id,
        title: action.title,
        sector: action.sector,
        responsibleAgency: action.responsibleAgency,
        role: action.role,
        status: action.status
      }));

    const matchStatus =
      matchingActions.length > 0 ? 'MATCHED' : 'GAP';

    return {
      hotspotId: hotspot.id,
      cityId: hotspot.cityId,
      sourceType: hotspot.sourceType,
      matchStatus,
      matchingActionIds: matchingActions.map(action => action.id),
      matchingActions,
      reason: matchStatus === 'MATCHED'
        ? `Existing Action Tracker action${matchingActions.length === 1 ? '' : 's'} match${matchingActions.length === 1 ? 'es' : ''} the ${HOTSPOT_ACTION_MATCHERS[hotspot.sourceType].label} source category.`
        : `No existing Action Tracker action matching the ${HOTSPOT_ACTION_MATCHERS[hotspot.sourceType].label} source category was found.`
    };
  });
}


// ============================================================
// HEALTH
// ============================================================

app.get(
  '/api/health',
  (req, res) => {

    res.json({

      status: 'ok',

      service:
        'Clean Air Accountability Tracker',

      cities:
        cities.length,

      timestamp:
        new Date().toISOString()

    });

  }
);


// ============================================================
// OVERVIEW
// ============================================================

app.get(
  '/api/overview',
  (req, res) => {

    const overview =
      cities
        .map(city => {

          const score =
            calculateScore(city);


          return {

            id:
              city.id,

            name:
              city.name,

            state:
              city.state,

            year:
              city.year,

            outsideContributionPct:
              city.outsideContributionPct,

            total:
              score.total,

            health:
              score.health,

            breakdown:
              score.breakdown,

            actionCompleteness:
              score.actionCompleteness,

            regionalRisk:
              score.regionalRisk,

            duplicatePlanFlag:
              score.duplicatePlanFlag,

            gaps:
              score.gaps.length

          };

        })
        .sort(
          (a, b) =>
            b.total - a.total
        );


    res.json(overview);

  }
);


// ============================================================
// CITY LIST
// ============================================================

app.get(
  '/api/cities',
  (req, res) => {

    res.json(

      cities.map(city => ({

        id:
          city.id,

        name:
          city.name,

        state:
          city.state

      }))

    );

  }
);


// ============================================================
// CITY DETAIL
// ============================================================

app.get(
  '/api/cities/:id',
  (req, res) => {

    const city =
      cities.find(
        city =>
          city.id ===
          req.params.id
      );


    if (!city) {

      return res
        .status(404)
        .json({
          error:
            'City not found'
        });

    }


    const score =
      calculateScore(city);


    const sourceValidation =
      validateSourceContribution(
        city
      );


    res.json({

      ...city,

      score:

        score,

      dataQuality: {

        sourceContribution:
          sourceValidation

      }

    });

  }
);


// ============================================================
// COMMUNITY OBSERVATIONS
// ============================================================

app.get(
  '/api/observations',
  (req, res) => {
    const cityId = req.query.cityId;

    if (!cityId) {
      return res.status(400).json({
        error: 'cityId is required'
      });
    }

    if (!cities.some(city => city.id === cityId)) {
      return res.status(404).json({
        error: 'City not found'
      });
    }

    res.json(
      observations.filter(observation => observation.cityId === cityId)
    );
  }
);


app.post(
  '/api/observations',
  (req, res) => {
    const errors = validateObservation(req.body || {});

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    const city = cities.find(city => city.id === req.body.cityId);

    if (!city) {
      return res.status(404).json({
        error: 'City not found'
      });
    }

    const observation = {
      id: 'obs-' + Date.now(),
      cityId: city.id,
      sourceType: req.body.sourceType,
      location: {
        lat: Number(req.body.latitude),
        lng: Number(req.body.longitude)
      },
      time: req.body.time,
      intensity: req.body.intensity,
      durationMinutes: Number(req.body.durationMinutes),
      status: 'Reported',
      createdAt: new Date().toISOString(),
      linkedHotspotId: null,
      linkedActionId: null
    };

    observations.push(observation);

    res.status(201).json(observation);
  }
);


app.get(
  '/api/cities/:id/hotspots',
  (req, res) => {
    const city = cities.find(
      city => city.id === req.params.id
    );

    if (!city) {
      return res.status(404).json({
        error: 'City not found'
      });
    }

    const cityObservations = observations.filter(
      observation => observation.cityId === city.id
    );

    const hotspots = detectHotspots(cityObservations);

    res.json({
      cityId: city.id,
      count: hotspots.length,
      hotspots
    });
  }
);


app.get(
  '/api/cities/:id/hotspot-action-matches',
  (req, res) => {
    const city = cities.find(
      city => city.id === req.params.id
    );

    if (!city) {
      return res.status(404).json({
        error: 'City not found'
      });
    }

    const cityObservations = observations.filter(
      observation => observation.cityId === city.id
    );

    const hotspots = detectHotspots(cityObservations);
    const matches = matchHotspotsToActions(
      hotspots,
      Array.isArray(city.actions) ? city.actions : []
    );

    res.json({
      cityId: city.id,
      count: matches.length,
      matches
    });
  }
);


// ============================================================
// PLAN DOCTOR
// ============================================================

app.get(
  '/api/cities/:id/plan-doctor',
  (req, res) => {

    const city =
      cities.find(
        city =>
          city.id ===
          req.params.id
      );


    if (!city) {

      return res
        .status(404)
        .json({
          error:
            'City not found'
        });

    }


    const score =
      calculateScore(city);


    res.json({

      city:
        city.name,

      health:
        score.health,

      score:
        score.total,

      gaps:
        score.gaps,

      actionCompleteness:
        score.actionCompleteness,

      accountableActions:
        score.accountableActions,

      totalActions:
        score.totalActions,

      budgetedActions:
        score.budgetedActions

    });

  }
);


// ============================================================
// WHAT-IF SIMULATOR
// ============================================================

app.post(
  '/api/cities/:id/simulate',
  (req, res) => {

    const city =
      cities.find(
        city =>
          city.id ===
          req.params.id
      );


    if (!city) {

      return res
        .status(404)
        .json({
          error:
            'City not found'
        });

    }


    const result =
      simulateScore(
        city,
        req.body || {}
      );


    res.json(result);

  }
);


// ============================================================
// ADD ACTION
// ============================================================

app.post(
  '/api/cities/:id/actions',
  (req, res) => {

    const city =
      cities.find(
        city =>
          city.id ===
          req.params.id
      );


    if (!city) {

      return res
        .status(404)
        .json({
          error:
            'City not found'
        });

    }


    const errors =
      validateAction(
        req.body
      );


    if (errors.length > 0) {

      return res
        .status(400)
        .json({

          error:
            'Validation failed',

          details:
            errors

        });

    }


    const action = {

      id:
        'a' +
        Date.now(),

      title:
        req.body.title.trim(),

      sector:
        req.body.sector.trim(),

      responsibleAgency:
        req.body.responsibleAgency ||
        'Shared/Unclear',

      role:
        req.body.role ||
        null,

      status:
        req.body.status ||
        'Not Started',

      budgetINR:
        req.body.budgetINR
          ? Number(
              req.body.budgetINR
            )
          : null

    };


    city.actions.push(
      action
    );


    res
      .status(201)
      .json(action);

  }
);


// ============================================================
// UPDATE ACTION
// ============================================================

app.put(
  '/api/cities/:id/actions/:actionId',
  (req, res) => {

    const city =
      cities.find(
        city =>
          city.id ===
          req.params.id
      );


    if (!city) {

      return res
        .status(404)
        .json({
          error:
            'City not found'
        });

    }


    const action =
      city.actions.find(
        action =>
          action.id ===
          req.params.actionId
      );


    if (!action) {

      return res
        .status(404)
        .json({
          error:
            'Action not found'
        });

    }


    const allowedFields = [

      'title',
      'sector',
      'responsibleAgency',
      'role',
      'status',
      'budgetINR'

    ];


    const patch = {};


    for (
      const field
      of allowedFields
    ) {

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {

        patch[field] =
          req.body[field];

      }

    }


    const merged = {

      ...action,

      ...patch

    };


    const errors =
      validateAction(
        merged
      );


    if (errors.length > 0) {

      return res
        .status(400)
        .json({

          error:
            'Validation failed',

          details:
            errors

        });

    }


    Object.assign(
      action,
      patch
    );


    if (
      action.budgetINR !== null &&
      action.budgetINR !== undefined
    ) {

      action.budgetINR =
        Number(
          action.budgetINR
        );

    }


    res.json(action);

  }
);


// ============================================================
// DELETE ACTION
// ============================================================

app.delete(
  '/api/cities/:id/actions/:actionId',
  (req, res) => {

    const city =
      cities.find(
        city =>
          city.id ===
          req.params.id
      );


    if (!city) {

      return res
        .status(404)
        .json({
          error:
            'City not found'
        });

    }


    const oldLength =
      city.actions.length;


    city.actions =
      city.actions.filter(
        action =>
          action.id !==
          req.params.actionId
      );


    if (
      city.actions.length ===
      oldLength
    ) {

      return res
        .status(404)
        .json({
          error:
            'Action not found'
        });

    }


    res
      .status(204)
      .end();

  }
);


// ============================================================
// AQI
// ============================================================

app.get(
  '/api/cities/:id/aqi',
  async (req, res) => {

    const city =
      cities.find(
        city =>
          city.id ===
          req.params.id
      );


    if (!city) {

      return res
        .status(404)
        .json({
          error:
            'City not found'
        });

    }


    try {

      const response =
        await fetch(
          `https://api.waqi.info/feed/${encodeURIComponent(
            city.waqiStation
          )}/?token=${WAQI_TOKEN}`
        );


      const data =
        await response.json();


      res.json(data);

    } catch (error) {

      res
        .status(502)
        .json({

          error:
            'AQI fetch failed',

          details:
            error.message

        });

    }

  }
);


// ============================================================
// START
// ============================================================

const PORT =
  process.env.PORT || 3000;

  
app.post('/api/cities/:id/ai-advice', async (req, res) => {
  try {
    const city = cities.find(
      city => city.id === req.params.id
    );

    if (!city) {
      return res.status(404).json({
        error: 'City not found'
      });
    }

    const score = calculateScore(city);

    const advice = await getPolicyAdvice(
      city,
      score
    );

    res.json({
      success: true,
      city: city.name,
      score,
      advice
    });

  } catch (error) {
    console.error('AI advice error:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(
  PORT,
  () => {

    console.log(
      `Clean Air Accountability Tracker running at http://localhost:${PORT}`
    );


    console.log(
      `Tracking ${cities.length} cities`
    );


    if (
      WAQI_TOKEN === 'demo'
    ) {

      console.log(
        'NOTE: using WAQI demo token.'
      );

    }

  }
);
