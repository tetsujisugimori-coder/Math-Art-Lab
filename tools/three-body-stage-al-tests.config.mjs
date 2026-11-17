import prior from './three-body-stage-ak-tests.config.mjs';
export default {cacheDir:'.three-body-evidence/stage-al-revision/vite-cache',test:{include:[...prior.test.include,'src/three-body-stage-al.test.js'],cache:false}};
