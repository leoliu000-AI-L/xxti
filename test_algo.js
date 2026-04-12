const fs = require('fs');

// Load data
const dataContent = fs.readFileSync('./data/xianxia-cyber-data.js', 'utf-8');
// Mock window and evaluate
const window = {};
eval(dataContent);
const data = window.SBTI_SOURCE_DATA;

function sumToLevel(score) {
  if (score <= 3) return 'L';
  if (score === 4) return 'M';
  return 'H';
}

function levelNum(level) {
  return { L: 1, M: 2, H: 3 }[level];
}

function parsePattern(pattern) {
  return pattern.replace(/-/g, '').split('');
}

function simulateTest(randomAnswers = true) {
  const answers = {};
  
  // Regular questions
  const grouped = Object.fromEntries(data.dimensionOrder.map((dim) => [dim, []]));
  data.questionPool.forEach((question) => {
    if (grouped[question.dim]) grouped[question.dim].push(question);
  });

  const activeQuestions = data.dimensionOrder.flatMap((dim) => {
    const copy = [...grouped[dim]].sort(() => Math.random() - 0.5);
    return copy.slice(0, data.selection.perDimension);
  });

  // Validate mappings
  if (activeQuestions.length !== 30) throw new Error(`Active questions count mismatch: ${activeQuestions.length}`);
  const dimCounts = {};
  activeQuestions.forEach(q => dimCounts[q.dim] = (dimCounts[q.dim] || 0) + 1);
  if (Object.keys(dimCounts).length !== 15 || Object.values(dimCounts).some(c => c !== 2)) {
    throw new Error('Dimension mapping mismatch');
  }

  // Answer regular questions
  activeQuestions.forEach(q => {
    const opts = q.options;
    const picked = opts[Math.floor(Math.random() * opts.length)];
    answers[q.id] = picked.value;
  });

  // Special questions
  const gateQ1 = data.specialQuestions[0];
  const q1Opt = gateQ1.options[Math.floor(Math.random() * gateQ1.options.length)];
  answers[gateQ1.id] = q1Opt.value;

  if (answers[gateQ1.id] === 3) {
    const gateQ2 = data.specialQuestions[1];
    const q2Opt = gateQ2.options[Math.floor(Math.random() * gateQ2.options.length)];
    answers[gateQ2.id] = q2Opt.value;
  }

  // Calculate scores
  const rawScores = Object.fromEntries(data.dimensionOrder.map(dim => [dim, 0]));
  activeQuestions.forEach((question) => {
    rawScores[question.dim] += answers[question.id];
  });

  // Validate raw scores
  if (Object.values(rawScores).some(s => s < 2 || s > 6)) {
     throw new Error(`Raw score out of bounds: ${JSON.stringify(rawScores)}`);
  }

  const levels = Object.fromEntries(
    Object.entries(rawScores).map(([dim, score]) => [dim, sumToLevel(score)])
  );

  // Validate levels
  if (Object.values(levels).some(l => !['L', 'M', 'H'].includes(l))) {
      throw new Error(`Invalid level generated: ${JSON.stringify(levels)}`);
  }

  const userVector = data.dimensionOrder.map((dim) => levelNum(levels[dim]));
  if (userVector.length !== 15 || userVector.some(v => isNaN(v))) {
      throw new Error(`Invalid user vector: ${userVector}`);
  }
  
  const ranked = data.normalTypes.map((type) => {
    const vector = parsePattern(type.pattern).map(levelNum);
    let distance = 0;
    let exact = 0;

    for (let i = 0; i < vector.length; i += 1) {
      const diff = Math.abs(userVector[i] - vector[i]);
      distance += diff;
      if (diff === 0) exact += 1;
    }

    const similarity = Math.max(0, Math.round((1 - distance / 30) * 100));
    return { code: type.code, distance, exact, similarity };
  }).sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.exact !== b.exact) return b.exact - a.exact;
    return b.similarity - a.similarity;
  });

  const bestNormal = ranked[0];
  let finalResult = bestNormal.code;
  let isDrunk = false;
  let isFallback = false;

  if (answers[gateQ1.id] === 3 && answers[data.drunkTriggerQuestionId] === 2) {
    finalResult = 'DRUNK';
    isDrunk = true;
  } else if (bestNormal.similarity < 60) {
    finalResult = 'HHHH';
    isFallback = true;
  }

  return { finalResult, bestNormal, isDrunk, isFallback };
}

// Run simulations
const N = 100000;
const results = {
  total: N,
  drunkCount: 0,
  fallbackCount: 0,
  normalCount: 0,
  types: {}
};

for (let i = 0; i < N; i++) {
  const res = simulateTest();
  if (res.isDrunk) results.drunkCount++;
  else if (res.isFallback) results.fallbackCount++;
  else results.normalCount++;
  
  results.types[res.finalResult] = (results.types[res.finalResult] || 0) + 1;
}

console.log(JSON.stringify(results, null, 2));
