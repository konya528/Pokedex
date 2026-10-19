// Run with a Playwright installation available on NODE_PATH.
// Uses a fresh browser context and intercepts all site requests; never reads a user's browser profile.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({storageState:{cookies:[],origins:[]}});
 const base='http://127.0.0.1:18765/pokedex/';
 const root=path.resolve(__dirname,'..');
 let csv=fs.readFileSync(path.join(root,'data/pokemon.csv'),'utf8');
 let fail=false;
 await context.route('**/*',async route=>{
  const url=route.request().url();
  if(!url.startsWith(base))return route.abort();
  const relative=decodeURIComponent(url.slice(base.length))||'index.html';
  if(relative==='data/pokemon.csv')return route.fulfill({status:fail?404:200,contentType:'text/csv; charset=utf-8',body:csv});
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))return route.abort();
  try{return route.fulfill({path:file,contentType:relative.endsWith('.js')?'text/javascript':relative.endsWith('.html')?'text/html':undefined})}catch{return route.abort()}
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const loaded=()=>page.waitForFunction(()=>document.querySelectorAll('.poke').length===8);
 await page.goto(base);await loaded();
 assert.equal(await page.locator('#importBtn,#csvFile').count(),0);
 let personal=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokedex_personal_v2')));
 assert.deepEqual(Object.keys(personal).sort(),['states','version']);
 await page.locator('.poke').first().click();assert.equal(await page.locator('[data-toggle="registered"]').getAttribute('aria-pressed'),'false');
 await page.fill('#personalMemo','試験用メモ');await page.click('[data-toggle="registered"]');await page.keyboard.press('Escape');
 csv=csv.replaceAll('"フシギダネ"','"フシギダネ改"');await page.reload();await loaded();await page.locator('.poke').first().click();assert.equal(await page.inputValue('#personalMemo'),'試験用メモ');assert.equal(await page.locator('[data-toggle="registered"]').getAttribute('aria-pressed'),'true');await page.keyboard.press('Escape');
 // A separate empty context storage is seeded only with synthetic legacy test data.
 await page.evaluate(()=>{localStorage.removeItem('pokedex_personal_v2');localStorage.setItem('pokedex_v1',JSON.stringify({pokemon:[{'全国図鑑No':'1','名前':'フシギダネ','HOME 図鑑登録':'Yes','HOME 所持状況':'所持','メモ':'旧CSVメモ'}],states:{'1|フシギダネ':{memo:'移行テスト'}}}))});
 await page.reload();await loaded();await page.locator('.poke').first().click();assert.equal(await page.inputValue('#personalMemo'),'移行テスト');assert.equal(await page.locator('[data-toggle="owned"]').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>localStorage.getItem('pokedex_v1')!==null),true);await page.keyboard.press('Escape');
 page.on('dialog',dialog=>dialog.accept());
 const restore=async data=>{await page.click('#settingsOpen');await page.locator('#jsonFile').setInputFiles({name:'synthetic-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.waitForFunction(()=>document.querySelector('.memo-indicator'));await page.keyboard.press('Escape')};
 await restore({version:1,states:{'1|フシギダネ':{memo:'旧バックアップ',registered:'No',owned:'未所持'}}});
 await page.locator('.poke').first().click();assert.equal(await page.inputValue('#personalMemo'),'旧バックアップ');await page.keyboard.press('Escape');await page.reload();await loaded();await page.locator('.poke').first().click();assert.equal(await page.inputValue('#personalMemo'),'旧バックアップ');await page.keyboard.press('Escape');
 await page.evaluate(()=>{download=(name,data)=>window.testBackup=data});await page.click('#settingsOpen');await page.click('#backupBtn');const backup=await page.evaluate(()=>window.testBackup);assert.equal(backup.version,2);assert.equal(backup.states['0001-default'].memo,'旧バックアップ');assert.equal(backup.pokemon,undefined);await page.keyboard.press('Escape');
 await restore({version:2,states:{'0001-default':{memo:'新版テスト'},'removed-entry':{memo:'削除項目保持'}}});
 await page.evaluate(()=>{download=(name,data)=>window.testBackup=data});await page.click('#settingsOpen');await page.click('#backupBtn');assert.equal(await page.evaluate(()=>window.testBackup.states['removed-entry'].memo),'削除項目保持');await page.keyboard.press('Escape');
 // Failure paths leave personal storage untouched.
 const before=await page.evaluate(()=>localStorage.getItem('pokedex_personal_v2'));fail=true;await page.reload();await page.waitForFunction(()=>document.querySelector('#demoNote').textContent.includes('取得できません'));assert.equal(await page.evaluate(()=>localStorage.getItem('pokedex_personal_v2')),before);
 fail=false;csv=csv.replace('"ID"','"メモ"');await page.reload();await page.waitForFunction(()=>document.querySelector('#demoNote').textContent.includes('読み込めませんでした'));assert.equal(await page.evaluate(()=>localStorage.getItem('pokedex_personal_v2')),before);
 assert.deepEqual(errors,[]);console.log('PASS: relative CSV auto-load, private storage, stable ID rename, legacy migration, v1/v2 restore, orphan preservation, failure safety');
 await context.close();await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
