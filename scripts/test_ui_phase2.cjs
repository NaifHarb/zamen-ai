// Serve the static app over localhost first. See UI-UX-REDESIGN-REPORT.md.
const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const current = new URL(process.env.ZAMEN_TEST_ORIGIN || 'http://127.0.0.1:4173/').href;
const axe = require.resolve('axe-core/axe.min.js');
const fixtureImage = fs.readFileSync(path.join(__dirname, '../icon-512.png'));
const dims=[[320,700],[375,667],[390,844],[430,932],[600,810],[820,1180],[1024,1366],[1180,820],[1366,1024],[1440,900],[1920,1080]];
const rank=x=>Date.parse(x.published_at)||0;
const legacy = require('../data/rss-classifications.json');
const rss = require('../data/news.json').items.map(story => Object.hasOwn(story, 'rss_category') ? story :
  {...story, rss_category: legacy[story.id] || null});
const sheets=require('../data/sheets-news.json').items;
const news=new Map([...rss,...sheets].map(x=>[x.id,x]));
const webkitOnly=process.argv.includes('--webkit');
const results={engine:webkitOnly?'WebKit':'Chromium',checks:[],screens:[],accessibility:[]};
function ok(test,details={}) {results.checks.push({test,...details}); console.log(test,JSON.stringify(details));}
async function run(){
 const browser = webkitOnly ? await webkit.launch() : await chromium.launch({
  executablePath: process.env.ZAMEN_CHROMIUM_PATH,
  ignoreDefaultArgs: ['--disable-back-forward-cache']
 });
 async function page(viewport,colorScheme='light',offline=false){
  const c=await browser.newContext({viewport,colorScheme,reducedMotion:'reduce',hasTouch:viewport.width<1400,serviceWorkers:offline?'allow':'block',permissions:[],deviceScaleFactor:1});
  const p=await c.newPage();
  p.on('pageerror',e=>console.log('page error:',p.url(),String(e)));
  await p.route('**/*',r=>{
   if(r.request().url().startsWith(current))return r.continue();
   if(r.request().resourceType()!=='image')return r.abort();
   // Preserve image loading behavior without depending on publisher uptime.
   return r.fulfill({contentType:'image/png',body:fixtureImage});
  });
  return [c,p];
 }
 const go=(p,url=current)=>p.goto(url,{waitUntil:'domcontentloaded'});
 const ready=async(p,selector='.featured')=>{await p.locator(selector).first().waitFor();await p.evaluate(()=>document.fonts.ready);};
 const ax=async(p,width,mode,route)=>{
  await p.addScriptTag({path:axe});
  const result=await p.evaluate(async()=>{const r=await axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),incomplete:r.incomplete.map(v=>v.id)};});
  results.accessibility.push({width,mode,route,...result});assert.deepEqual(result.violations,[],JSON.stringify(result));
 };
 for(const [width,height] of (webkitOnly?[[390,844],[820,1180],[1180,820]]:dims)) {
  for(const mode of ['light','dark']){
   const [c,p]=await page({width,height},mode);await go(p);await ready(p);
   const m=await p.evaluate(()=>({
    horizontal:Math.max(0,document.documentElement.scrollWidth-innerWidth),
    lead:document.querySelector('.featured').dataset.storyId,
    ids:[...document.querySelectorAll('#news .story')].map(x=>x.dataset.storyId),
    latest:[...document.querySelectorAll('.latest .story')].map(x=>x.dataset.storyId),
    sectionTop:Math.round(document.querySelector('.category-section').getBoundingClientRect().top),
    side:!!document.querySelector('#sidebar').getClientRects().length, visible:document.documentElement.classList.contains('dark')
   }));
   assert.equal(m.horizontal,0);assert.equal(m.visible,mode==='dark');assert.equal(m.ids.length,new Set(m.ids).size);
   assert(!m.latest.includes(m.lead));assert.equal(m.latest.length,3);
   assert(rank(news.get(m.lead))<rank(news.get(m.latest[0])));
   assert.deepEqual(m.latest.map(id=>rank(news.get(id))),m.latest.map(id=>rank(news.get(id))).sort((a,b)=>b-a));
   assert(m.ids.every(id=>news.get(id)?.rss_category!==null));
   if(width===820||width===1180)assert(m.sectionTop<height);
   if(width===820||width===1024)assert.equal(m.side,false);
   if(width===1180)assert.equal(m.side,true);
   if([390,820,1440].includes(width))await ax(p,width,mode,'today');
   results.screens.push({width,height,mode,...m});
   await c.close();
  }
 }
 ok('layout, editorial weighting, chronological latest, deduplication, archive hiding, both themes');
 const [c,p]=await page({width:820,height:1180});
 await go(p);await ready(p);
 await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'انتقل إلى المحتوى');
 await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.id),'main');
 assert(await p.locator('#quickNav').getByRole('link',{name:'المحفوظات',exact:true}).isVisible());
 const sections=p.locator('#quickNav').getByRole('button',{name:'كل الأقسام'});
 await sections.click();assert(await p.locator('#sections').isVisible());
 assert.equal(await p.locator('#sections nav a').count(),9);
 await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('dialog').open);
 assert(await sections.evaluate(e=>document.activeElement===e));
 await p.setViewportSize({width:1180,height:820});
 await p.locator('#sidebar').waitFor();
 const toggle=p.locator('#sidebarToggle');await toggle.click();assert(await p.locator('#sidebar').isHidden());
 await p.setViewportSize({width:600,height:820});assert(await p.locator('#bottom').isVisible());
 await p.setViewportSize({width:820,height:1180});assert(await p.locator('#quickNav').isVisible());
 await p.setViewportSize({width:1180,height:820});assert(await p.locator('#sidebar').isHidden());
 await toggle.click();await p.locator('#sidebar').waitFor();await p.setViewportSize({width:820,height:1180});
 await p.locator('#quickNav').waitFor();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 ok('iPad portrait saved/sections, keyboard dialog, landscape, collapsed state, Split View');
 const testReturn=async(method,link)=>{
  await link.evaluate(e=>{e.scrollIntoView({block:'center'});});
  const id=await link.getAttribute('data-open-story');
  const y=await p.evaluate(()=>scrollY);
  assert(y>400);
  await link.click();await ready(p,'.reader h1');
  if(method==='app')await p.locator('.back').click();
  else await p.goBack({waitUntil:'domcontentloaded'});
  await p.waitForFunction(id=>document.activeElement.dataset.openStory===id,id);
  const restored=await p.evaluate(()=>scrollY);
  assert(Math.abs(restored-y)<=4,JSON.stringify({method,y,restored}));
  ok('mid-feed return via '+method,{initial:y,restored,id});
 };
 await testReturn('app',p.locator('.category-section .story-link').nth(5));
 await testReturn('browser',p.locator('.category-section .story-link').nth(5));
 const images=p.locator('.featured .picture-link');
 const featuredId=await images.getAttribute('data-open-story');
 await images.click();await ready(p,'.reader h1');
 assert.equal(new URL(p.url()).searchParams.get('article'),featuredId);
 const source=await p.locator('.reader-source a').getAttribute('href');
 assert.equal(new URL(source).protocol,'https:');
 await p.locator('.reader-toolbar .bookmark').click();
 await p.locator('.size-menu summary').click();
 await p.getByRole('button',{name:'كبير',exact:true}).click();
 await p.locator('#theme').click();
 await p.reload({waitUntil:'domcontentloaded'});await ready(p,'.reader h1');
 assert.equal(await p.locator('.reader-toolbar .bookmark').getAttribute('aria-pressed'),'true');
 assert.equal(await p.locator('.reading-copy').evaluate(e=>getComputedStyle(e).fontSize),'23px');
 assert(await p.locator('html').evaluate(e=>e.classList.contains('dark')));
 await p.locator('.back').click();await ready(p);
 await p.locator('#quickNav').getByRole('link',{name:'المحفوظات'}).click();await ready(p,'.story-link');
 assert.equal(await p.locator('.story-link').count(),1);
 await p.locator('.story-link').click();await ready(p,'.reader h1');
 await p.locator('.back').click();await ready(p,'.story-link');
 assert.equal(new URL(p.url()).searchParams.get('category'),'المحفوظات');
 ok('image opens correct article, saved + font + theme persist and category restored');
 await go(p);await ready(p);await p.locator('#searchToggle').click();
 await p.locator('#search').fill('مباحثات');
 await p.waitForFunction(()=>document.querySelector('h1').textContent==='نتائج البحث');
 await p.locator('.story-link').first().click();await ready(p,'.reader h1');
 await p.locator('.back').click();await ready(p,'.story-link');
 assert.equal(await p.locator('#search').inputValue(),'مباحثات');
 assert.equal(new URL(p.url()).searchParams.get('q'),'مباحثات');
 await c.close();
 ok('search URL, result context and query restored');
 const [cd,pd]=await page({width:820,height:1180});
 const map=JSON.parse(fs.readFileSync(path.join(__dirname, '../data/images.json')));
 await pd.route('**/data/images.json',async r=>{await new Promise(f=>setTimeout(f,5000));await r.fulfill({json:map});});
 await go(pd);await ready(pd);
 const speed=await pd.evaluate(()=>performance.now());
 const pre=await pd.locator('.featured .media').boundingBox();
 assert(speed<4000);
 await pd.waitForTimeout(5200);
 await pd.locator('.featured .photo:not(.is-pending)').waitFor();
 const post=await pd.locator('.featured .media').boundingBox();
 assert.deepEqual(post,pre);
 await cd.close();ok('5 s late image map, rendered headlines and unchanged image bounds',{ms:Math.round(speed),bounds:pre});
 const [cl,pl]=await page({width:390,height:844},'dark');
 const licenseLines=Array(29).fill('تتغير تكاليف السكن بحسب أسعار الأراضي والتنظيم والتخطيط وأسعار التمويل، وتختلف آثار هذه العوامل بين الأحياء بحسب خيارات النقل ونوع المساكن المطروحة. يعرض هذا المثال اتجاهات مختلفة لتجربة القراءة العربية الطويلة.');
 const long=licenseLines.join('\n');
 await pl.route('**/data/licensed-articles.json',r=>r.fulfill({json:{[featuredId]:{text:long,attribution:'نص عربي اصطناعي لاختبار القراءة',license_url:'https://example.com/license'}}}));
 await go(pl,current+'?article='+featuredId);await ready(pl,'.reader h1');
 await pl.locator('.reading-choices select option[value=full]').waitFor({state:'attached'});
 await pl.locator('.reading-choices select').selectOption('full');
 assert.equal(await pl.locator('.reading-copy p').count(),29);
 assert.equal(await pl.locator('.reading-copy').innerText().then(s=>s.replace(/\s+/g,' ').trim()),long.replace(/\s+/g,' ').trim());
 let words=long.split(/\s+/).length;assert(words>600);
 await pl.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight/2));
 await pl.waitForFunction(()=>Number(document.querySelector('.progress span').style.transform.match(/\(([\d.]+)\)/)[1])>.2);
 let box=await pl.locator('.reader-toolbar').boundingBox();
 let where=await Promise.all(['.size-menu summary','.reader-toolbar .bookmark','.reader-toolbar [aria-label="مشاركة المقال"]'].map(sel=>pl.locator(sel).boundingBox()));
 assert(box.y>=-1&&box.y<3);assert(where.every(r=>r.y>=box.y&&r.y+r.height<=box.y+box.height+1));
 assert(where.every(r=>r.height>=44));await pl.locator('.size-menu summary').click();assert(await pl.getByRole('button',{name:'كبير',exact:true}).isVisible());
 await pl.keyboard.press('Escape');
 await ax(pl,390,'dark','reader-long');
 await pl.evaluate(()=>{document.documentElement.style.fontSize='200%';});
 assert.equal(await pl.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),0);
 await cl.close();ok('exact long Arabic text, source/type, sticky toolbar, progress, 200% text zoom',{words,toolbar:box,paragraphs:29});
 if(!webkitOnly){
  const [cs,ps]=await page({width:390,height:844});
  await cs.grantPermissions(['clipboard-read','clipboard-write']);
  await go(ps,current+'?article='+featuredId);await ready(ps,'.reader h1');
  await ps.getByRole('button',{name:'مشاركة المقال'}).click();
  assert.equal(new URL(await ps.evaluate(()=>navigator.clipboard.readText())).searchParams.get('article'),featuredId);
  const client=await cs.newCDPSession(ps);
  const copy=await ps.locator('.reading-copy').boundingBox();
  const y=Math.round(Math.min(copy.y+15,800));
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:110,y,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:245,y:y+10,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await ps.waitForURL(url=>url.searchParams.has('article')&&url.searchParams.get('article')!==featuredId);
  await cs.close();ok('clipboard sharing and RTL swipe to next article');
 }
 const [co,po]=await page({width:820,height:1180},'light',true);
 await go(po);await ready(po);await po.waitForFunction(()=>navigator.serviceWorker.controller);
 await co.setOffline(true);
 await go(po,current+'?article='+featuredId);await ready(po,'.reader h1');
 await co.close();ok('offline direct article after cache installation');
 const [cf,pf]=await page({width:820,height:1180});
 await pf.route('**/data/news.json',r=>r.abort());await go(pf);await ready(pf);
 assert(await pf.getByText('بعض الأخبار غير متاحة الآن.').isVisible());
 await pf.route('**/data/sheets-news.json',r=>r.abort());await go(pf);
 assert(await pf.getByRole('button',{name:'إعادة المحاولة'}).isVisible());
 await cf.close();ok('partial + complete primary news failure');
 for(const width of [390,820]){
  const [context, reader]=await page({width,height:width===390?844:1180});
  await go(reader,current+'?article='+featuredId);
  await ready(reader,'.reader h1');
  await ax(reader,width,'light','reader');
  await context.close();
 }
 await browser.close();
}
run().then(() => {
 const output = process.env.ZAMEN_TEST_RESULTS;
 if (output) fs.writeFileSync(output, JSON.stringify(results, null, 2) + '\n');
 console.log(results.engine, results.checks.length, 'functional checks and', results.accessibility.length, 'axe samples passed');
}).catch(error => { console.error(error); process.exit(1); });
