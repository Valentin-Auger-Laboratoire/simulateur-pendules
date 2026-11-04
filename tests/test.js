// Tests du moteur du simulateur de pendules : node tests/test.js
const assert = require('assert');
const P = require('../pendules.js');
const DEG = P.DEG;
let n = 0;
const close = (a, b, tol, msg) => { n++; assert.ok(Math.abs(a - b) <= tol * (1 + Math.abs(b)), (msg || '') + ' : ' + a + ' ≠ ' + b); };

// 1. Intégrale elliptique et période exacte
close(P.ellipK(0), Math.PI / 2, 1e-15, 'K(0) = π/2');
close(P.ellipK(Math.SQRT1_2), 1.8540746773013719, 1e-14, 'K(1/√2), valeur tabulée');
close(P.periodExact(1, 9.81, 1e-6), P.periodSmall(1, 9.81), 1e-12, 'petits angles : T → 2π√(L/g)');
close(P.periodExact(1, P.G0, Math.PI / 2) / P.periodSmall(1, P.G0), 1.18034059901609, 1e-12, 'T(90°)/T0, valeur connue');
// 2. La simulation RK4 retrouve la période exacte, du petit angle à 175°
const p = { g: 9.81, L: 1 };
for (const a of [1, 10, 30, 60, 90, 120, 150, 175]) {
  close(P.measurePeriod(P.simpleDeriv, [a * DEG, 0], p, 1e-3, 80), P.periodExact(1, 9.81, a * DEG), 1e-8, 'période simulée à ' + a + '°');
}
close(P.periodBorda(1, 9.81, 10 * DEG), P.periodExact(1, 9.81, 10 * DEG), 1e-5, 'formule de Borda à 10°');

// 3. Conservation de l'énergie sans frottement
{
  let y = [150 * DEG, 0];
  const E0 = P.simpleEnergy(y, p).E;
  for (let i = 0; i < 100000; i++) y = P.rk4(P.simpleDeriv, y, 0, 1e-3, p);
  close(P.simpleEnergy(y, p).E, E0, 1e-8, 'pendule simple : énergie après 100 s');
}
{
  const dp = { g: 9.81, L1: 1, L2: 0.8, m1: 1.5, m2: 0.7 };
  let y = [2.2, 0, -1.0, 0.5];
  const E0 = P.doubleEnergy(y, dp).E;
  for (let i = 0; i < 30000; i++) y = P.rk4(P.doubleDeriv, y, 0, 1e-3, dp);
  close(P.doubleEnergy(y, dp).E, E0, 1e-7, 'pendule double chaotique : énergie après 30 s');
}
// amortissement : l'énergie décroît, environ comme exp(−γ t) aux petits angles
{
  const pd = { g: 9.81, L: 1, gamma: 0.2 };
  let y = [5 * DEG, 0];
  const E0 = P.simpleEnergy(y, pd).E;
  for (let i = 0; i < 10000; i++) y = P.rk4(P.simpleDeriv, y, i * 1e-3, 1e-3, pd);
  close(P.simpleEnergy(y, pd).E / E0, Math.exp(-0.2 * 10), 0.03, 'décroissance de l’énergie');
}

// 4. Pendule double : modes propres (masses et longueurs égales : ω² = (g/L)(2 ∓ √2))
const [w1, w2] = P.doubleModes({ g: 9.81, L1: 1, L2: 1, m1: 1, m2: 1 });
close(w1, Math.sqrt(9.81 * (2 - Math.SQRT2)), 1e-12, 'mode lent');
close(w2, Math.sqrt(9.81 * (2 + Math.SQRT2)), 1e-12, 'mode rapide');
// et la simulation aux petits angles, lancée sur le mode lent, oscille à cette pulsation
{
  const dp = { g: 9.81, L1: 1, L2: 1, m1: 1, m2: 1 };
  let y = [0.001, 0, 0.001 * Math.SQRT2, 0], t = 0;
  const cross = [];
  while (cross.length < 4) { const yn = P.rk4(P.doubleDeriv, y, t, 1e-4, dp); if (y[0] < 0 && yn[0] >= 0) cross.push(t); y = yn; t += 1e-4; }
  close((cross[3] - cross[0]) / 3, (2 * Math.PI) / w1, 1e-4, 'période du mode lent simulée');
}
// sensibilité aux conditions initiales : un millième de degré d'écart devient grand
{
  const dp = { g: 9.81, L1: 1, L2: 1, m1: 1, m2: 1 };
  let a = [120 * DEG, 0, 150 * DEG, 0], b = [120 * DEG, 0, 150.001 * DEG, 0];
  for (let i = 0; i < 20000; i++) { a = P.rk4(P.doubleDeriv, a, 0, 1e-3, dp); b = P.rk4(P.doubleDeriv, b, 0, 1e-3, dp); }
  n++; assert.ok(Math.abs(a[2] - b[2]) > 10 * DEG, 'chaos : écart > 10° après 20 s');
}

