const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
const parseCSV=vm.runInNewContext(source.slice(source.indexOf('function parseCSV('),source.indexOf('function download('))+';parseCSV');
const [header,...rows]=parseCSV(fs.readFileSync('data/pokemon.csv','utf8'));
const pokemon=rows.map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]])));
assert.equal(pokemon.length,1595);
assert.equal(header.length,25);
assert(!header.includes("旧ID")&&!header.includes("旧キー"));
assert(!header.some(k=>k.startsWith('ソフト図鑑')));
assert.equal(new Set(pokemon.map(p=>p.ID)).size,pokemon.length);
const context={parseCSV,db:{pokemon},localStorage:{getItem:()=>null},dexLanguageKey:p=>String(Number(p['全国図鑑No'].replaceAll(',',''))),esc:String,refreshDexOptions:()=>{}};
vm.createContext(context);
let top=source.slice(0,source.indexOf('let searchStateReady=false;'));
top=top.slice(0,top.indexOf('function refreshDexOptions()'));
vm.runInContext(source.slice(source.indexOf('function categories('),source.indexOf('function displayName(')),context);
vm.runInContext(top,context);
const defs=fs.readFileSync('data/pokedex.csv','utf8'),entries=fs.readFileSync('data/pokedex_entries.csv','utf8');
context.loadDexCatalog(defs,entries);
const counts={'カントー（GBA）':150,'ミアレ':230,'異次元':131,'パルデア':400,'キタカミ':200,'ブルーベリー':240,'ヒスイ':242,'シンオウ':150,'ガラル':400,'ヨロイ島':210,'カンムリ雪原':210,'カントー（ピカブイ）':150,'Pokémon GO':1025};
for(const [name,count] of Object.entries(counts)){
  vm.runInContext('dexView='+JSON.stringify('soft:'+name),context);
  const list=context.dexBaseRows();
  assert.equal(list.length,count,name);
  for(let i=1;i<list.length;i++)assert(Number(context.dexEntry(list[i-1])['図鑑番号'])<=Number(context.dexEntry(list[i])['図鑑番号']),name);
}
for(const [name,number,category] of [['ガラル','52','ガラルのすがた'],['ヨロイ島','79','ガラルのすがた'],['ヒスイ','58','ヒスイのすがた'],['パルデア','128','パルデアのすがた'],['ブルーベリー','37','アローラのすがた']]){vm.runInContext('dexView='+JSON.stringify('soft:'+name),context);const p=context.dexBaseRows().find(p=>context.dexLanguageKey(p)===number);assert(p,name+' regional representative exists');assert(context.categories(p).includes(category),name+' regional representative');}
vm.runInContext("dexView='national'",context);assert(!context.categories(context.dexBaseRows().find(p=>context.dexLanguageKey(p)==='52')).includes('ガラルのすがた'));
const [,entryRows]=[null,parseCSV(entries)];
assert.throws(()=>context.loadDexCatalog(defs,entries+entryRows[1].map(v=>'"'+v.replaceAll('"','""')+'"').join(',')+'\n'));
const bad=entryRows.map(r=>[...r]);bad[1][0]='missing-dex';
assert.throws(()=>context.loadDexCatalog(defs,bad.map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n')));
assert.throws(()=>context.normalizeSoftware({x:{'1':'Yes'}}));
console.log('PASS: split CSVs, unique references, species totals, sort order and invalid catalog rejection.');

