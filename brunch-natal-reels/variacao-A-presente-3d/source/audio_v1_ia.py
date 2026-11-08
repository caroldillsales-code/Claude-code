import numpy as np, wave
SR=44100; DUR=25.0; N=int(SR*DUR)
M=np.zeros((2,N)); X=np.zeros((2,N))   # music bus, sfx bus
rs=np.random.RandomState(11)
def put(bus,sig,t0,pan=0.,g=1.):
    i=int(round(t0*SR)); 
    if i>=N or i+len(sig)<=0: return
    a=max(0,-i); j=min(N,i+len(sig)); s=sig[a:j-i]
    bus[0,i+a:j]+=s*g*np.sqrt((1-pan)/2); bus[1,i+a:j]+=s*g*np.sqrt((1+pan)/2)
def T(d): return np.arange(int(SR*d))/SR
def hz(n): return 440*2**((n-69)/12)
NM={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def mid(s): return 12*(int(s[-1])+1)+NM[s[0]]+(1 if '#' in s else 0)
def lp(x,a):  # one-pole lowpass via cumulative trick (approx w/ FFT)
    n=len(x); f=np.fft.rfftfreq(n,1/SR); H=1/(1+1j*f/a); return np.fft.irfft(np.fft.rfft(x)*H,n)
def hp(x,a):
    n=len(x); f=np.fft.rfftfreq(n,1/SR); H=(1j*f/a)/(1+1j*f/a); return np.fft.irfft(np.fft.rfft(x)*H,n)
# --- instruments
def mbox(f,d=2.4,a=.25):   # music box tine
    t=T(d); s=np.sin(2*np.pi*f*t)*np.exp(-t*2.2)+.35*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*14)+.18*np.sin(2*np.pi*f*8.93*t)*np.exp(-t*22)+.25*np.sin(2*np.pi*f*2*t)*np.exp(-t*4)
    return s*np.minimum(1,t/.002)*a
def celesta(f,d=1.2,a=.12):
    t=T(d); return (np.sin(2*np.pi*f*t)+.3*np.sin(2*np.pi*f*4*t)*np.exp(-t*8))*np.exp(-t*3.5)*np.minimum(1,t/.003)*a
def bassp(f,d=1.3,a=.3):
    t=T(d); return (np.sin(2*np.pi*f*t)+.25*np.sin(4*np.pi*f*t)*np.exp(-t*5))*np.exp(-t*2.6)*np.minimum(1,t/.006)*a
def pad(fs,d,a=.05):
    t=T(d); s=sum(np.sin(2*np.pi*(f*(1+dt))*t+rs.rand()*6) for f in fs for dt in(-.002,0,.002))
    return s*np.minimum(1,t/.5)*np.clip((d-t)/.6,0,1)*a/len(fs)
def bell(f,d=3,a=.2):   # hand bell (inharmonic)
    t=T(d); parts=[(1,1,1.6),(2.0,.5,2.5),(2.76,.35,3.2),(5.4,.2,6),(8.9,.1,9)]
    return sum(g*np.sin(2*np.pi*f*r*t)*np.exp(-t*k) for r,g,k in parts)*np.minimum(1,t/.002)*a
def noise(d): return rs.randn(int(SR*d))
def whoosh(d=.6,a=.25,f0=400,f1=3000):
    n=noise(d); t=T(d); k=t/d
    lo=lp(n,f0); hi=hp(n,f1*.5); s=lo*(1-k)+hi*k*0.7+lp(n,1500)*.6
    return s*np.sin(np.pi*k)**2*a
def whoosh_up(d=.7,a=.25):
    n=noise(d); t=T(d); k=t/d; s=lp(n,500)*(1-k)**2+hp(n,2000)*k**1.5*.8+lp(n,1800)*np.sin(np.pi*k)*.5
    return s*np.sin(np.pi*k)**1.5*a
def boom(a=.6,f=48,d=1.4):
    t=T(d); fr=f*(1+1.5*np.exp(-t*18)); ph=2*np.pi*np.cumsum(fr)/SR
    return np.sin(ph)*np.exp(-t*3)*np.minimum(1,t/.003)*a
def thud(a=.4,f=80):
    t=T(.35); fr=f*(1+2*np.exp(-t*40)); ph=2*np.pi*np.cumsum(fr)/SR
    return (np.sin(ph)*np.exp(-t*14)+lp(noise(.35),900)*np.exp(-t*30)*.4)*a
def pop(a=.15,f=900):
    t=T(.12); fr=f*(1+1.2*np.exp(-t*60)); ph=2*np.pi*np.cumsum(fr)/SR
    return np.sin(ph)*np.exp(-t*35)*a
