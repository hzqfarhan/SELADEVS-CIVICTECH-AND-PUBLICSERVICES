"""One-minute edit with separately paced narration for each feature."""
import build as design
from pathlib import Path
import asyncio, subprocess, wave, sys
import numpy as np

B=Path(__file__).resolve().parent/"minute"
B.mkdir(exist_ok=True)
FF=design.FF
SCENES=[
 (0,6,"Every journey connects a community."),
 (6,12,"Meet Gerak. Follow buses in three D and two D."),
 (18,8,"Explore connections, estimated fares,"),
 (26,6,"and your monthly budget."),
 (32,10,"Give local transport problems a voice, with community reporting."),
 (42,8,"Test a hypothetical stop closure and explore other boarding options."),
 (50,10,"Clearer information. Stronger communities. Gerak. Your journey. Your voice."),
]
async def speech():
 import edge_tts
 for i,(_,_,words) in enumerate(SCENES):
  p=B/f"voice-{i}.mp3"
  if not p.exists():await edge_tts.Communicate(words,"en-US-AvaNeural",rate="-8%").save(str(p))
  print(f"Voice {i+1}/7",flush=True)
def local_voice():
 # Cuts fall in measured silence gaps of the existing synthetic narration.
 cuts=[0,2.1,5.96,8.74,10.2,14.3,18.6,24.696]
 for i in range(7):
  subprocess.run([str(FF),"-y","-loglevel","error","-ss",str(cuts[i]),"-t",str(cuts[i+1]-cuts[i]),"-i",str(design.B/"voice.wav"),"-af","atempo=0.85","-c:a","libmp3lame","-b:a","192k",str(B/f"voice-{i}.mp3")],check=True)
def audio():
 rate=48000;n=rate*60;mix=np.zeros((n,2));rng=np.random.default_rng(41)
 def put(sig,at,gain=1):
  st=int(at*rate);sz=min(len(sig),n-st)
  if sz>0:mix[st:st+sz]+=sig[:sz,None]*gain
 chords=[[50,57,62,66],[46,53,58,62],[53,60,65,69],[48,55,60,64]]
 for beat in range(80):
  at=beat*.75;ch=chords[(beat//8)%4]
  t=np.arange(int(rate*.6))/rate;freq=440*2**((ch[beat%4]+12-69)/12)
  put(np.sin(2*np.pi*freq*t)*np.exp(-t*8),at,.035)
  if beat%2==0:
   t=np.arange(int(rate*.25))/rate
   put(np.sin(2*np.pi*(48*t+1.2*(1-np.exp(-t*25))))*np.exp(-t*22),at,.055)
  if beat%8==0:
   t=np.arange(rate*6)/rate;pad=sum(np.sin(2*np.pi*440*2**((v-69)/12)*t) for v in ch)/4
   put(pad*np.sin(np.pi*t/6)**2,at,.05)
 for i,(start,duration,_) in enumerate(SCENES):
  wav=B/f"voice-{i}.wav"
  subprocess.run([str(FF),"-y","-loglevel","error","-i",str(B/f"voice-{i}.mp3"),"-ar",str(rate),"-ac","1",str(wav)],check=True)
  with wave.open(str(wav),"rb") as w:v=np.frombuffer(w.readframes(w.getnframes()),dtype="<i2")/32768
  actual=len(v)/rate;available=duration-1.1
  if actual>available:
   paced=B/f"paced-{i}.wav"
   subprocess.run([str(FF),"-y","-loglevel","error","-i",str(wav),"-af",f"atempo={actual/available}",str(paced)],check=True)
   with wave.open(str(paced),"rb") as w:v=np.frombuffer(w.readframes(w.getnframes()),dtype="<i2")/32768
  put(v,start+.5,.95)
  t=np.arange(int(rate*.45))/rate
  put(np.convolve(rng.normal(size=len(t)),np.ones(15)/15,"same")*np.sin(np.pi*t/.45)**2,start,.07)
  put(np.sin(2*np.pi*880*t)*np.exp(-t*25),start+.7,.015)
  print(f"Scene {i+1}: narration {len(v)/rate:.2f}s / {duration}s",flush=True)
 fade=np.minimum(np.arange(n)/rate/.4,1)*np.minimum((n-np.arange(n))/rate/1.5,1)
 mix*=fade[:,None]
 with wave.open(str(B/"mix.wav"),"wb") as w:
  w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes((np.clip(mix,-.95,.95)*32767).astype("<i2").tobytes())
def video():
 output=B/"GERAK-60s-Light-Launch.mp4"
 p=subprocess.Popen([str(FF),"-y","-hide_banner","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s","1920x1080","-r","30","-i","pipe:0","-i",str(B/"mix.wav"),"-c:v","libx264","-preset","fast","-crf","18","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-af","loudnorm=I=-16:TP=-1.5:LRA=9","-ar","48000","-t","60","-movflags","+faststart",str(output)],stdin=subprocess.PIPE)
 for f in range(1800):
  im=design.render(f/60)
  if f in (90,360,660,870,1110,1380,1650):im.save(B/f"preview-{f:04d}.jpg",quality=95)
  p.stdin.write(im.tobytes())
  if f%300==0:print(f"Rendered {f//30}/60 seconds",flush=True)
 p.stdin.close()
 if p.wait():raise RuntimeError("Encoding failed")
 print(output,flush=True)
if __name__=="__main__":
 (B/"script.txt").write_text("\n\n".join(f"{s:02d}–{s+d:02d}s\n{v}" for s,d,v in SCENES),encoding="utf-8")
 if "--speech" in sys.argv:asyncio.run(speech())
 if "--local-voice" in sys.argv:local_voice()
 if "--audio" in sys.argv:audio()
 if "--video" in sys.argv:video()
