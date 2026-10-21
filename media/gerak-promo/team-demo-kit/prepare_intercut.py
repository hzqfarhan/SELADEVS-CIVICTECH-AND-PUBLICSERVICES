"""Cut all seven chapters of the one-minute promo for the team's three-minute edit."""
from pathlib import Path
import csv, subprocess

ROOT=Path(__file__).resolve().parents[3]
BASE=Path(__file__).resolve().parent
SOURCE=ROOT/'media/gerak-promo/light30/minute/GERAK-60s-Light-Launch.mp4'
FF=ROOT/'.runtime/promo-deps/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
CLIPS=[('01-intro',0,6),('02-bus',6,12),('03-journey',18,8),('04-budget',26,6),('05-community',32,10),('06-what-if',42,8),('07-outro',50,10)]
EDIT=[(0,6,'Promo','01-intro-silent.mp4',0,6),(6,18,'Team demo','Problem and network overview','', ''),(18,30,'Promo','02-bus-silent.mp4',6,18),(30,58,'Team demo','Select bus, follow 3D, switch 2D, GPS freshness','',''),(58,66,'Promo','03-journey-silent.mp4',18,26),(66,84,'Team demo','Plan a connection and show estimated fare','',''),(84,90,'Promo','04-budget-silent.mp4',26,32),(90,102,'Team demo','Adjust recurring journey budget','',''),(102,112,'Promo','05-community-silent.mp4',32,42),(112,134,'Team demo','Clearly scripted reporting timeline','',''),(134,142,'Promo','06-what-if-silent.mp4',42,50),(142,160,'Team demo','Hypothetical closure and alternatives','',''),(160,170,'Team demo','BM interaction, sources, next pilot','',''),(170,180,'Promo','07-outro-silent.mp4',50,60)]
with (BASE/'three-minute-edit-list.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.writer(f);w.writerow(['final_start_seconds','final_end_seconds','type','clip_or_action','original_promo_in_seconds','original_promo_out_seconds']);w.writerows(EDIT)
for name,start,duration in CLIPS:
 out=BASE/f'{name}-silent.mp4'
 subprocess.run([str(FF),'-y','-hide_banner','-loglevel','error','-ss',str(start),'-i',str(SOURCE),'-t',str(duration),'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(out)],check=True)
 print(f'{out.name}: {duration}s',flush=True)
