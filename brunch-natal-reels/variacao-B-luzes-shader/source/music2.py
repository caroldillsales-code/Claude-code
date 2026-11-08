"""Lo-fi Christmas track (Deck the Halls, traditional/public domain) at 96 BPM + SFX synced to the video timeline."""
import numpy as np, wave
SR = 44100; DUR = 30.0; N = int(SR * DUR)
BPM = 96; B = 60 / BPM; BAR = 4 * B
rs = np.random.RandomState(7)
M = np.zeros((2, N)); S = np.zeros((2, N))   # music bus, sfx bus

def hz(n): return 440 * 2 ** ((n - 69) / 12)
def T(d): return np.arange(int(SR * d)) / SR
def add(bus, sig, t0, pan=0.0, g=1.0):
    i = int(t0 * SR)
    if i >= N: return
    if i < 0: sig = sig[-i:]; i = 0
    j = min(N, i + len(sig)); s = sig[:j - i] * g
    bus[0, i:j] += s * np.sqrt((1 - pan) / 2); bus[1, i:j] += s * np.sqrt((1 + pan) / 2)
def lp(x, k=4):  # moving-average lowpass
    return np.convolve(x, np.ones(k) / k, mode='same')
def hp(x): return np.diff(x, prepend=0)

# ---------- instruments ----------
def bell(f, d=1.8, a=.25):
    t = T(d)
    s = (np.sin(2*np.pi*f*t)*np.exp(-t*3) + .45*np.sin(2*np.pi*2*f*t)*np.exp(-t*5)
         + .22*np.sin(2*np.pi*3.01*f*t)*np.exp(-t*8) + .1*np.sin(2*np.pi*4.2*f*t)*np.exp(-t*11))
    return s * np.minimum(1, t / .003) * a
def rhodes(f, d, a=.08):
    t = T(d)
    s = np.sin(2*np.pi*f*t + .6*np.sin(2*np.pi*f*t)*np.exp(-t*4)) + .15*np.sin(2*np.pi*14*f*t)*np.exp(-t*30)
    env = np.minimum(1, t/.006) * (np.exp(-t*1.1)*.7 + .3) * np.clip((d - t)/.15, 0, 1)
    return s * env * (1 + .12*np.sin(2*np.pi*4.5*t)) * a
def bassn(f, d, a=.3):
    t = T(d); s = np.tanh(1.6*(np.sin(2*np.pi*f*t) + .25*np.sin(4*np.pi*f*t)))
    return s * np.minimum(1, t/.01) * np.exp(-t*1.4) * np.clip((d - t)/.05, 0, 1) * a
def kick(a=.7):
    t = T(.45); f = 45 + 80*np.exp(-t*28)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*8) * a
def snare(a=.28):
    t = T(.3); n = lp(rs.randn(len(t)), 3)
    return (n*np.exp(-t*17)*.8 + np.sin(2*np.pi*185*t)*np.exp(-t*25)*.5) * a
def hat(a=.07):
    t = T(.06); return hp(hp(rs.randn(len(t)))) * np.exp(-t*70) * a

# ---------- SFX ----------
def riser(d=.6, a=.13):
    t = T(d); k = t/d; n = rs.randn(len(t))
    s = (n*(1-k) + hp(n)*k*1.5) * k**2
    f = 220 + 1400*k**2; s += .35*np.sin(2*np.pi*np.cumsum(f)/SR) * k**2
    return s * a
def impact(a=.6):
    t = T(1.4); f = 32 + 40*np.exp(-t*6)
    s = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*2.8)
    s += lp(rs.randn(len(t)), 6) * np.exp(-t*18) * .5
    return s * a
def whoosh(d=.45, a=.14):
    t = T(d); k = t/d; n = rs.randn(len(t))
    return (lp(n, 8)*(1-k) + lp(n, 2)*k) * np.sin(np.pi*k)**2 * a
def crackle(d=.6, a=.12):
    s = np.zeros(int(SR*d))
    for _ in range(70):
        i = rs.randint(0, len(s)-200); s[i:i+60] += rs.randn(60)*np.exp(-np.arange(60)/8)*rs.rand()
    return lp(s, 2) * a + whoosh(d, a*.6)
def bloop(f0=280, f1=900, d=.14, a=.16):
    t = T(d); f = f0 + (f1-f0)*(t/d)**.6
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.sin(np.pi*t/d) * a
def chime(notes, gap=.05, a=.1):
    s = np.zeros(int(SR*(gap*len(notes)+1.6)))
    for i, n in enumerate(notes):
        b = bell(hz(n), 1.5, a); j = int(i*gap*SR); s[j:j+len(b)] += b
    return s
