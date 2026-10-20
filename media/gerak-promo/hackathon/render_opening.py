"""Original motion-graphic opening; no existing video footage is used."""
from pathlib import Path
import math, subprocess
from PIL import Image, ImageDraw, ImageFont

B = Path(__file__).resolve().parent
ROOT = B.parents[2]
ASSETS = B.parent / "assets"
FF = ROOT / ".runtime/promo-deps/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
W,H,FPS=1920,1080,30
fonts={}
def font(size,display=False):
    key=(size,display)
    if key not in fonts:fonts[key]=ImageFont.truetype(str(ASSETS/("SpaceGrotesk.ttf" if display else "DMSans.ttf")),size)
    return fonts[key]
def ease(x):return 1-(1-max(0,min(1,x)))**3
def blend(a,b,k):return tuple(round(x+(y-x)*k) for x,y in zip(a,b))
navy=(8,15,28); white=(240,247,255); blue=(122,175,255); teal=(109,231,210)
base=Image.new("RGB",(W,H),navy)
d=ImageDraw.Draw(base)
for y in range(H):
    d.line((0,y,W,y),fill=blend(navy,(15,32,53),y/H))
for x in range(50,W,60):
    for y in range(40,H,60):d.ellipse((x,y,x+1,y+1),fill=(38,58,81))
logo=Image.open(ASSETS/"gerak-icon.png").convert("RGBA").resize((52,52))
base.paste(logo,(90,65),logo)
path=[(160+i*5, 687+math.sin(i/320*math.pi*2-.7)*65) for i in range(321)]
def render(t):
    im=base.copy(); d=ImageDraw.Draw(im)
    d.text((159,66),"GERAK",font=font(37,True),fill=white)
    d.text((1440,78),"CIVIC TECH / MALAYSIA",font=font(21),fill=blue)
    lines=[("A city moves.",white),("People connect.",blue)]
    for j,(text,color) in enumerate(lines):
        p=ease((t-.25-j*.3)/1.2)
        if p:
            layer=Image.new("RGBA",(W,H))
            ld=ImageDraw.Draw(layer)
            ld.text((92,210+j*126+(1-p)*45),text,font=font(112,True),fill=(*color,int(p*255)))
            im=Image.alpha_composite(im.convert("RGBA"),layer).convert("RGB");d=ImageDraw.Draw(im)
    if t>1.1:
        d.text((98,497),"Every journey connects someone to something important.",font=font(32),fill=blend(navy,(184,204,226),ease(t-1.1)))
    d.line(path,fill=(39,62,88),width=3)
    progress=min(.985,max(0,(t-1)/12))
    count=max(2,int(progress*(len(path)-1)))
    for width,color in [(17,(18,48,71)),(9,(26,82,107)),(4,teal)]:
        d.line(path[:count],fill=color,width=width)
    for j,(label,labelms) in enumerate([("EDUCATION","Pendidikan"),("WORK","Pekerjaan"),("CARE","Penjagaan")]):
        index=[65,170,275][j];x,y=path[index];lit=count>=index
        c=teal if lit else (102,126,154)
        d.line((x,y+13,x,y+47),fill=c,width=2)
        d.ellipse((x-9,y-9,x+9,y+9),fill=navy,outline=c,width=3)
        d.text((x-55,y+57),label,font=font(23,True),fill=c)
        d.text((x-55,y+89),labelms,font=font(18),fill=(154,176,199))
    x,y=path[count-1]
    d.rounded_rectangle((x-36,y-27,x+36,y+15),radius=10,fill=blue,outline=white,width=2)
    d.rounded_rectangle((x-24,y-18,x+24,y-1),radius=3,fill=(15,32,53))
    for wx in [x-21,x+21]:d.ellipse((wx-6,y+10,wx+6,y+22),fill=navy,outline=white,width=2)
    d.text((98,953),"Bas menghubungkan kita dengan pendidikan, pekerjaan dan penjagaan kesihatan.",font=font(25),fill=(183,204,225))
    d.text((98,1013),"Original motion graphic · Illustrative connection",font=font(17),fill=(127,152,179))
    d.line((98,994,1822,994),fill=(41,62,85),width=2)
    d.line((98,994,98+1724*t/15,994),fill=blue,width=3)
    if t<.35 or t>14.5:
        alpha=ease(t/.35) if t<.35 else max(0,(15-t)/.5)
        im=Image.blend(Image.new("RGB",(W,H),navy),im,alpha)
    return im

output=B/"GERAK-Fresh-Opening-Female-1080p.mp4"
p=subprocess.Popen([str(FF),"-y","-hide_banner","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","pipe:0","-i",str(B/"final-mix-female.wav"),"-map","0:v","-map","1:a","-c:v","libx264","-preset","fast","-crf","18","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-af","loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=out:st=14.5:d=0.5","-t","15","-movflags","+faststart",str(output)],stdin=subprocess.PIPE)
for frame in range(15*FPS):
    im=render(frame/FPS)
    if frame==240:im.save(B/"opening-preview.png")
    p.stdin.write(im.tobytes())
    if frame%90==0:print(f"Opening render {frame//FPS}/15 seconds",flush=True)
p.stdin.close()
if p.wait():raise RuntimeError("Opening encode failed")
print(output)
