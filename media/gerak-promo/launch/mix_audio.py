from pathlib import Path
import wave
import numpy as np

base = Path(__file__).resolve().parent
with wave.open(str(base.parent / 'soundtrack-original.wav'), 'rb') as source:
    rate = source.getframerate()
    channels = source.getnchannels()
    assert source.getsampwidth() == 2 and channels == 2
    track = np.frombuffer(source.readframes(source.getnframes()), dtype='<i2').astype(np.float64).reshape(-1, 2) / 32768
track *= .9

def tone(at, frequency, seconds=.20, volume=.055, pan=0):
    t = np.arange(int(rate * seconds)) / rate
    envelope = np.minimum(t / .008, 1) * np.exp(-t * 15)
    sound = volume * envelope * (np.sin(2*np.pi*frequency*t) + .2*np.sin(2*np.pi*frequency*2*t))
    start = int(at*rate)
    track[start:start+len(t), 0] += sound * (1-pan*.25)
    track[start:start+len(t), 1] += sound * (1+pan*.25)

tone(15.0, 659, .24, .045, -.3)
tone(20.7, 784, .24, .055)
tone(20.82, 1046, .28, .045)
tone(23.12, 880, .24, .05, -.3)
tone(24.28, 1046, .3, .06, .3)
tone(24.43, 1318, .4, .045, .3)
peak = np.max(np.abs(track))
if peak > .88:
    track *= .88 / peak
with wave.open(str(base / 'launch-soundtrack.wav'), 'wb') as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(rate)
    output.writeframes((np.clip(track, -1, 1) * 32767).astype('<i2').tobytes())
print(f'Original score with civic-action cues: {len(track)/rate:.1f}s stereo')
