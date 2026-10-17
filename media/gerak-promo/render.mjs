import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const base=dirname(fileURLToPath(import.meta.url));
const runtime=process.env.CODEX_NODE_MODULES || 'C:/Users/haziq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const require=createRequire(resolve(runtime,'package.json'));
const {chromium}=require('playwright');
const sharp=require('sharp');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Users/haziq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',args:['--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
page.on('pageerror',e=>console.error(e));
await page.goto(pathToFileURL(resolve(base,'composition.html')).href);
await page.evaluate(()=>window.ready);
await mkdir(resolve(base,'stills'),{recursive:true});
const times=[2.7,6.8,12,17.2,22.5,27.8];
const stills=[];
for(let i=0;i<times.length;i++){
  const data=await page.evaluate(t=>{window.renderFrame(t);return document.getElementById('film').toDataURL('image/png').split(',')[1]},times[i]);
  const buffer=Buffer.from(data,'base64');
  await writeFile(resolve(base,`stills/scene-${i+1}.png`),buffer);
  if(i===5)await writeFile(resolve(base,'GERAK-Promo-Cover.png'),buffer);
  stills.push({input:await sharp(buffer).resize(640,360).png().toBuffer(),left:(i%2)*640,top:Math.floor(i/2)*360});
}
await sharp({create:{width:1280,height:1080,channels:3,background:'#070d1b'}}).composite(stills).png().toFile(resolve(base,'storyboard.png'));
console.log('Six scene stills and storyboard ready.');
if(!process.argv.includes('--stills')){
  const ffmpeg=process.env.FFMPEG_PATH || resolve(base,'../../.runtime/promo-deps/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
  const output=resolve(base,'GERAK-Promo-1080p.mp4');
  const enc=spawn(ffmpeg,['-y','-hide_banner','-loglevel','warning','-f','image2pipe','-vcodec','mjpeg','-framerate','30','-i','pipe:0','-i',resolve(base,'soundtrack-original.wav'),'-map','0:v','-map','1:a','-vf','scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-r','30','-c:a','aac','-b:a','256k','-af','loudnorm=I=-16:TP=-1.5:LRA=9','-ar','48000','-t','30','-movflags','+faststart','-metadata','title=GERAK — A better way to move','-metadata','comment=Original motion graphics and original synthesized score. Illustrative product interfaces.',output],{stdio:['pipe','ignore','pipe'],windowsHide:true});
  let errors='';enc.stderr.on('data',b=>{errors+=b.toString()});
  const completed=once(enc,'close');
  const start=Date.now();
  for(let frame=0;frame<900;frame++){
    const data=await page.evaluate(t=>{window.renderFrame(t);return document.getElementById('film').toDataURL('image/jpeg',.98).split(',')[1]},frame/30);
    if(!enc.stdin.write(Buffer.from(data,'base64')))await once(enc.stdin,'drain');
    if(frame%90===0)console.log(`${Math.round(frame/9)}% · frame ${frame}/900 · ${Math.round((Date.now()-start)/1000)}s elapsed`);
  }
  enc.stdin.end();
  const [code]=await completed;
  if(code!==0)throw new Error(`Encoder failed (${code}): ${errors}`);
  console.log(`Export ready: ${output} (${Math.round((Date.now()-start)/1000)}s render)`);
  if(errors)console.log(errors.slice(-1200));
}
await browser.close();