// 5. Pendules couplés : modes, battements, échange d'énergie
{
  const cp = { g: 9.81, L: 1, m: 1, k: 0.6 };
  const md = P.coupledModes(cp);
  close(md.w1, Math.sqrt(9.81), 1e-14, 'mode en phase');
  close(md.w2, Math.sqrt(9.81 + 1.2), 1e-14, 'mode en opposition');
  // au bout d'une demi-période de battement, l'énergie est passée presque toute dans le pendule 2
  let y = [2 * DEG, 0, 0, 0], t = 0;
  const steps = Math.round(md.exchange / 1e-3);
  for (let i = 0; i < steps; i++) { y = P.rk4(P.coupledDeriv, y, t, 1e-3, cp); t += 1e-3; }
  const e = P.coupledEnergy(y, cp);
  n++; assert.ok(e.e2 / (e.e1 + e.e2) > 0.97, 'transfert d’énergie après T_battement/2 : ' + (e.e2 / (e.e1 + e.e2)).toFixed(3));
}

// 6. Résonance du modèle linéarisé
{
  const w0 = 3, g = 0.2, F = 1;
  const pk = P.resonancePeak(w0, g);
  close(pk, Math.sqrt(9 - 0.02), 1e-14, 'pulsation de résonance');
  n++; assert.ok(P.resonanceAmp(w0, g, F, pk) > P.resonanceAmp(w0, g, F, pk * 1.001) && P.resonanceAmp(w0, g, F, pk) > P.resonanceAmp(w0, g, F, pk * 0.999), 'maximum au pic');
  close(P.qualityFactor(w0, g), 15, 1e-14, 'facteur de qualité');
  // la simulation forcée atteint l'amplitude prévue en régime permanent
  const ps = { g: 9.81, L: 1, gamma: 0.5, F: 0.05, wd: 2.5 };
  let y = [0, 0], t = 0, amax = 0;
  for (let i = 0; i < 120000; i++) { y = P.rk4(P.simpleDeriv, y, t, 1e-3, ps); t += 1e-3; if (t > 100) amax = Math.max(amax, Math.abs(y[0])); }
  close(amax, P.resonanceAmp(Math.sqrt(9.81), 0.5, 0.05, 2.5), 2e-3, 'amplitude du régime forcé');
}

// 7. Horloge
close(P.secondsPendulumLength(P.G0), 0.99362, 1e-5, 'balancier qui bat la seconde ≈ 99,36 cm');
close(P.gravityAtLatitude(0), 9.780327, 1e-12, 'g à l’équateur');
close(P.gravityAtLatitude(90), 9.832186, 1e-6, 'g au pôle');
{
  const gRef = P.gravityAtLatitude(45), amp = 4 * DEG, L0 = P.lengthForPeriod(2, gRef, amp);
  close(P.periodExact(L0, gRef, amp), 2, 1e-14, 'réglage : période de 2 s');
  const base = { gRef, g: gRef, L0, amp, ampRef: amp };
  close(P.clockRate(base).total, 0, 1e-9, 'horloge réglée : marche nulle');
  // dilatation : marche ≈ −½·α·ΔT·86 400 s/jour
  close(P.clockRate({ ...base, alpha: 19e-6, dT: 10 }).total, -0.5 * 19e-6 * 10 * 86400, 1e-3, 'laiton +10 °C');
  // lentille descendue de 1 mm : ≈ −½·(1 mm / L)·86 400
  close(P.clockRate({ ...base, dL: 0.001 }).total, (-0.5 * 0.001 / L0) * 86400, 2e-3, 'lentille −1 mm');
  // pôle : g plus fort, l'horloge avance de ≈ ½·Δg/g·86 400
  const gp = P.gravityAtLatitude(90);
  close(P.clockRate({ ...base, g: gp }).total, 0.5 * ((gp - gRef) / gRef) * 86400, 2e-3, 'transport au pôle');
  // amplitude 10° au lieu de 4° : erreur circulaire ≈ −(θ²−θ0²)/16·86 400
  close(P.clockRate({ ...base, amp: 10 * DEG }).total, (-((10 * DEG) ** 2 - amp ** 2) / 16) * 86400, 0.02, 'erreur circulaire');
  n++; assert.ok(P.clockRate({ ...base, alpha: P.MATERIALS.invar, dT: 15 }).total > -1, 'invar : moins d’une seconde par jour');
}
n++; assert.strictEqual(P.trainRatio(P.TRAIN.toMinute), 60, 'rouage seconde → minute');
n++; assert.strictEqual(P.trainRatio(P.TRAIN.toHour), 12, 'rouage minute → heure');

