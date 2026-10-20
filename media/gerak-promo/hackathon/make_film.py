"""Build script, narration and original music for the GERAK hackathon film."""
import sys, json, asyncio, subprocess, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / ".runtime/promo-deps"))
FF = ROOT / ".runtime/promo-deps/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
VOICE = "en-US-AvaNeural"
VOICE_PREFIX = "voice-ava"
SCENES = [
("A city moves.\nPeople connect.", "Every journey matters.", "A bus is more than a moving dot. It connects someone to a classroom, a workplace, or a clinic. Understanding that journey means understanding what keeps a community moving.", "Bas menghubungkan kita dengan pendidikan, pekerjaan dan penjagaan kesihatan.", "intro"),
("Meet GERAK.", "Your journey. Your voice.", "Meet Gerak. A Malaysian civic technology prototype that brings transport visibility, journey exploration, and community reporting into one experience. Built around a simple idea: clearer information can help people make better everyday decisions.", "GERAK menggabungkan maklumat pengangkutan, perancangan perjalanan dan suara komuniti.", "hero"),
("Follow the journey.", "A real interface. A clearer perspective.", "Start by following a bus. Explore its movement in three dimensions, then switch to a two dimensional overview. Keep the route and its stops in context, while checking when the vehicle position was last observed.", "Ikuti bas dalam paparan 3D atau 2D dan semak masa pemerhatian kedudukannya.", "follow"),
("Trust what you see.", "Observed. Estimated. Unknown.", "Gerak distinguishes observed positions from estimated movement and simulation. Missing information stays missing. If a feed is stale, riders should know. This is transport visibility, without pretending that every moving marker is a guaranteed arrival time.", "GERAK membezakan pemerhatian, anggaran dan simulasi. Data yang tiada tidak direka.", "map"),
("Find your connection.", "From a stop to your next destination.", "Choose your boarding and destination stops. Explore direct connections or a transfer using the available route network. These are connection estimates. Service dates, departure times, and live arrival predictions are not currently checked by the planner.", "Terokai sambungan laluan. Tarikh perkhidmatan dan waktu berlepas belum disemak.", "journey"),
("Make costs visible.", "Explore a journey. Plan a month.", "Where fare information is available, review an estimated cost for your passenger profile. Add recurring journeys to a monthly budget and explore the total. Unknown prices remain clearly marked, so an incomplete estimate is never presented as a complete answer.", "Semak anggaran tambang dan bajet bulanan. Harga yang tidak diketahui ditandakan.", "budget"),
("Your voice belongs\non the map.", "Report the barriers along the way.", "A useful transport system also listens. Gerak supports location based community reports, including access barriers and damaged stops. Riders can describe an issue, attach a location, and see its status through the community and operator views.", "Laporkan halangan akses atau hentian rosak, serta ikuti status laporan.", "report"),
("From a report\nto a response.", "A visible conversation.", "Here, a demonstration report is submitted and acknowledged inside Gerak. Our scripted reporting examples also illustrate a fuller response timeline. These are demonstrations, not claims of a council repair. The goal is a clearer conversation about local transport problems.", "Contoh demonstrasi menunjukkan penghantaran dan penerimaan laporan, bukan pembaikan sebenar.", "response"),
("What if this\nstop closes?", "Explore a disruption before it happens.", "Now test a hypothetical stop closure. Gerak compares connections before and after. The closed stop cannot be used for boarding, alighting, or transfers, while buses may still pass through. The scenario never changes real service information.", "Uji penutupan hentian secara hipotesis tanpa mengubah maklumat perkhidmatan sebenar.", "whatif"),
("Explore another way.", "Alternatives, with their limits visible.", "If the original connection is lost, explore nearby boarding candidates and available fare estimates. Distances are straight line measurements, not verified walking directions. When no alternative is found, Gerak says so. The purpose is informed discussion, not false certainty.", "Terokai hentian alternatif. Jarak garis lurus bukan panduan berjalan yang disahkan.", "alternative"),
("Built to demonstrate.\nReady to learn.", "Working prototype → focused pilot.", "The working prototype combines transport feed adapters, a shared journey and fare engine, and persistent reporting. Ninety automated tests pass. Next comes a focused pilot, measuring whether riders can find connections, understand the information, and report barriers more easily.", "Prototaip ini lulus 90 ujian automatik. Seterusnya, uji kegunaannya bersama penumpang.", "proof"),
("See the movement.\nUnderstand the impact.", "GERAK · Civic Tech", "Gerak brings bus movement and community needs into the same picture. With English and Bahasa Melayu across much of the interface, our next step is to refine accessibility and learn with riders and operators. Gerak. Your journey. Your voice.", "GERAK menghubungkan pergerakan bas dengan keperluan komuniti. Perjalanan anda. Suara anda.", "end"),
]
DATA = [dict(title=a,sub=b,voice=c,ms=d,kind=e,start=i*15,duration=15) for i,(a,b,c,d,e) in enumerate(SCENES)]
BASE.mkdir(exist_ok=True)
(BASE/"scenes.json").write_text(json.dumps(DATA,ensure_ascii=False,indent=2),encoding="utf-8")
(BASE/"script.md").write_text("# GERAK — Your journey. Your voice.\n\n180 seconds · English AI narration · BM summary captions\n\n"+"\n\n".join(f"## {s['start']:03d}–{s['start']+15:03d}s: {s['title'].replace(chr(10),' ')}\n\n{s['voice']}\n\nBM: {s['ms']}" for s in DATA),encoding="utf-8")