def sparkle(n=10, d=.5, a=.05, seed=0):
    r = np.random.RandomState(seed); s = np.zeros(int(SR*(d+.4)))
    for _ in range(n):
        f = r.uniform(2500, 7000); t = T(.25); b = np.sin(2*np.pi*f*t)*np.exp(-t*25)*r.uniform(.4, 1)
        j = int(r.uniform(0, d)*SR); s[j:j+len(b)] += b
    return s * a
def pop(pitch=1.0, a=.17):
    t = T(.09); f = 380*pitch + 700*pitch*(t/.09)
    s = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*38)
    s[:40] += rs.randn(40)*.3
    return s * a
def tick(a=.06):
    t = T(.02); return np.sin(2*np.pi*3200*t)*np.exp(-t*350)*a
def thud(a=.45):
    t = T(.35); f = 50 + 70*np.exp(-t*20); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*12)*a
def chaching(a=.2):
    t = T(.12); ka = lp(rs.randn(len(t)), 3)*np.exp(-t*50)*.6   # drawer clunk
    s = np.zeros(int(SR*1.6)); s[:len(ka)] += ka
    for f, dt in ((2637, .09), (3520, .16), (4186, .16)):
        tt = T(1.3); b = (np.sin(2*np.pi*f*tt) + .5*np.sin(2*np.pi*f*2.76*tt))*np.exp(-tt*4)
        j = int(dt*SR); s[j:j+len(b)] += b*.35
    return s * a
def stretch(a=.08):
    t = T(.5); f = 300 + 360*(t/.5)**1.5 + 12*np.sin(2*np.pi*6*t)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.sin(np.pi*t/.5) * a
def phone_ring(a=.07):
    s = np.zeros(int(SR*1.0))
    for st in (0, .45):
        t = T(.35); m = (np.sin(2*np.pi*20*t) > 0)
        b = (np.sin(2*np.pi*1320*t)*m + np.sin(2*np.pi*1660*t)*(~m)) * np.minimum(1, t/.01) * np.clip((.35-t)/.03, 0, 1)
        j = int(st*SR); s[j:j+len(b)] += b
    return s * a
def beep(f=1800, a=.05):
    t = T(.07); return np.sin(2*np.pi*f*t)*np.clip((.07-t)/.02, 0, 1)*np.minimum(1, t/.005)*a
def swell(d=.8, a=.06):  # warm "sunrise" pad swell
    t = T(d); k = t/d; s = sum(np.sin(2*np.pi*hz(n)*t) for n in (60, 64, 67, 71))/4
    return s * np.sin(np.pi*k)**1.5 * a

# ---------- MUSIC ----------
# melody: Deck the Halls (traditional) in C, one octave up
A = [('G4',1.5),('F4',.5),('E4',1),('D4',1),('C4',1),('D4',1),('E4',1),('C4',1),
     ('D4',.5),('E4',.5),('F4',.5),('D4',.5),('E4',1.5),('D4',.5),('C4',1),('B3',1),('C4',2)]
F = [('G4',1.5),('F4',.5),('E4',1),('D4',1),('C4',1),('D4',1),('E4',1),('C4',1),
     ('A4',.5),('A4',.5),('A4',.5),('A4',.5),('G4',1.5),('F4',.5),('E4',1),('D4',1),('C4',2)]
NM = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def midi(s): return 12*(int(s[-1])+1) + NM[s[0]]
def play_mel(mel, t0):
    pos = 0
    for n, d in mel:
        sw = .1*B if abs((pos % 1) - .5) < 1e-6 else 0
        add(M, bell(hz(midi(n)+12), 1.6, .24), t0 + pos*B + sw, .1)
        add(M, rhodes(hz(midi(n)), d*B*.95, .05), t0 + pos*B + sw, -.2)
        pos += d
play_mel(A, 2*BAR); play_mel(F, 6*BAR)

CH = {'Cmaj9':([52,55,59,62],36),'Am7':([55,57,60,64],45),'Fmaj7':([53,57,60,64],41),'Dm7':([53,57,60,62],38),
      'G13':([53,59,62,64],43),'C69':([52,57,62,64],36),'Fmaj9':([55,57,60,64],41)}
