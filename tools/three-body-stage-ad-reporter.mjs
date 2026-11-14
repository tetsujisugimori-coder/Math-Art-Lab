import {record} from './three-body-stage-ad-observer.mjs';
export default class Reporter {
  onInit(){record(process.env.STAGE_AD_REPORTER_LOG,'init');}
  onCollected(files){record(process.env.STAGE_AD_REPORTER_LOG,'collected',{files:files.map(f=>f.filepath)});}
  onFinished(files,errors){record(process.env.STAGE_AD_REPORTER_LOG,'finished',{files:files.map(f=>({name:f.name,result:f.result})),errors:errors.map(e=>String(e))});}
}
