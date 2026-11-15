import prior from './three-body-stage-ag-tests.config.mjs';
// Original numerical tests and immutable evidence directories are never collected here.
export default {test:{include:[...prior.test.include,'src/three-body-stage-ah.test.js']}};
