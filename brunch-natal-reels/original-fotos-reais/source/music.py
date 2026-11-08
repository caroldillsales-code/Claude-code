import numpy as np, wave
SR=44100; DUR=25.0; N=int(SR*DUR)
L=np.zeros(N); Rr=np.zeros(N)
BPM=126; b=60/BPM
def hz(n): return 440*2**((n-69)/12)
NM={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def m(s): return 12*(int(s[-1])+1)+NM[s[0]]+(1 if '#' in s else 0)
def add(sig,t0,pan=0.0,g=1.0):
    i=int(t0*SR); j=min(N,i+len(sig))
    if i>=N: return
    L[i:j]+=sig[:j-i]*g*(1-pan)/1.0*0.5*2**0; Rr[i:j]+=sig[:j-i]*g*(1+pan)*0.5
def bell(f,dur=2.2,amp=.3):
    t=np.arange(int(SR*dur))/SR
    s=(np.sin(2*np.pi*f*t)*np.exp(-t*3)+.45*np.sin(2*np.pi*f*2*t)*np.exp(-t*5)
       +.25*np.sin(2*np.pi*f*3.01*t)*np.exp(-t*7)+.12*np.sin(2*np.pi*f*4.2*t)*np.exp(-t*9)
       +.08*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*12))
    s*=np.minimum(1,t/0.004); return s*amp
def pad(fs,dur,amp=.06):
    t=np.arange(int(SR*dur))/SR; s=np.zeros_like(t)
    for f in fs:
        for d in (-0.15,0,0.15):
            ph=np.random.rand()*6.28
            s+=np.sin(2*np.pi*(f+d)*t+ph)+.3*np.sin(2*np.pi*2*(f+d)*t+ph)
    env=np.minimum(1,t/0.35)*np.minimum(1,(dur-t)/0.4).clip(0)
    return s*env*amp/len(fs)
def bass(f,dur,amp=.22):
    t=np.arange(int(SR*dur))/SR
    return (np.sin(2*np.pi*f*t)+.2*np.sin(4*np.pi*f*t))*np.exp(-t*2.2)*np.minimum(1,t/.01)*amp
def noise(dur): return np.random.randn(int(SR*dur))
def hp(x,k=0.85):  # crude highpass via diff
    y=np.diff(x,prepend=0); return y
def shaker(amp=.05):
    n=noise(.09); n=hp(hp(n)); t=np.arange(len(n))/SR
    return n*np.exp(-t*45)*amp
np.random.seed(3)
# melody (note, beats)
mel=[('B4',1),('B4',1),('B4',2),('B4',1),('B4',1),('B4',2),('B4',1),('D5',1),('G4',1.5),('A4',.5),('B4',4),
('C5',1),('C5',1),('C5',1.5),('C5',.5),('C5',1),('B4',1),('B4',1),('B4',.5),('B4',.5),('B4',1),('A4',1),('A4',1),('B4',1),('A4',2),('D5',2),
('B4',1),('B4',1),('B4',2),('B4',1),('B4',1),('B4',2),('B4',1),('D5',1),('G4',1.5),('A4',.5),('B4',4),
('C5',1),('C5',1),('C5',1.5),('C5',.5),('C5',1),('B4',1),('B4',1),('B4',.5),('B4',.5),('D5',1),('D5',1),('C5',1),('A4',1),('G4',4)]
chords=[('G',[55,59,62]),('G',[55,59,62]),('G',[55,59,62]),('G',[55,59,62]),('C',[48,52,55]),('G',[55,59,62]),('A',[57,61,64]),('D',[50,54,57]),
        ('G',[55,59,62]),('G',[55,59,62]),('G',[55,59,62]),('G',[55,59,62]),('C',[48,52,55]),('G',[55,59,62]),('D',[50,54,57]),('G',[55,59,62])]
mel=mel[:26]+mel[-14:]
chords=chords[:8]+chords[12:]
roots={'G':43,'C':36,'A':45,'D':38}
start=0.55  # intro shimmer first
# intro gliss
for i,n in enumerate([79,83,86,91,95,98]): add(bell(hz(n),2.5,.12),0.02+i*.07,pan=(i/5-.5))
t=start
for n,d in mel:
    add(bell(hz(m(n)),2.0,.26),t,pan=.1); add(bell(hz(m(n)+12),1.2,.05),t+0.003,pan=-.3)
    t+=d*b
for i,(r,ch) in enumerate(chords):
    t0=start+i*4*b
    add(pad([hz(x) for x in ch],4*b+.3),t0)
    add(bass(hz(roots[r]),2*b),t0); add(bass(hz(roots[r]+7),2*b,.15),t0+2*b)
    # celesta arpeggio offbeats
    for k in range(4): add(bell(hz(ch[k%3]+24),.8,.04),t0+(k+.5)*b,pan=.5 if k%2 else -.5)
# sleigh bells on 8ths
tt=start
while tt<DUR: 
    add(shaker(.07 if int(round((tt-start)/(b/2)))%2 else .04),tt,pan=.3); tt+=b/2
# transitions whoosh + hit
def whoosh(dur=.6,amp=.18):
    n=noise(dur); t=np.arange(len(n))/SR
    # sweep by mixing increasingly differentiated noise
    k=t/dur; s=n*(1-k)+hp(n)*k
    env=np.sin(np.pi*k)**2; return s*env*amp
for c in [2.8,6.0,7.0,8.0,9.0,12.2,15.6,19.6]: add(whoosh(.5,.12),c-.3,pan=0)
for c in [3.4,9.4]: add(bass(hz(31),1.2,.5),c)  # deep hits at title drops
# price sparkle + ka-ching chimes
for i,n in enumerate([88,91,95,100]): add(bell(hz(n),1.5,.1),16.9+i*.05)
for i,n in enumerate([93,98]): add(bell(hz(n),1.5,.1),18.35+i*.07)
for i,n in enumerate([86,90,93,98]): add(bell(hz(n),1.8,.08),21.2+i*.06)
# reverb via FFT conv
irn=int(SR*2.2); ti=np.arange(irn)/SR
def rev(x,seed):
    np.random.seed(seed); ir=np.random.randn(irn)*np.exp(-ti*2.6); ir[0]=0
    nf=1<<int(np.ceil(np.log2(len(x)+irn)))
    y=np.fft.irfft(np.fft.rfft(x,nf)*np.fft.rfft(ir,nf),nf)[:len(x)]
    return y/np.max(np.abs(y))*np.max(np.abs(x))
Lw=L+.35*rev(L,1); Rw=Rr+.35*rev(Rr,2)
# master fade out
tt=np.arange(N)/SR; fade=np.clip((DUR-tt)/0.8,0,1); Lw*=fade; Rw*=fade
mx=max(np.abs(Lw).max(),np.abs(Rw).max()); Lw/=mx/0.85; Rw/=mx/0.85
Lw=np.tanh(Lw*1.2)/np.tanh(1.2); Rw=np.tanh(Rw*1.2)/np.tanh(1.2)
out=(np.stack([Lw,Rw],1)*32767*.9).astype(np.int16)
with wave.open('music.wav','wb') as w: w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(out.tobytes())
print('ok', 'melody ends at', t)
