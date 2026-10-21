"""Render the pitch from newly captured frames only, with original motion design."""
from pathlib import Path
import json, math, subprocess, bisect, functools, textwrap
from PIL import Image, ImageDraw, ImageFont

B=Path(__file__).resolve().parent
ROOT=B.parents[2]
FF=ROOT/".runtime/promo-deps/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
A=B.parent/"assets"
W,H,FPS=1920,1080,30
SC=json.loads((B/"scenes.json").read_text(encoding="utf-8"))
NAVY=(8,15,28); WHITE=(240,247,255); BLUE=(122,175,255); TEAL=(109,231,210)
@functools.lru_cache(None)
def font(n,display=False):
    return ImageFont.truetype(str(A/("SpaceGrotesk.ttf" if display else "DMSans.ttf")),n)
def ease(x): return 1-(1-max(0,min(1,x)))**3
base=Image.new("RGB",(W,H),NAVY)
d=ImageDraw.Draw(base)
for y in range(H):
    d.line((0,y,W,y),fill=(8+int(y/H*7),15+int(y/H*16),28+int(y/H*25)))
for x in range(30,W,60):
    for y in range(30,H,60):d.ellipse((x,y,x+1,y+1),fill=(39,59,80))
logo=Image.open(A/"gerak-icon.png").convert("RGBA").resize((54,54))
base.paste(logo,(72,49),logo)
TAKES={}
for p in (B/"fresh").iterdir():
    if p.is_dir() and (p/"timing.json").exists():
        meta=json.loads((p/"timing.json").read_text())
        TAKES[p.name]=([m["timestamp"]-meta[0]["timestamp"] for m in meta],sorted(p.glob("frame-*.jpg")))
@functools.lru_cache(16)
def frame(path):
    return Image.open(path).convert("RGB")
def footage(name,t):
    ts,files=TAKES[name]
    # Hold the final captured frame rather than loop a live observation.
    ix=min(len(files)-1,max(0,bisect.bisect_right(ts,min(t,ts[-1]))-1))
    return str(files[ix])
@functools.lru_cache(24)
def prepared(path,wide):
    src=frame(path)
    sx,sy=src.width/1280,src.height/720
    box=(590,180,1150,650) if wide else (105,90,445,665)
    box=tuple(int(v*(sx if i%2==0 else sy)) for i,v in enumerate(box))
    return (src.resize((1104,621),Image.Resampling.LANCZOS),
            src.crop(box).resize((560,470) if wide else (355,600),Image.Resampling.LANCZOS))
def text(d,xy,s,n=30,c=WHITE,display=False):
    d.text(xy,s,font=font(n,display),fill=c)
def wrapped(d,xy,s,n,width,c=WHITE,spacing=10):
    words=s.split();line="";yy=xy[1]
    for word in words:
        if d.textlength(line+" "+word,font=font(n))>width and line:
            text(d,(xy[0],yy),line,n,c);yy+=n+spacing;line=word
        else:line=(line+" "+word).strip()
    text(d,(xy[0],yy),line,n,c)
def route(d,t,y=770):
    pts=[(90+i*5.4,y+55*math.sin(i/320*6.28)) for i in range(321)]
    d.line(pts,fill=(35,57,81),width=5)
    k=max(2,min(320,int((t%15)/15*320)))
    d.line(pts[:k],fill=TEAL,width=6)
    for idx,label in [(55,"EDUCATION"),(165,"WORK"),(270,"CARE")]:
        x,yy=pts[idx];d.ellipse((x-9,yy-9,x+9,yy+9),fill=NAVY,outline=TEAL,width=3)
        text(d,(x-50,yy+30),label,22,BLUE,True)
    x,yy=pts[k-1]
    d.rounded_rectangle((x-34,yy-30,x+34,yy+14),9,fill=BLUE,outline=WHITE,width=2)
    d.rectangle((x-22,yy-20,x+22,yy-3),fill=NAVY)
    for xx in (x-22,x+22):d.ellipse((xx-5,yy+10,xx+5,yy+20),fill=WHITE)