# (bar, beat offset, chord, beats)
prog = [(0,0,'Cmaj9',2),(0,2,'Fmaj9',2),(1,0,'Cmaj9',2),(1,2,'G13',2),
        (2,0,'Cmaj9',4),(3,0,'Am7',2),(3,2,'Fmaj7',2),(4,0,'Dm7',2),(4,2,'G13',2),(5,0,'Cmaj9',1),(5,1,'G13',1),(5,2,'C69',2),
        (6,0,'Cmaj9',4),(7,0,'Am7',2),(7,2,'Fmaj7',2),(8,0,'Fmaj7',2),(8,2,'G13',2),(9,0,'Dm7',1),(9,1,'G13',1),(9,2,'Cmaj9',2),
        (10,0,'Fmaj9',2),(10,2,'Cmaj9',2),(11,0,'Cmaj9',4)]
for bar, bt, name, beats in prog:
    t0 = bar*BAR + bt*B; notes, root = CH[name]
    for k, n in enumerate(notes): add(M, rhodes(hz(n), beats*B + .1, .045), t0 + k*.012, (k-1.5)*.3)
    if bar >= 1:
        add(M, bassn(hz(root), min(beats, 2)*B*.9), t0)
        if beats == 4: add(M, bassn(hz(root+7), 2*B*.9, .22), t0 + 2*B)
# intro: bell arpeggio as the lights switch on
for i, n in enumerate([72, 76, 79, 83, 84, 88, 91, 95]):
    add(M, bell(hz(n), 1.5, .07), .05 + i*.15, (i/7 - .5))
# drums: bars 1..8 full lo-fi groove, bars 9-10 lighter
for bar in range(1, 12):
    t0 = bar*BAR
    light = bar >= 10
    for kb in ([0, 1.75, 2.5] if not light else [0, 2.5]):
        if bar == 11 and kb > 0: continue
        add(M, kick(.6 if light else .7), t0 + kb*B)
    if not light:
        for sb in (1, 3): add(M, lp(snare(), 2), t0 + sb*B, .05)
    for h in range(8):
        if bar == 11 and h > 3: break
        sw = .1*B if h % 2 else 0
        add(M, hat(.05 if h % 2 else .075), t0 + h*.5*B + sw, .35)
# vinyl crackle bed
cr = np.zeros(N)
for _ in range(900):
    i = rs.randint(0, N-80); cr[i:i+40] += rs.randn(40)*np.exp(-np.arange(40)/6)*rs.rand()**2
cr = lp(cr, 2)*.05 + lp(rs.randn(N), 12)*.004
M[0] += cr; M[1] += cr

# ---------- SFX timeline (matches main2.js) ----------
def plop(a=.12):  # caramel drop hitting
    t = T(.18); f = 1100*np.exp(-t*22) + 260
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*20)*a
def gloop(a=.08):  # gooey stretch
    t = T(.45); f = 420 - 260*(t/.45) + 25*np.sin(2*np.pi*9*t)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*t/.45)*a
def cellophane(d=.5, a=.1, seed=0):
    r = np.random.RandomState(seed); n = r.randn(int(SR*d)); env = np.zeros_like(n)
    for _ in range(int(d*90)):
        i = r.randint(0, len(n)-400); env[i:i+400] += np.exp(-np.arange(400)/60)*r.rand()
    return hp(n)*env*a
def sprinkle_hit(seed, a=.035):
    r = np.random.RandomState(seed); t = T(.03); f = r.uniform(3000, 6000)
    return (np.sin(2*np.pi*f*t) + hp(r.randn(len(t))))*np.exp(-t*250)*a
# hook: lights switching on, star, star -> logo
for i in range(26): add(S, tick(.03), i*1.2/26 + .02, (i/25 - .5)*1.6)
add(S, sparkle(14, 1.1, .035, 1), .0, .2)
add(S, chime([88, 91], .06, .05), .1)
add(S, riser(.6, .1), 1.25 - .6)
add(S, impact(.3), 1.25); add(S, chime([84, 88, 91, 96, 100], .05, .09), 1.25); add(S, sparkle(16, .8, .04, 11), 1.3)
add(S, sparkle(8, .6, .03, 12), 1.7)   # shine across the logo
add(S, pop(.7, .1), 2.5)
add(S, swell(1.0, .07), 3.1)
add(S, sparkle(8, .5, .04, 2), 3.75, -.2)
# title drop
add(S, riser(1.2, .14), 5 - 1.2)
add(S, whoosh(.45, .16), 4.58)
add(S, impact(.5), 5); add(S, chime([84, 88, 91, 96], .03, .08), 5)
add(S, impact(.4), 5.625)
add(S, sparkle(10, .6, .04, 3), 6.45)
TR = {7.5: 'burn', 9.375: 'liquid', 11.25: 'star', 13.75: 'burn', 17.5: 'liquid', 21.25: 'star', 25: 'flake'}
for tc, kind in TR.items():
    add(S, riser(.5, .08), tc - .5)
    if kind == 'burn': add(S, crackle(.6, .12), tc - .25)
    if kind == 'liquid': add(S, bloop(260, 820, .14, .14), tc - .05); add(S, bloop(380, 1100, .12, .1), tc + .1)
    if kind == 'star': add(S, chime([88, 91, 95, 100], .04, .08), tc - .1)
    if kind == 'flake': add(S, chime([96, 100, 103, 108], .05, .06), tc - .1); add(S, sparkle(14, .7, .04, 9), tc)
    add(S, thud(.25), tc)
