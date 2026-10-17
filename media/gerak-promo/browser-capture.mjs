import {createRequire} from 'node:module';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import * as fs from 'node:fs/promises';
const require=createRequire('C:/Users/haziq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
const base=resolve('media/gerak-promo/codebase');
await fs.mkdir(resolve(base,'screens'),{recursive:true});
await fs.mkdir(resolve(base,'recordings'),{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/haziq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',args:['--enable-webgl','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1});
await context.addInitScript(()=>localStorage.setItem('gerak:mode','2d'));
const page=await context.newPage();
page.on('pageerror',e=>console.log(JSON.stringify({error:e.message})));
await page.goto('http://localhost:3100',{waitUntil:'domcontentloaded'});
console.log(JSON.stringify({ready:true,url:page.url()}));
const lines=createInterface({input:process.stdin,terminal:false});
for await(const line of lines){
  try{
    const command=JSON.parse(line);
    if(command.close){await context.close();await browser.close();console.log(JSON.stringify({closed:true}));break;}
    const fn=new Function('page','browser','context','fs','base',`return (async()=>{${command.code}})()`);
    const result=await fn(page,browser,context,fs,base);
    console.log(JSON.stringify({result:result??'done'}));
  }catch(e){console.log(JSON.stringify({error:String(e),stack:e.stack?.slice(0,800)}));}
}
