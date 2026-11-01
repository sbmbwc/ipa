import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'capacitor.config.json'),'utf8'));
assert.equal(config.appId,'com.cui.metrooffline');
assert.equal(config.webDir,'www');
assert(!config.server?.url,'Native app must load bundled assets, not a hosted website');
const data=JSON.parse(fs.readFileSync(path.join(root,'www/data.json'),'utf8'));
assert(data.stations.length>=400);
const files=fs.readdirSync(path.join(root,'www'));
for(const file of files){
 const source=path.join(root,'www',file);
 if(file.endsWith('.mjs')||file.endsWith('.js'))execFileSync(process.execPath,['--check',source]);
 const bundled=path.join(root,'ios/App/App/public',file);
 assert(fs.existsSync(bundled),`Missing synced resource: ${file}`);
 const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 assert.equal(hash(source),hash(bundled),`Run npm run sync:ios after changing ${file}`);
}
assert(fs.readFileSync(path.join(root,'www/app.mjs'),'utf8').includes('本地离线版'));
assert(fs.existsSync(path.join(root,'ios/App/App.xcodeproj/project.pbxproj')));
console.log(`Source package checks passed: ${files.length} bundled files; ${data.stations.length} local station nodes. Xcode compilation still required.`);