# panetones recheados: gooey letters + caramel drops
add(S, gloop(.09), 7.75)
for x, td in [(330, 7.95), (455, 8.15), (575, 8.35), (690, 8.6), (800, 8.85)]:
    add(S, bloop(700, 350, .1, .05), td, (x/1080 - .5))            # drop forming
    tland = td + .3 + np.sqrt(max(0, (1150 - 735))/1300)          # reaches the fade zone
    add(S, plop(.1), tland, (x/1080 - .5))
# cobertos de chocolate: pour + sprinkles (same seeded rng as main2.js)
add(S, gloop(.06), 9.6)
seed = 99
def R():
    global seed
    seed = (seed*16807) % 2147483647; return (seed - 1)/2147483646
for k in range(70):
    x = 200 + R()*680; land = 545 + R()*45; t0 = 9.6 + R()*.95; R(); R()
    add(S, sprinkle_hit(k), t0 + np.sqrt(2*(land - 160)/3000), (x - 540)/540*.8)
# árvores de chocolate: cellophane crinkle + ribbon + bow
add(S, cellophane(.6, .1, 21), 11.3)
add(S, whoosh(.35, .1), 12.15); add(S, cellophane(.4, .08, 22), 12.25)
add(S, chime([79, 86, 91], .05, .07), 12.6); add(S, pop(1.1, .1), 12.6)
# buffet à vontade + música
add(S, stretch(.08), 14.05); add(S, whoosh(.5, .08), 14.05)
add(S, chime([84, 91], .1, .06), 15.625)
pent = [1, 1.12, 1.26, 1.5, 1.68, 2, 2.24, 2.52, 3, 3.36]
for j in range(10): add(S, pop(pent[j], .13), 17.5 + B/2*(j + .5), (j % 3 - 1)*.4)
add(S, sparkle(12, .6, .04, 5), 20.625)
# price
add(S, whoosh(.35, .14), 21.15); add(S, impact(.3), 21.25)
tt = 21.4
while tt < 22.47: add(S, tick(.05), tt); tt += .065
add(S, impact(.55), 22.5); add(S, chaching(.24), 22.5); add(S, sparkle(18, .8, .04, 6), 22.53)
add(S, whoosh(.3, .1), 23.05)
add(S, whoosh(.2, .1), 23.75)
add(S, thud(.55), 24.37); add(S, sparkle(10, .5, .04, 7), 24.4)
# CTA
add(S, chime([84, 88, 91], .05, .07), 25.0)
add(S, whoosh(.35, .12), 25.5); add(S, whoosh(.35, .12), 26.13)
for q in range(4): add(S, beep(1760 if q % 2 == 0 else 1320, .045), 26.875 + q*B/4)
add(S, pop(.9, .14), 27.5); add(S, phone_ring(.07), 27.65); add(S, phone_ring(.05), 29.55)
add(S, pop(1.2, .1), 28.125)
add(S, sparkle(20, 1.0, .03, 8), 28.75)

# ---------- mix ----------
irn = int(SR*2.0); ti = np.arange(irn)/SR
def rev(x, seed, decay=2.8):
    r = np.random.RandomState(seed); ir = r.randn(irn)*np.exp(-ti*decay); ir[:200] = 0
    nf = 1 << int(np.ceil(np.log2(len(x)+irn)))
    y = np.fft.irfft(np.fft.rfft(x, nf)*np.fft.rfft(ir, nf), nf)[:len(x)]
    return y/(np.abs(y).max()+1e-9)*np.abs(x).max()
out = np.zeros((2, N))
for c in range(2):
    m = M[c] + .28*rev(M[c], 1+c); s = S[c] + .2*rev(S[c], 3+c, 3.5)
    out[c] = m*.85 + s*1.0
t = np.arange(N)/SR
out *= np.clip((DUR - t)/1.0, 0, 1)
out /= np.abs(out).max()/0.9
out = np.tanh(out*1.9)/np.tanh(1.9)
pcm = (out.T*32767*.92).astype(np.int16)
with wave.open('music2.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok')
