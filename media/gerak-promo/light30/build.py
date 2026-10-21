from pathlib import Path
import sys, json, math, bisect, functools, subprocess, asyncio, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont
B=Path(__file__).resolve().parent; ROOT=B.parents[2]
sys.path.insert(0,str(ROOT/".runtime/promo-deps"))
FF=ROOT/".runtime/promo-deps/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
A=B.parent/"assets"
SCRIPT="Every journey connects a community. Meet Gerak. Follow buses in three D and two D. Explore connections, estimated fares, and your monthly budget. Give local transport problems a voice, with community reporting. Test a hypothetical stop closure and explore other boarding options. Clearer information. Stronger communities. Gerak. Your journey. Your voice."
W,H,FPS=1920,1080,30
INK="#102849";BLUE="#2458e5";TEAL="#008d85";BG="#f5f8ff"
SC=[(0,3,"Every journey.\nA connection.","intro"),(3,9,"See your city\nin motion.","bus"),(9,13,"Find your\nconnection.","journey-final"),(13,16,"Make costs\nclearer.","budget"),(16,21,"Your voice.\nReal potential.","response"),(21,25,"What if?\nExplore another way.","whatif"),(25,30,"Your journey.\nYour voice.","end")]
@functools.lru_cache(None)
def font(n,bold=False):
 f=ImageFont.truetype(str(A/("SpaceGrotesk.ttf" if bold else "DMSans.ttf")),n)
 if bold:
  try:f.set_variation_by_axes([650])
  except Exception:pass
 return f
def ease(x):return 1-(1-max(0,min(1,x)))**3
def drawtext(d,p,s,n=40,c=INK,b=False):d.text(p,s,font=font(n,b),fill=c)
def pill(d,p,s,c=BLUE):
 x,y=p;width=d.textlength(s,font=font(25,True))+46
 d.rounded_rectangle((x,y,x+width,y+54),27,fill=c);drawtext(d,(x+23,y+10),s,25,"white",True)
logo=Image.open(A/"gerak-icon.png").convert("RGBA")
TAKES={}
for p in (B/"fresh").iterdir():
 if p.is_dir() and (p/"timing.json").exists():
  m=json.loads((p/"timing.json").read_text());TAKES[p.name]=([v["timestamp"]-m[0]["timestamp"] for v in m],sorted(p.glob("frame-*.jpg")))
@functools.lru_cache(20)
def read(path):return Image.open(path).convert("RGB")
def take(name,t):
 ts,files=TAKES[name];i=min(len(files)-1,max(0,bisect.bisect_right(ts,t)-1))
 return read(str(files[i]))
def bus(d,x,y,scale=1):
 d.rounded_rectangle((x-65*scale,y-30*scale,x+65*scale,y+27*scale),12*scale,fill=BLUE)
 for k in range(4):d.rounded_rectangle((x+(-53+k*28)*scale,y-20*scale,x+(-32+k*28)*scale,y+3*scale),3*scale,fill="#c2e7ff")
 for xx in (x-42*scale,x+42*scale):d.ellipse((xx-9*scale,y+18*scale,xx+9*scale,y+36*scale),fill=INK)
