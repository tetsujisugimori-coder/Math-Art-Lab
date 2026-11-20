import path from 'node:path';
export function outputPath(value){if(typeof value!=='string'||!value.trim()||value.startsWith('-')||value.includes('\0'))throw Error('INVALID_OUTPUT');return path.resolve(value);}
export function parseArguments(args){
 if(!Array.isArray(args)||args.length<1)throw Error('OUTPUT_REQUIRED');const output=outputPath(args[0]);let probe=false,probeExitCode=0,boundRoot=null;const seen=new Set();
 for(const a of args.slice(1)){const key=a.split('=')[0];if(seen.has(key))throw Error('DUPLICATE_ARGUMENT');seen.add(key);if(a==='--probe')probe=true;else if(/^--probe-exit=\d+$/.test(a))probeExitCode=Number(a.split('=')[1]);else if(a.startsWith('--bound='))boundRoot=outputPath(a.slice(8));else throw Error('UNKNOWN_ARGUMENT');}
 if(probeExitCode>255||(!probe&&probeExitCode)||boundRoot&&boundRoot!==output)throw Error('ARGUMENT_CONTRACT');return{output,options:{probe,probeExitCode,boundRoot}};
}
export function childArguments(output,{probe=false,probeExitCode=0}={}){if(typeof probe!=='boolean'||!Number.isInteger(probeExitCode)||probeExitCode<0||probeExitCode>255||(!probe&&probeExitCode))throw Error('ARGUMENT_CONTRACT');return[outputPath(output),...(probe?['--probe','--probe-exit='+probeExitCode]:[])];}
