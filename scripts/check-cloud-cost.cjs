#!/usr/bin/env node
// Run from the app repository after dependencies are installed.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(process.argv[2]||process.cwd());
if(root==='/home/ubuntu/caption-ai'||root.startsWith('/home/ubuntu/caption-ai/'))throw new Error('Excluded workspace');
const requireApp=createRequire(path.join(root,'package.json'));const ts=requireApp('typescript');
const failures=[];let checked=0;
function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.isSymbolicLink()||['node_modules','_generated','graphify-out','.git','.next','dist'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.[cm]?[jt]sx?$/.test(e.name)&&!/(?:\.test|\.spec)\./.test(e.name))check(p);}}
function check(file){checked++;const source=fs.readFileSync(file,'utf8');const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);const rel=path.relative(root,file);
 function visit(node){if(ts.isVariableDeclaration(node)&&node.initializer&&ts.isCallExpression(node.initializer)&&/^(?:query|internalQuery|ownerQuery)$/.test(node.initializer.expression.getText(tree))){
  const body=node.initializer.getText(tree);const full=node.getFullText(tree);
  // Explicit exceptions document the cardinality/frequency contract in review.
  const exception=/@cloud-cost\s+allow-full-scan:\s*[^\n]{20,}/.test(full);
  function find(n){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='collect'){
   const chain=n.expression.expression.getText(tree);
   if(/(?:ctx\.)?db\.query\(/.test(chain)&&!chain.includes('.withIndex(')&&!exception)failures.push(`${rel}:${tree.getLineAndCharacterOfPosition(n.getStart(tree)).line+1}: reactive full-table collect; use an index/pagination or document @cloud-cost allow-full-scan: with its bounded size/frequency contract.`);
  }ts.forEachChild(n,find);}find(node.initializer);
 }ts.forEachChild(node,visit);}visit(tree);
}
walk(path.join(root,'convex'));
const vercel=path.join(root,'vercel.json');if(fs.existsSync(vercel)){const config=JSON.parse(fs.readFileSync(vercel,'utf8'));for(const cron of config.crons||[])if(cron.schedule==='* * * * *')failures.push('vercel.json: minute polling requires an explicit latency review; use the app Trigger scheduler with documented recovery and latency.');}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log(`Cloud cost guard passed (${checked} backend source files). This is a source guard; verify actual provider usage, lifecycle rules and freshness separately.`);