def tick(a=.05,f=3200):
    t=T(.04); return (np.sin(2*np.pi*f*t)+hp(noise(.04),4000)*.3)*np.exp(-t*140)*a
def clink(f,a=.08):
    t=T(.5); parts=[(1,1,9),(2.62,.6,13),(4.1,.4,18),(5.9,.25,25)]
    return sum(g*np.sin(2*np.pi*f*r*t+rs.rand()*6)*np.exp(-t*k) for r,g,k in parts)*np.minimum(1,t/.0008)*a
def rustle(d=.3,a=.2):   # paper/satin rustle
    n=hp(noise(d),2500); t=T(d); env=np.abs(lp(rs.randn(len(t)),25)); env/=env.max()
    return n*env*np.sin(np.pi*t/d)*a
def sparkle(t0,d,a=.06,n=26,lo=84,hi=108,seed=0):
    r=np.random.RandomState(seed)
    for i in range(n):
        k=i/n; put(X,celesta(hz(lo+(hi-lo)*k+r.randint(-2,3)),.9,a),t0+d*k+r.rand()*.03,pan=r.rand()*1.4-.7)

# ================= MUSIC: waltz (We Wish You a Merry Christmas, traditional) =================
beat=1.25/3; t0=1.62
mel=[('D4',1),
('G4',1),('G4',.5),('A4',.5),('G4',.5),('F#4',.5), ('E4',1),('E4',1),('E4',1), ('A4',1),('A4',.5),('B4',.5),('A4',.5),('G4',.5), ('F#4',1),('D4',1),('D4',1),
('B4',1),('B4',.5),('C5',.5),('B4',.5),('A4',.5), ('G4',1),('E4',1),('D4',.5),('D4',.5), ('E4',1),('A4',1),('F#4',1), ('G4',2),('D4',1),
('G4',1),('G4',1),('G4',1), ('F#4',2),('F#4',1), ('G4',1),('F#4',1),('E4',1), ('D4',2),('A4',1),
('B4',1),('A4',1),('G4',1), ('D5',1),('D4',1),('D4',.5),('D4',.5), ('E4',1),('A4',1),('F#4',1), ('G4',3)]
t=t0
for n,d in mel:
    put(M,mbox(hz(mid(n)+12),2.6,.26),t,pan=.12); t+=d*beat
mel_end=t
CH={'G':[55,59,62],'C':[48,52,55],'A7':[57,61,64,67],'D':[50,54,57],'B7':[47,51,54,57],'Em':[52,55,59],'D7':[50,54,57,60]}
bars=['G','C','A7','D','B7','Em','C','G','G','D','Em','D','G','D7','C','G']
for i,c in enumerate(bars):
    tb=t0+beat+i*1.25; ch=CH[c]
    put(M,bassp(hz(ch[0]-12),1.2,.28),tb)
    for bt in(1,2):
        for k,x in enumerate(ch[:3]): put(M,celesta(hz(x+12),.5,.045),tb+bt*beat+k*.004,pan=-.3+k*.3)
    if i==6: put(M,bassp(hz(50-12),.6,.2),tb+2*beat)
    put(M,pad([hz(x) for x in ch[:3]],1.35,.04),tb)
# final chord tag
tb=t0+beat+16*1.25
for k,x in enumerate([67,71,74,79,83,86]): put(M,mbox(hz(x+12),3,.12),tb+.5+k*.07,pan=-.5+k*.2)
put(M,pad([hz(55),hz(59),hz(62)],3.0,.05),tb)
# intro: anticipation celesta arpeggio during box spin
for i,x in enumerate([79,83,86,91,86,83,79,83,86,91,95,91]):
    put(M,celesta(hz(x),1.0,.06),0.05+i*.125,pan=np.sin(i)*.5)