def render(t):
 idx=next(i for i,s in enumerate(SC) if s[0]<=t<s[1]);start,end,title,kind=SC[idx];u=t-start;dur=end-start
 im=Image.new("RGB",(W,H),BG);d=ImageDraw.Draw(im)
 # Drifting architectural grid and oversized circular accents.
 for x in range(-100,W+100,100):d.line((x+int(t*7)%100,0,x+int(t*7)%100,H),fill="#e9eef8",width=1)
 for y in range(0,H,100):d.line((0,y,W,y),fill="#e9eef8",width=1)
 d.ellipse((1370+30*math.sin(t),-400,2300,520),fill="#e5eeff")
 d.ellipse((-400,700,-50+60*math.cos(t),1200),fill="#d9f4ee")
 small=logo.resize((58,58));im.paste(small,(72,50),small);d=ImageDraw.Draw(im)
 drawtext(d,(146,54),"GERAK",38,INK,True);drawtext(d,(1470,65),"CIVIC TECH / MALAYSIA",21,TEAL)
 if kind in ("intro","end"):
  for j,line in enumerate(title.split("\n")):
   offset=int(100*(1-ease((u-j*.17)/.65)))
   drawtext(d,(100+offset,205+j*135),line,112,INK if j==0 else BLUE,True)
  if kind=="intro":
   pill(d,(110,535),"Connecting people to everyday life",TEAL)
  else:
   pill(d,(110,535),"TRANSPORT + COMMUNITY",TEAL)
   drawtext(d,(110,615),"Perjalanan anda. Suara anda.",35,INK)
  points=[(110+k*5.3,790+55*math.sin(k/320*math.pi*2)) for k in range(321)]
  d.line(points,fill="#cbd9ef",width=12)
  k=max(2,min(320,int(ease(u/dur)*320)));d.line(points[:k],fill=BLUE,width=12)
  for p,label in [(55,"LEARN"),(160,"WORK"),(270,"CONNECT")]:
   x,y=points[p];d.ellipse((x-12,y-12,x+12,y+12),fill="white",outline=TEAL,width=5);drawtext(d,(x-40,y+35),label,24,INK,True)
  bus(d,*points[k-1],.9)
 else:
  # Full-screen product cards sweep in from the right, with continuous gentle camera movement.
  name=kind
  if kind=="budget":name="budget-final"
  if kind=="bus":name="bus" if u<3.6 else "map"
  footage=take(name,max(0,u if name!="map" else u-3.6))
  if kind=="bus":
   box=(int(footage.width*.355),int(footage.height*.11),footage.width,int(footage.height*.95))
   footage=footage.crop(box)
  else:
   box=(int(footage.width*.08),int(footage.height*.105),int(footage.width*.36),int(footage.height*.94))
   footage=footage.crop(box)
  x=790+int(550*(1-ease(u/.65)));y=175+int(math.sin(u*1.3)*7)
  fw,fh=(1040,730) if kind=="bus" else (470,790)
  shot=footage.resize((fw,fh),Image.Resampling.LANCZOS)
  d.rounded_rectangle((x+14,y+18,x+fw+14,y+fh+18),28,fill="#dce5f4")
  mask=Image.new("L",(fw,fh));ImageDraw.Draw(mask).rounded_rectangle((0,0,fw,fh),26,fill=255)
  im.paste(shot,(x,y),mask);d=ImageDraw.Draw(im)
  for j,line in enumerate(title.split("\n")):drawtext(d,(80+int(60*(1-ease((u-j*.12)/.5))),235+j*100),line,76 if kind!="whatif" else 65,INK if j==0 else BLUE,True)
  labels={"bus":["3D FOLLOW","2D OVERVIEW","GPS FRESHNESS"],"journey-final":["ROUTE CONNECTIONS","ESTIMATED FARES"],"budget":["MONTHLY BUDGET","PLAN YOUR SPENDING"],"response":["REPORT A BARRIER","FOLLOW THE DEMO RESPONSE"],"whatif":["HYPOTHETICAL CLOSURE","BOARDING ALTERNATIVES"]}
  for j,label in enumerate(labels[kind]):
   p=ease((u-.5-j*.28)/.5)
   if p>0:pill(d,(85+int((1-p)*80),510+j*76),label,BLUE if j%2==0 else TEAL)
  if kind!="bus":
   # Animated civic diagram gives the feature a human meaning.
   cx=1545;cy=455
   d.ellipse((cx-125,cy-125,cx+125,cy+125),fill="#e0edff",outline="#c1d5ff",width=3)
   sym={"journey-final":"A → B","budget":"RM","response":"+","whatif":"?"}[kind]
   drawtext(d,(cx-80,cy-65),sym,92,BLUE,True)
   for k in range(6):
    a=u*.7+k*math.pi/3;xx=cx+160*math.cos(a);yy=cy+160*math.sin(a)
    d.ellipse((xx-7,yy-7,xx+7,yy+7),fill=TEAL)
   note={"journey-final":"Connect to your day.","budget":"Every ringgit matters.","response":"A stronger local voice.","whatif":"Plan for disruption."}[kind]
   drawtext(d,(1320,725),note,29,INK,True)
  # Tap pulse emphasises an interface interaction without disguising it as captured input.
  phase=(u%1.6)/1.6;rr=12+55*phase
  tx=x+fw*.7;ty=y+fh*.62
  if .5<u<2.5:
   d.ellipse((tx-rr,ty-rr,tx+rr,ty+rr),outline=BLUE,width=max(1,int(5*(1-phase))))
   d.ellipse((tx-7,ty-7,tx+7,ty+7),fill=BLUE)
  caveat={"bus":"Fresh capture · observed GPS and estimated movement","journey-final":"Connections and fares are estimates · no guaranteed arrivals","budget":"Illustrative planning · actual fares follow operator tables","response":"Scripted reporting demo · no authority response claimed","whatif":"Hypothetical scenario · not a live service alert"}[kind]
  drawtext(d,(84,976),caveat,22,TEAL)
 # Persistent progressing route with feature stops.
 d.line((80,1034,1840,1034),fill="#cedaef",width=5);d.line((80,1034,80+1760*t/30,1034),fill=BLUE,width=5)
 for mark in [3,9,13,16,21,25]:xx=80+1760*mark/30;d.ellipse((xx-5,1029,xx+5,1039),fill=TEAL)
 # Quick blue wipe between chapters, instead of repetitive fade-to-black.
 if u<.2 and idx>0:
  edge=int(W*(1-ease(u/.2)));d.rectangle((0,0,edge,H),fill=BLUE)
 return im