async def speech():
    import edge_tts
    for i,s in enumerate(DATA):
        path = BASE/f"{VOICE_PREFIX}-{i:02}.mp3"
        if not path.exists():
            await edge_tts.Communicate(s["voice"],VOICE,rate="+8%").save(str(path))
        print("Narration",i+1,flush=True)

def readwav(path):
    with wave.open(str(path),"rb") as f:
        return np.frombuffer(f.readframes(f.getnframes()),dtype="<i2").astype(np.float32).reshape(-1,f.getnchannels())/32768

def audio():
    rate=48000; seconds=180
    mix=np.zeros((rate*seconds,2),np.float32)
    voice=np.zeros_like(mix)
    rng=np.random.default_rng(22)
    def put(signal,at,gain=1,pan=0):
        start=int(at*rate); n=min(len(signal),len(mix)-start)
        if n<=0:return
        if signal.ndim==1: signal=np.column_stack((signal*np.sqrt((1-pan)/2),signal*np.sqrt((1+pan)/2)))
        mix[start:start+n]+=signal[:n]*gain
    def tone(freq,length):
        t=np.arange(int(rate*length))/rate
        return np.sin(2*np.pi*freq*t)
    # Original evolving four-chord score; no downloaded or sampled music.
    chords=[[50,57,62,65],[46,53,58,62],[53,60,65,69],[48,55,60,64]]
    for beat in range(360):
        at=beat*.5
        chord=chords[(beat//16)%4]
        if beat%8==0:
            t=np.arange(rate*4)/rate
            pad=sum(np.sin(2*np.pi*440*2**((n-69)/12)*t) for n in chord)/4
            put(pad*np.sin(np.pi*t/4)**2,at,.065)
        n=chord[(beat//2)%4]+12
        t=np.arange(int(rate*.42))/rate
        pluck=(tone(440*2**((n-69)/12),.42)+.15*tone(880*2**((n-69)/12),.42))*np.exp(-t*13)
        put(pluck,at,.045,(-.45 if beat%2 else .45))
        if 15<at<171 and beat%2==0:
            t=np.arange(int(rate*.22))/rate
            put(np.sin(2*np.pi*(48*t+38*(1-np.exp(-t*30))/30))*np.exp(-t*24),at,.08)
        if 30<at<165:
            t=np.arange(int(rate*.04))/rate
            noise=rng.standard_normal(len(t))*np.exp(-t*130)
            put(noise,at+.25,.009,.3)
    for i,s in enumerate(DATA):
        raw=BASE/f"{VOICE_PREFIX}-{i:02}.wav"
        subprocess.run([str(FF),"-y","-loglevel","error","-i",str(BASE/f"{VOICE_PREFIX}-{i:02}.mp3"),"-ar",str(rate),"-ac","2",str(raw)],check=True)
        samples=readwav(raw)
        duration=len(samples)/rate
        if duration>13.6:
            subprocess.run([str(FF),"-y","-loglevel","error","-i",str(raw),"-af",f"atempo={duration/13.6:.5f}","-ar",str(rate),"-ac","2",str(BASE/"paced.wav")],check=True)
            samples=readwav(BASE/"paced.wav")
        start=int((s["start"]+.65)*rate)
        voice[start:start+len(samples)]+=samples*.83
        # transition whoosh and a soft two-note interface cue
        t=np.arange(int(rate*.45))/rate
        noise=rng.standard_normal(len(t))
        noise=np.convolve(noise,np.ones(18)/18,mode="same")
        put(noise*np.sin(np.pi*t/.45)**2,s["start"],.09,-.25)
        for freq,delay in [(660,0),(880,.10)]:
            t=np.arange(int(rate*.24))/rate
            put(np.sin(2*np.pi*freq*t)*np.exp(-t*20),s["start"]+1.1+delay,.024,.15)
    mix+=voice
    fade=np.minimum(np.arange(len(mix))/rate/.6,1)*np.minimum((len(mix)-np.arange(len(mix)))/rate/1.3,1)
    mix*=fade[:,None]
    peak=np.max(np.abs(mix))
    if peak>.95:mix*=.95/peak
    with wave.open(str(BASE/"final-mix-female.wav"),"wb") as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes((mix*32767).astype("<i2").tobytes())
    print("Music, narration and effects mixed: 180 seconds",flush=True)

if __name__=="__main__":
    if "--speech" in sys.argv:asyncio.run(speech())
    if "--audio" in sys.argv:audio()
