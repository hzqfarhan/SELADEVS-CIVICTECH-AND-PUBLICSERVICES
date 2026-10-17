import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
export async function captureClip(page,base,name,seconds,actions=[]){
  const fps=20,frames=Math.round(seconds*fps);
  const ffmpeg=resolve('.runtime/promo-deps/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
  const output=resolve(base,'recordings',name+'.mp4');
  const enc=spawn(ffmpeg,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-threads','2','-preset','veryfast','-crf','17','-color_range','tv','-colorspace','bt709','-r','30','-an','-movflags','+faststart',output],{stdio:['pipe','ignore','pipe'],windowsHide:true});
  let error='';enc.stderr.on('data',d=>error+=d.toString());const closed=once(enc,'close');
  const start=performance.now();let actionIndex=0;
  for(let i=0;i<frames;i++){
    while(actionIndex<actions.length&&i/fps>=actions[actionIndex].at){await actions[actionIndex++].run();}
    const shot=await page.screenshot({type:'jpeg',quality:96});
    if(!enc.stdin.write(shot))await once(enc.stdin,'drain');
    const delay=(i+1)*1000/fps-(performance.now()-start);
    if(delay>0)await new Promise(r=>setTimeout(r,delay));
  }
  enc.stdin.end();const [code]=await closed;
  if(code!==0)throw new Error(error);
  const info={output,seconds,fps,frames,wallSeconds:(performance.now()-start)/1000};
  await writeFile(resolve(base,'recordings',name+'.json'),JSON.stringify(info,null,2));
  return info;
}