async def speech():
 import edge_tts
 await edge_tts.Communicate(SCRIPT,"en-US-AvaNeural",rate="+8%").save(str(B/"female.mp3"))
def audio():
 rate=48000;n=rate*30;mix=np.zeros((n,2));rng=np.random.default_rng(18)
 def put(sig,at,gain=1):
  st=int(at*rate);sz=min(len(sig),n-st)
  if sz>0:mix[st:st+sz]+=sig[:sz,None]*gain
 # Original upbeat 120 BPM synth score, with kick, clap and plucked arpeggio.
 chords=[[50,57,62,66],[46,53,58,62],[53,60,65,69],[48,55,60,64]]
 for beat in range(60):
  at=beat*.5;ch=chords[(beat//8)%4]
  t=np.arange(int(rate*.4))/rate;freq=440*2**((ch[beat%4]+12-69)/12)
  put((np.sin(2*np.pi*freq*t)+.2*np.sin(4*np.pi*freq*t))*np.exp(-t*12),at,.055)
  t=np.arange(int(rate*.2))/rate
  put(np.sin(2*np.pi*(48*t+1.5*(1-np.exp(-t*30))))*np.exp(-t*23),at,.1)
  if beat%2:put(rng.normal(size=len(t))*np.exp(-t*40),at,.018)
  if beat%8==0:
   t=np.arange(rate*4)/rate;pad=sum(np.sin(2*np.pi*440*2**((v-69)/12)*t) for v in ch)/4
   put(pad*np.sin(np.pi*t/4)**2,at,.055)
 for at in [3,9,13,16,21,25]:
  t=np.arange(int(rate*.32))/rate;noise=np.convolve(rng.normal(size=len(t)),np.ones(10)/10,"same")
  put(noise*np.sin(np.pi*t/.32)**2,at-.12,.14)
  t=np.arange(int(rate*.18))/rate;put(np.sin(2*np.pi*980*t)*np.exp(-t*30),at+.4,.035)
 subprocess.run([str(FF),"-y","-loglevel","error","-i",str(B/"female.mp3"),"-ar",str(rate),"-ac","1",str(B/"voice.wav")],check=True)
 with wave.open(str(B/"voice.wav"),"rb") as w:voice=np.frombuffer(w.readframes(w.getnframes()),dtype="<i2")/32768
 if len(voice)>rate*28:
  factor=len(voice)/(rate*28)
  subprocess.run([str(FF),"-y","-loglevel","error","-i",str(B/"voice.wav"),"-af",f"atempo={factor}","-ar",str(rate),str(B/"paced.wav")],check=True)
  with wave.open(str(B/"paced.wav"),"rb") as w:voice=np.frombuffer(w.readframes(w.getnframes()),dtype="<i2")/32768
 put(voice,.45,.95)
 mix*=np.minimum(np.arange(n)/rate/.2,1)[:,None]*np.minimum((n-np.arange(n))/rate/.7,1)[:,None]
 mix=np.clip(mix,-.95,.95)
 with wave.open(str(B/"mix.wav"),"wb") as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes((mix*32767).astype("<i2").tobytes())
def video():
 output=B/"GERAK-30s-Light-Launch.mp4"
 p=subprocess.Popen([str(FF),"-y","-hide_banner","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s","1920x1080","-r","30","-i","pipe:0","-i",str(B/"mix.wav"),"-c:v","libx264","-preset","fast","-crf","18","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-af","loudnorm=I=-16:TP=-1.5:LRA=9","-ar","48000","-t","30","-movflags","+faststart",str(output)],stdin=subprocess.PIPE)
 for f in range(900):
  im=render(f/30)
  if f in [45,150,330,435,555,690,825]:im.save(B/f"preview-{f:03d}.jpg",quality=95)
  p.stdin.write(im.tobytes())
  if f%150==0:print(f"Rendered {f/30:.0f}/30 seconds",flush=True)
 p.stdin.close()
 if p.wait():raise RuntimeError("Encode failed")
 print(output,flush=True)
if __name__=="__main__":
 (B/"script.txt").write_text(SCRIPT,encoding="utf-8")
 if "--speech" in sys.argv:asyncio.run(speech())
 if "--audio" in sys.argv:audio()
 if "--video" in sys.argv:video()
