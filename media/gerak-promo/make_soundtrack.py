"""Original 120 BPM electronic cue, synthesized locally; no sampled recordings."""
from pathlib import Path
import wave
import numpy as np

RATE = 48000
SECONDS = 30
rng = np.random.default_rng(721)
mix = np.zeros((RATE * SECONDS, 2), dtype=np.float64)

def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)

def put(sound, when, gain=1, pan=0):
    start = round(when * RATE)
    end = min(len(mix), start + len(sound))
    if end <= start or start < 0:
        return
    if sound.ndim == 1:
        stereo = np.column_stack((sound * np.sqrt((1-pan)/2), sound * np.sqrt((1+pan)/2)))
    else:
        stereo = sound
    mix[start:end] += stereo[:end-start] * gain

def pluck(note, length=.48, bright=1):
    t = np.arange(int(RATE*length))/RATE
    f = hz(note)
    sig = np.sin(2*np.pi*f*t) + .25*bright*np.sin(2*np.pi*f*2*t) + .1*bright*np.sin(2*np.pi*f*3*t)
    return sig * (1-np.exp(-t*500)) * np.exp(-t*11) * np.minimum(1,(length-t)/.04)

def chord(notes, length=2.3):
    t = np.arange(int(RATE*length))/RATE
    env = np.minimum(t/.17,1) * np.minimum((length-t)/.7,1)
    stereo = np.zeros((len(t),2))
    for note in notes:
        for side in range(2):
            f=hz(note)*(1+(-1 if side==0 else 1)*.0015)
            for k in range(1,5):
                stereo[:,side] += np.sin(2*np.pi*f*k*t+.12*k)/k**1.9
    # Gentle rhythm-linked ducking keeps the low end and pads distinct.
    pump=.54+.46*(1-np.exp(-((t+.01)%.5)*11))
    return stereo*env[:,None]*pump[:,None]/len(notes)

def kick():
    t=np.arange(int(.38*RATE))/RATE
    phase=2*np.pi*(48*t+108*.022*(1-np.exp(-t/.022)))
    return np.sin(phase)*np.exp(-t*12)+rng.normal(0,.05,len(t))*np.exp(-t*180)

def snare():
    t=np.arange(int(.23*RATE))/RATE
    noise=rng.normal(0,1,len(t)); high=np.concatenate(([0],np.diff(noise)))
    return (high*.21+np.sin(2*np.pi*185*t)*.26)*np.exp(-t*23)*(1-np.exp(-t*1200))

def hat(opened=False):
    dur=.19 if opened else .065
    t=np.arange(int(dur*RATE))/RATE
    noise=rng.normal(0,1,len(t)); high=np.concatenate(([0],np.diff(noise)))
    return high*.12*np.exp(-t*(24 if opened else 65))

progression=[[50,57,60,64],[46,53,57,62],[53,57,60,64],[48,55,60,62]]
roots=[38,34,41,36]
for bar in range(15):
    st=bar*2
    idx=bar%4
    put(chord(progression[idx]),st,.26 if st<4 else .22)
    for step in range(8):
        note=progression[idx][[0,2,1,3,2,1,3,2][step]]+12
        amp=.10 if st<4 else .14
        if st<28:
            snd=pluck(note)
            pan=(-.55,.55)[step%2]
            put(snd,st+step*.25,amp,pan)
            put(snd,st+step*.25+.375,amp*.30,-pan)
    if 4<=st<28:
        for off in [0,.5,1,1.5]:
            put(kick(),st+off,.67)
        for off in [.5,1.5]:
            put(snare(),st+off,.40,.04)
        for step in range(8):
            put(hat(step%4==3),st+step*.25,.25 if step%2 else .15,(-.35,.35)[step%2])
        for off,dur in [(0,.34),(.75,.18),(1,.34),(1.5,.20),(1.75,.18)]:
            tt=np.arange(int(dur*RATE))/RATE
            f=hz(roots[idx]);sig=np.sin(2*np.pi*f*tt)+.22*np.sin(2*np.pi*f*2*tt)
            sig*=np.minimum(tt/.008,1)*np.minimum((dur-tt)/.05,1)
            put(sig,st+off,.30)

# Spacious hook, punctuated by rests so the typography can breathe.
melody=[(0,74),(.75,77),(1.5,81),(2.75,79),(3.5,77),(4,76),(5,74),(6.5,72)]
for base in [8,16,24]:
    for off,note in melody:
        if base+off>=28: continue
        snd=pluck(note,.9,.3)
        put(snd,base+off,.14,.12)
        put(snd,base+off+.375,.05,-.4)
        put(snd,base+off+.75,.025,.4)

# Short transition swells and soft impacts on the scene changes.
for cut in [4,9,14,19,24]:
    tt=np.arange(int(.65*RATE))/RATE
    noise=rng.normal(0,1,len(tt))
    smoothed=np.convolve(noise,np.ones(21)/21,mode='same')
    put(smoothed*np.sin(np.pi*tt/.65)**1.5,cut-.4,.19,-.15)
    tt=np.arange(int(.6*RATE))/RATE
    put(np.sin(2*np.pi*56*tt)*np.exp(-tt*9),cut,.22)

put(chord([50,57,60,64,69],2.0),28,.4)
put(kick(),28,.55)
tt=np.arange(len(mix))/RATE
mix*=np.minimum(tt/.12,1)[:,None]*np.minimum((30-tt)/.9,1)[:,None]
mix=np.tanh(mix*1.35)
mix*=.88/max(np.max(np.abs(mix)),.001)
out=Path(__file__).parent/'soundtrack-original.wav'
with wave.open(str(out),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE)
    w.writeframes((mix*32767).astype('<i2').tobytes())
print(f'Soundtrack: {out} | 30s stereo 48 kHz | peak {np.max(np.abs(mix)):.3f}')
