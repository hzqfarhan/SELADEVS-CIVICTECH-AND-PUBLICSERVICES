import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const base=dirname(fileURLToPath(import.meta.url));
const require=createRequire('C:/Users/haziq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright'),sharp=require('sharp');
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/haziq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',args:['--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
page.on('pageerror',e=>console.log('PAGE ERROR: '+e));
await page.goto(pathToFileURL(resolve(base,'composition.html')).href);
await page.evaluate(()=>window.ready);
await mkdir(resolve(base,'stills'),{recursive:true});
const times=[1.9,5.8,11.4,16.3,19.8,26.2,29.0],composite=[];
for(let i=0;i<times.length;i++){
 const b64=await page.evaluate(async t=>{await window.renderFrame(t);return document.getElementById('film').toDataURL('image/png').split(',')[1]},times[i]);
 const b=Buffer.from(b64,'base64');await writeFile(resolve(base,'stills',`scene-${i+1}.png`),b);
 if(i===6)await writeFile(resolve(base,'GERAK-Launch-Film-Cover.png'),b);
 composite.push({input:await sharp(b).resize(640,360).png().toBuffer(),left:(i%2)*640,top:Math.floor(i/2)*360});
}
await sharp({create:{width:1280,height:1440,channels:3,background:'#070d1b'}}).composite(composite).png().toFile(resolve(base,'storyboard.png'));
console.log('Seven launch-film scene previews ready.');
if(!process.argv.includes('--stills')){
 const ffmpeg=resolve(base,'../../../.runtime/promo-deps/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
 const output=resolve(base,'GERAK-Launch-Film-1080p.mp4');
 const enc=spawn(ffmpeg,['-y','-hide_banner','-loglevel','warning','-f','image2pipe','-vcodec','mjpeg','-framerate','30','-i','pipe:0','-i',resolve(base,'launch-soundtrack.wav'),'-map','0:v','-map','1:a','-vf','scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-threads','4','-preset','medium','-crf','16','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-r','30','-c:a','aac','-b:a','256k','-af','loudnorm=I=-16:TP=-1.5:LRA=9','-ar','48000','-t','30','-movflags','+faststart','-metadata','title=GERAK — Your journey. Your voice.','-metadata','comment=Actual GERAK app. Recorded official GPS, time condensed. Civic workflow uses isolated demonstration data. Original score.',output],{stdio:['pipe','ignore','pipe'],windowsHide:true});
 let errors='';enc.stderr.on('data',b=>errors+=b.toString());const done=once(enc,'close'),start=Date.now();
 for(let i=0;i<900;i++){
  const b64=await page.evaluate(async t=>{await window.renderFrame(t);return document.getElementById('film').toDataURL('image/jpeg',.985).split(',')[1]},i/30);
  if(!enc.stdin.write(Buffer.from(b64,'base64')))await once(enc.stdin,'drain');
  if(i%90===0)console.log(`${i/9}% · ${Math.round((Date.now()-start)/1000)} seconds elapsed`);
 }
 enc.stdin.end();const [code]=await done;if(code!==0)throw Error(errors);
 console.log(`READY: ${output}`);if(errors)console.log(errors.slice(-600));
}
await browser.close();


