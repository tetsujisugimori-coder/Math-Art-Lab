import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';import {createHash} from 'node:crypto';import {createRequire,builtinModules} from 'node:module';import {pathToFileURL} from 'node:url';
const root=process.cwd(),sha=b=>createHash('sha256').update(b).digest('hex');
const config=await import(pathToFileURL(path.resolve('tools/three-body-stage-al-tests.config.mjs')).href);
const queue=[...config.default.test.include,'tools/three-body-stage-al-tests.config.mjs'],nodes=[],edges=[],external=[],unknown=[];const seen=new Set();
while(queue.length){
 const file=queue.shift();if(seen.has(file))continue;seen.add(file);
 const raw=fs.readFileSync(file),text=raw.toString('utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);nodes.push({file,sha256:sha(raw)});
 const add=(specifier,kind,n)=>{
  const line=ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1;
  if(specifier.startsWith('.')){let p=path.resolve(path.dirname(file),specifier);if(!fs.existsSync(p)){for(const ext of ['.mjs','.js','.ts'])if(fs.existsSync(p+ext)){p+=ext;break;}}const target=path.relative(root,p).replaceAll('\\','/');edges.push({file,target,kind,line});queue.push(target);}
  else{let resolved;try{resolved=createRequire(pathToFileURL(path.resolve(file))).resolve(specifier);}catch{resolved='UNRESOLVED';}external.push({file,specifier,resolved,builtin:specifier.startsWith('node:')||builtinModules.includes(specifier),kind,line});}
 };
 const walk=n=>{
  if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier&&ts.isStringLiteralLike(n.moduleSpecifier))add(n.moduleSpecifier.text,'static',n);
  if(ts.isCallExpression(n)&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||n.expression.getText(ast)==='require')){
   if(n.arguments[0]&&ts.isStringLiteralLike(n.arguments[0]))add(n.arguments[0].text,'dynamic-literal',n);
   else unknown.push({file,line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,expression:n.getText(ast),reviewed:file==='tools/three-body-stage-ae-gates.mjs'&&n.getText(ast).includes('lib/utilsBundle.js')?'PREINSTALLED_YAML_PARSER_ONLY':'NOT_VERIFIED'});
  }ts.forEachChild(n,walk);
 };walk(ast);
}
const forbidden=nodes.filter(r=>r.file==='src/three-body.test.ts'||/three-body-stage-ae-(bootstrap|worker)/.test(r.file));
const result={status:forbidden.length||unknown.some(r=>r.reviewed==='NOT_VERIFIED')?'BLOCKED':'LOCAL_IMPORT_CLOSURE_PASS',root,entries:config.default.test.include,nodes,edges,external,unknown,forbidden,scope:'Project local runtime import closure and resolved external roots; third-party runner internals not fully expanded. Source-only fs.readFile/AST inspection is not a runtime import. Physical-capable exports require separate callsite review recorded by independent reviewer.'};
fs.writeFileSync('.three-body-evidence/stage-al-revision/import-closure.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,entries:result.entries.length,localModules:nodes.length,unknown:unknown.length}));if(result.status==='BLOCKED')process.exitCode=1;
