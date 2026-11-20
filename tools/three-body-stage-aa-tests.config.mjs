import {fileURLToPath} from 'node:url';
export default{root:fileURLToPath(new URL('../',import.meta.url)),test:{include:['src/three-body-stage-v.test.js','src/three-body-stage-w.test.js','src/three-body-stage-x.test.js','src/three-body-stage-z.test.js','src/three-body-stage-aa.test.js']}};