# ================= SFX (synced to index.html timeline) =================
put(X,whoosh(1.3,.10,300,1500),0.05)                      # box spinning
put(X,rustle(.28,.22),1.38); put(X,rustle(.18,.15),1.5)   # ribbon pull
put(X,pop(.35,520),1.6); put(X,thud(.25,140),1.6)         # lid pops
sparkle(1.62,.95,.05,30,86,110,1)                         # particles fly to text
put(X,whoosh(.9,.22,250,2500),3.0)                        # dive through text
put(X,boom(.55),3.72); 
for k,x in enumerate([67,74,79,83]): put(X,bell(hz(x),2.5,.05),3.74+k*.02)  # title hit
for a in(6.2,8.6,10.8,13.0): put(X,whoosh(.65,.16,350,2600),a-.02,pan=0)   # camera transits
for a in(6.8,9.2,11.4): put(X,tick(.07,2400),a)                            # card lands
put(X,boom(.45,52),13.58)                                  # BRUNCH a vontade
put(X,pop(.1,700),14.35)                                   # music pill
# karaoke word ticks
CAPS=[[0.2,1.55,'Um presente de Natal para si…'],[4.25,6.15,'Croissants dourados para começar bem o dia'],
 [6.85,8.55,'Panetones com sabor a Natal'],[9.25,10.75,'Frutas frescas e coloridas'],[11.45,12.95,'Bolos e docinhos inspirados nas tradições natalinas'],
 [14.7,15.95,'Sirva-se à vontade, ao som de música ao vivo']]
for a,b,txt in CAPS:
    w=txt.split(' '); n=len(w); sp=b-a-.35
    for i in range(n): put(X,tick(.022,3000+i*60),a+sp*i/n)
put(X,whoosh(.6,.15,600,1800)[::-1].copy(),15.95)          # pull back (reverse whoosh)
for i in range(10): put(X,pop(.09,650+i*45),16.5+i*.11,pan=(i%3-1)*.4)    # chips pop
sparkle(17.35,.6,.035,14,91,103,2)                          # "e muitas outras delicias"
put(X,whoosh_up(.75,.22),17.95)                             # camera rises to price stage
for k,(dt,g) in enumerate([(0.364,.5),(0.727,.25),(0.909,.12)]): put(X,thud(g,95),18.25+.65*dt)  # card bounces
frac=lambda x:x-np.floor(x)
for i in range(36): put(X,clink(2600+frac(i*.37)*1800,.05),18.2+frac(i*0.618034)*1.6+0.884,pan=frac(i*.371)-.5)
for i in range(14): put(X,clink(3400+frac(i*.29)*1500,.04),18.2+frac(i*0.618034+.37)*1.6+0.884,pan=frac(i*.371+.48)-.5)
# price counter ticks: each euro step
for n in range(1,20):
    k=1-(1-n/19.9)**(1/3); put(X,tick(.035,1800+n*60),18.6+.8*k)
for k,x in enumerate([84,88,91,96]): put(X,bell(hz(x),2.0,.06),19.4+k*.035)    # ka-ching
put(X,clink(4200,.08),19.4); put(X,clink(5200,.06),19.43)
put(X,whoosh(.25,.12,2000,6000),20.03)                      # strike-through swish
put(X,thud(.4,70),20.5); put(X,pop(.12,300),20.5)           # seal stamp
put(X,whoosh(.6,.12,300,2000),20.9)
for i,x in enumerate([83,86,88,91,93,95]): put(X,bell(hz(x),2.8,.07),21.0+i*.09+.33,pan=-.7+i*.28)  # baubles ring as they land
put(X,whoosh(.35,.12,800,3000),21.55,pan=-.6); put(X,whoosh(.35,.12,800,3000),21.75,pan=.6)
sparkle(22.05,.7,.03,14,88,100,3)
put(X,pop(.2,600),22.62)
for a in(22.65,24.85):                                       # phone trill on shake
    for j in range(6): put(X,celesta(hz(100 if j%2 else 96),.12,.05),a+j*.07)
put(X,pop(.1,800),23.0)

# ================= mix =================
def rev(x,seed,dur=2.4,dec=2.4):
    r=np.random.RandomState(seed); n=int(SR*dur); ir=r.randn(n)*np.exp(-np.arange(n)/SR*dec); ir[:200]=0
    nf=1<<int(np.ceil(np.log2(len(x)+n))); y=np.fft.irfft(np.fft.rfft(x,nf)*np.fft.rfft(ir,nf),nf)[:len(x)]
    return y/(np.abs(y).max()+1e-9)*np.abs(x).max()
mus=np.stack([M[c]+.4*rev(M[c],c+1) for c in(0,1)])
sfx=np.stack([X[c]+.22*rev(X[c],c+5,1.6,3.5) for c in(0,1)])
mus/=np.abs(mus).max(); sfx/=np.abs(sfx).max()
mix=.62*mus+.55*sfx
tt=np.arange(N)/SR; mix*=np.clip((DUR-tt)/.6,0,1)
mix/=np.abs(mix).max()/0.95; mix=np.tanh(mix*1.25)/np.tanh(1.25)
out=(mix.T*32767*.92).astype(np.int16)
with wave.open('audio.wav','wb') as w: w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(out.tobytes())
print('melody end',mel_end,'rms',np.sqrt((mix**2).mean()))