// 8. Méthodes numériques
// ordre de convergence mesuré (pente log-log) pour chaque intégrateur
{
  const y0 = [60 * DEG, 0], ref = P.integrate('rk4', P.simpleDeriv, y0, p, 1e-4, 2), hs = [0.01, 0.005, 0.0025, 0.00125];
  for (const [m, ord] of [['euler', 1], ['cromer', 1], ['heun', 2], ['verlet', 2], ['rk4', 4]]) {
    const er = hs.map((h) => Math.abs(P.integrate(m, P.simpleDeriv, y0, p, h, 2)[0] - ref[0]));
    close(P.slope(hs.map(Math.log10), er.map(Math.log10)), ord, 0.08, 'ordre de ' + m);
  }
  // Euler explicite fait croître l'énergie, les méthodes symplectiques la gardent bornée
  const E = (y) => P.simpleEnergy(y, p).E, E0 = E(y0);
  const ye = P.integrate('euler', P.simpleDeriv, y0, p, 0.01, 60), yv = P.integrate('verlet', P.simpleDeriv, y0, p, 0.01, 60), yc = P.integrate('cromer', P.simpleDeriv, y0, p, 0.01, 60);
  n++; assert.ok(E(ye) > 1.5 * E0, 'Euler : énergie qui explose');
  n++; assert.ok(Math.abs(E(yv) / E0 - 1) < 1e-3, 'Verlet : énergie bornée');
  n++; assert.ok(Math.abs(E(yc) / E0 - 1) < 0.05, 'Euler-Cromer : énergie bornée');
}
// pivot de Gauss (avec un pivot nul en tête : il faut échanger les lignes)
{
  const x = P.gaussSolve([[0, 2, 1], [1, 1, 1], [2, 1, 3]], [5, 6, 13]);
  [7 / 3, 4 / 3, 7 / 3].forEach((v, i) => close(x[i], v, 1e-14, 'Gauss x' + i));
  // système aléatoire 8 × 8
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const A = Array.from({ length: 8 }, () => Array.from({ length: 8 }, rnd)), xs = Array.from({ length: 8 }, rnd);
  const b = A.map((r) => r.reduce((s, a, j) => s + a * xs[j], 0));
  P.gaussSolve(A, b).forEach((v, i) => close(v, xs[i], 1e-10, 'Gauss 8×8'));
  n++; assert.throws(() => P.gaussSolve([[1, 2], [2, 4]], [1, 2]), /singulière/, 'matrice singulière détectée');
}
// moindres carrés : droite exacte, puis formule de Borda retrouvée sur la simulation
{
  const c = P.leastSquares([0, 1, 2, 3], [1, 3, 5, 7], [() => 1, (x) => x]);
  close(c[0], 1, 1e-12, 'ordonnée à l’origine'); close(c[1], 2, 1e-12, 'pente');
  const amps = [], ys = [], T0 = P.periodSmall(1, P.G0);
  for (let a = 5; a <= 60; a += 5) { amps.push(a * DEG); ys.push(P.measurePeriod(P.simpleDeriv, [a * DEG, 0], { g: P.G0, L: 1 }, 1e-3, 30) / T0 - 1); }
  const [a, bb] = P.leastSquares(amps, ys, [(x) => x * x, (x) => x ** 4]);
  close(a, 1 / 16, 0.01, 'coefficient de Borda 1/16');
  close(bb, 11 / 3072, 0.15, 'coefficient suivant 11/3072');
}
// rectangles, trapèzes, Simpson
{
  close(P.quad('simpson', (x) => x ** 3, 0, 2, 2), 4, 1e-14, 'Simpson exact pour un cube');
  close(P.quad('trap', (x) => x, 0, 1, 1), 0.5, 1e-15, 'trapèzes exacts pour une droite');
  close(P.quad('rect', Math.sin, 0, Math.PI, 1000), 2, 1e-6, 'rectangles (point milieu)');
  // ordre : erreur ÷ 4 (trapèzes) ou ÷ 16 (Simpson) quand n double
  const f = (x) => Math.exp(x), I = Math.E - 1;
  const r = (rule, k) => Math.abs(P.quad(rule, f, 0, 1, k) - I);
  close(r('trap', 8) / r('trap', 16), 4, 0.01, 'ordre 2 des trapèzes');
  close(r('simpson', 8) / r('simpson', 16), 16, 0.02, 'ordre 4 de Simpson');
  // période exacte par quadrature
  for (const rule of ['rect', 'trap', 'simpson']) close(P.periodByQuadrature(1, P.G0, 150 * DEG, rule, 64), P.periodExact(1, P.G0, 150 * DEG), 1e-12, 'période par ' + rule);
}

console.log('OK : ' + n + ' vérifications passent');