CHAPTERS=["THE HUMAN NEED","CIVIC TECH","TRANSPORT VISIBILITY","DATA YOU CAN TRUST","JOURNEY CONNECTIONS","TRAVEL COSTS","COMMUNITY VOICE","RESPONSE DEMO","WHAT IF?","NEARBY ALTERNATIVES","WORKING PROTOTYPE","LET'S MOVE TOGETHER"]
NOTES={1:"Malaysian civic technology prototype",2:"Fresh app capture · Observed positions + estimated motion",3:"No guaranteed arrival predictions",4:"Connections only · service dates and departures not checked",5:"Illustrative budget · estimated fares",6:"Scripted reporting demo · no authority notified",7:"Fictional example · no real repair claimed",8:"Hypothetical closure · no live service change",9:"Straight-line distances · not verified walking directions"}
def render(i,t):
    s=SC[i];im=base.copy();d=ImageDraw.Draw(im)
    text(d,(144,50),"GERAK",38,WHITE,True)
    text(d,(1430,66),"CIVIC TECH / MALAYSIA",21,BLUE)
    text(d,(76,145),f"{i+1:02d} / {CHAPTERS[i]}",22,TEAL,True)
    if i in (0,10,11):
        for j,line in enumerate(s["title"].split("\n")):
            text(d,(76,235+j*117+int(35*(1-ease(t-j*.2)))),line,94,WHITE if j==0 else BLUE,True)
        wrapped(d,(80,505),s["sub"],36,1700,(178,201,225))
        if i==10:
            labels=[("01","Transport feeds"),("02","Journey + fare engine"),("03","Community reports")]
            for k,(num,label) in enumerate(labels):
                x=80+k*590; yy=650+int((1-ease(t-1-k*.3))*100)
                d.rounded_rectangle((x,yy,x+550,yy+190),24,fill=(21,38,60),outline=(45,71,98),width=2)
                text(d,(x+30,yy+24),num,40,TEAL,True);text(d,(x+30,yy+100),label,30)
            text(d,(80,890),"90 automated tests passed  /  Next: a focused rider pilot",28,BLUE)
        else:
            route(d,t)
            if i==11:text(d,(80,895),"Your journey. Your voice.",40,TEAL,True)
    else:
        title=s["title"].replace("\n"," ")
        text(d,(76,196-int(20*(1-ease(t)))),title,64,WHITE,True)
        text(d,(80,285),s["sub"],28,(177,201,225))
        take={1:"bus-3d",2:"bus-3d" if t<7.5 else "overview-2d",3:"bus-2d",4:"journey",5:"budget",6:"report",7:"acknowledged" if t<5 else "in-progress" if t<10 else "resolved",8:"whatif",9:"alternative"}[i]
        ft=max(0,t-.6)
        if i==2 and t>=7.5:ft=t-7.5
        if i==7:ft=t%5
        screen,crop=prepared(footage(take,ft),i in (1,2,3))
        # Large screen plus readable UI detail: both come from this fresh take.
        y=354+int(35*(1-ease(t/.7)))
        d.rounded_rectangle((66,y-8,1186,y+629),20,fill=(37,60,84))
        im.paste(screen,(74,y))
        if i in (1,2,3):
            im.paste(crop,(1260,400))
            d=ImageDraw.Draw(im)
            text(d,(1260,355),"FOLLOW THE MOVEMENT",22,TEAL,True)
            wrapped(d,(1260,890),"Bus visibility connects the network to everyday decisions.",26,550,(180,202,225))
        else:
            im.paste(crop,(1390,354));d=ImageDraw.Draw(im)
            text(d,(1240,375),"IN",27,TEAL,True);text(d,(1240,412),"FOCUS",27,TEAL,True)
            d.line((1260,475,1350,475),fill=TEAL,width=3)
        d=ImageDraw.Draw(im)
        text(d,(80,987),NOTES[i],20,TEAL)
    # BM summary kept separately from the English voice-over.
    if i in (0,10,11):
        wrapped(d,(80,966),s["ms"],23,1760,(179,201,223))
    else:
        # Caption band between title and product footage.
        wrapped(d,(80,325),s["ms"],19,1750,(151,179,207),4)
    d.line((76,1045,1840,1045),fill=(37,57,78),width=3)
    d.line((76,1045,76+1764*(i*15+t)/180,1045),fill=BLUE,width=4)
    if t<.3:im=Image.blend(base,im,ease(t/.3))
    if t>14.65:im=Image.blend(base,im,(15-t)/.35)
    return im

if __name__=="__main__":
    output=B/"GERAK-Hackathon-Pitch-Female-1080p.mp4"
    p=subprocess.Popen([str(FF),"-y","-hide_banner","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s","1920x1080","-r","30","-i","pipe:0","-i",str(B/"final-mix-female.wav"),"-map","0:v","-map","1:a","-c:v","libx264","-preset","fast","-crf","19","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-af","loudnorm=I=-16:TP=-1.5:LRA=9","-ar","48000","-t","180","-movflags","+faststart",str(output)],stdin=subprocess.PIPE)
    for i in range(12):
        for f in range(450):
            im=render(i,f/30)
            if f==180:im.save(B/f"final-preview-{i:02d}.jpg",quality=90)
            p.stdin.write(im.tobytes())
        print(f"Rendered scene {i+1}/12",flush=True)
    p.stdin.close()
    if p.wait():raise RuntimeError("Video encoding failed")
    print(output,flush=True)
