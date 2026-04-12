const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.resolve('C:/Users/leoh0/sbti_source.html');
const outputJsonPath = path.resolve('C:/Users/leoh0/sbti-rebuild/data/original.json');
const outputJsPath = path.resolve('C:/Users/leoh0/sbti-rebuild/data/original-data.js');

const html = fs.readFileSync(sourcePath, 'utf8');

function extractConst(name, nextName) {
  const pattern = new RegExp(
    `const ${name} = ([\\s\\S]*?)\\n\\s*const ${nextName} =`,
    'm'
  );
  const match = html.match(pattern);
  if (!match) {
    throw new Error(`Unable to extract const ${name}`);
  }
  return match[1].trim().replace(/;$/, '');
}

function extractValue(name, nextName) {
  const code = extractConst(name, nextName);
  return vm.runInNewContext(`(${code})`);
}

const data = {
  dimensionMeta: extractValue('dimensionMeta', 'questions'),
  questions: extractValue('questions', 'specialQuestions'),
  specialQuestions: extractValue('specialQuestions', 'TYPE_LIBRARY'),
  typeLibrary: extractValue('TYPE_LIBRARY', 'TYPE_IMAGES'),
  typeImages: extractValue('TYPE_IMAGES', 'NORMAL_TYPES'),
  normalTypes: extractValue('NORMAL_TYPES', 'DIM_EXPLANATIONS'),
  dimensionExplanations: extractValue('DIM_EXPLANATIONS', 'dimensionOrder'),
  dimensionOrder: extractValue('dimensionOrder', 'DRUNK_TRIGGER_QUESTION_ID'),
};

const drunkMatch = html.match(/const DRUNK_TRIGGER_QUESTION_ID = '([^']+)'/);
if (!drunkMatch) {
  throw new Error('Unable to extract DRUNK_TRIGGER_QUESTION_ID');
}
data.drunkTriggerQuestionId = drunkMatch[1];

fs.writeFileSync(outputJsonPath, JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync(
  outputJsPath,
  `window.SBTI_SOURCE_DATA = ${JSON.stringify(data, null, 2)};\n`,
  'utf8'
);

console.log(`Wrote ${outputJsonPath}`);
console.log(`Wrote ${outputJsPath}`);
