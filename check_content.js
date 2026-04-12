const fs = require('fs');

const dataContent = fs.readFileSync('./data/xianxia-cyber-data.js', 'utf-8');
const window = {};
eval(dataContent);
const data = window.SBTI_SOURCE_DATA;

const errors = [];
const warnings = [];

// 1. Check dimensions
const dimMetaKeys = Object.keys(data.dimensionMeta);
const dimExpKeys = Object.keys(data.dimensionExplanations);
const dimOrder = data.dimensionOrder;

if (dimMetaKeys.length !== 15) errors.push(`dimensionMeta has ${dimMetaKeys.length} keys, expected 15.`);
if (dimExpKeys.length !== 15) errors.push(`dimensionExplanations has ${dimExpKeys.length} keys, expected 15.`);
if (dimOrder.length !== 15) errors.push(`dimensionOrder has ${dimOrder.length} keys, expected 15.`);

const allDims = new Set([...dimMetaKeys, ...dimExpKeys, ...dimOrder]);
if (allDims.size !== 15) errors.push(`Mismatch in dimension keys across meta, explanations, and order.`);

// 2. Check questions
const qIds = new Set();
const qTexts = new Set();

data.questionPool.forEach((q, idx) => {
  if (!dimMetaKeys.includes(q.dim)) errors.push(`Question ${q.id} has invalid dim: ${q.dim}`);
  if (qIds.has(q.id)) errors.push(`Duplicate question ID: ${q.id}`);
  qIds.add(q.id);
  
  if (qTexts.has(q.text)) warnings.push(`Duplicate question text found: "${q.text}"`);
  qTexts.add(q.text);

  const optValues = new Set();
  const optLabels = new Set();
  q.options.forEach(opt => {
    if (optValues.has(opt.value)) errors.push(`Question ${q.id} has duplicate option value: ${opt.value}`);
    optValues.add(opt.value);
    if (optLabels.has(opt.label)) warnings.push(`Question ${q.id} has duplicate option label: "${opt.label}"`);
    optLabels.add(opt.label);
  });
});

data.specialQuestions.forEach(q => {
  if (qIds.has(q.id)) errors.push(`Duplicate special question ID: ${q.id}`);
  qIds.add(q.id);
});

// 3. Check types
const normalTypeCodes = data.normalTypes.map(t => t.code);
const normalTypePatterns = data.normalTypes.map(t => t.pattern);
const libCodes = Object.keys(data.typeLibrary);

if (new Set(normalTypeCodes).size !== normalTypeCodes.length) errors.push(`Duplicate codes in normalTypes`);
if (new Set(normalTypePatterns).size !== normalTypePatterns.length) errors.push(`Duplicate patterns in normalTypes`);

normalTypeCodes.forEach(code => {
  if (!data.typeLibrary[code]) errors.push(`normalType ${code} missing from typeLibrary`);
});

const typeNames = new Set();
const typeIntros = new Set();
const typeDescs = new Set();

Object.values(data.typeLibrary).forEach(type => {
  if (typeNames.has(type.cn)) warnings.push(`Duplicate type name: ${type.cn}`);
  typeNames.add(type.cn);
  
  if (typeIntros.has(type.intro)) warnings.push(`Duplicate type intro: "${type.intro}"`);
  typeIntros.add(type.intro);

  if (typeDescs.has(type.desc)) warnings.push(`Duplicate type desc: "${type.desc.substring(0, 20)}..."`);
  typeDescs.add(type.desc);
});

// Output
console.log(JSON.stringify({
  errors,
  warnings
}, null, 2));
