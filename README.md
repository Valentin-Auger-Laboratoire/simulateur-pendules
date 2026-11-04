# Simulateur de pendules : du pendule simple à l'horloge

🇫🇷 [Français](#français) · 🇬🇧 [English](#english)

**Essayer l'outil :** https://valentin-auger-laboratoire.github.io/portfolio/outils/pendules/

---

## Français

### Ce que fait l'outil
Simulation en temps réel de plusieurs oscillateurs mécaniques, en HTML / CSS / JavaScript pur (aucune bibliothèque, aucun serveur). Les équations du mouvement sont intégrées par la méthode de Runge-Kutta d'ordre 4, écrite à la main.

**1. Pendule simple**
- Longueur, masse, angle de départ et pesanteur (Terre, Lune, Mars, Jupiter) réglables. La masse se déplace aussi à la souris.
- Période réelle comparée à la formule des petits angles T₀ = 2π√(L/g). On voit l'écart grandir avec l'amplitude.
- Un second pendule, en gris, suit l'approximation sin θ ≈ θ, pour comparer.
- Frottement visqueux et forçage, avec la courbe de résonance et le facteur de qualité Q.
- Graphes : angle selon le temps, portrait de phase, énergies, période selon l'amplitude.

**2. Pendule double**
- Jusqu'à 7 « fantômes » lancés avec un millième de degré d'écart : ils se séparent au bout de quelques secondes (chaos).
- Trace du bout du pendule, écart entre trajectoires en échelle logarithmique, dérive de l'énergie (erreur numérique).
- Modes propres des petites oscillations.

**3. Pendules couplés**
- Deux pendules reliés par un ressort : battements et échange complet d'énergie.
- Mode en phase et mode en opposition, période des battements.

**4. Horloge à balancier**
- Cadran, roue d'échappement de 30 dents, ancre et balancier animés. Les aiguilles avancent d'une seconde à chaque battement simulé.
- Longueur du balancier qui bat la seconde (≈ 99,36 cm).
- Avance ou retard en secondes par jour, détaillés :
  - dilatation de la tige selon le matériau (acier, laiton, invar, bois, aluminium) et la température ;
  - réglage de la lentille ;
  - pesanteur selon la latitude ;
  - amplitude (erreur circulaire).
- Vitesse ×1 à ×3600 : la marche **mesurée** sur la simulation se compare à la marche **calculée**.
- Rouages de la roue d'échappement aux aiguilles (rapports 60 et 12).

**5. Méthodes numériques**
Ce sont les méthodes de mon cours de physique numérique, appliquées au pendule :
- **Équations différentielles** : Euler, Euler-Cromer, Heun (RK2), Verlet et Runge-Kutta 4 tournent ensemble avec le même pas. Pour chacune, l'erreur sur l'énergie et l'**ordre de convergence mesuré** (pente en log-log : 1, 1, 2, 2, 4).
- **Intégration numérique** : la période exacte, qui est une intégrale, calculée par rectangles, trapèzes et Simpson. Ici, les trapèzes battent Simpson, car la fonction intégrée est périodique.
- **Moindres carrés et pivot de Gauss** : les périodes mesurées sur la simulation sont ajustées par T/T₀ − 1 = a·θ² + b·θ⁴. Les équations normales sont résolues par le pivot de Gauss avec pivot partiel. On retrouve a ≈ 1/16 (formule de Borda).

### Fichiers
| Fichier | Rôle |
|---|---|
| `pendules.js` | Moteur : intégrateurs (Euler, Euler-Cromer, Heun, Verlet, RK4), équations des pendules, énergie, modes propres, période exacte (intégrale elliptique), horloge, pivot de Gauss, moindres carrés, quadratures |
| `index.html` | Interface et animations, bilingue FR / EN |
| `tests/test.js` | Tests du moteur |

### Lancer les tests
```bash
node tests/test.js
```
71 vérifications :
- période simulée identique à la période exacte de 1° à 175° (à 10⁻⁸ près) ;
- énergie conservée sans frottement, y compris pour le pendule double chaotique ;
- modes propres analytiques retrouvés par la simulation ;
- transfert d'énergie des pendules couplés ;
- amplitude du régime forcé ;
- marche de l'horloge comparée aux formules approchées (½·α·ΔT, ½·ΔL/L, ½·Δg/g, θ²/16) ;
- ordres de convergence des cinq intégrateurs ;
- pivot de Gauss (pivot nul, système 8 × 8 aléatoire, matrice singulière) ;
- ordres des quadratures.

### Limites
- Masses ponctuelles et tiges sans masse : pas de pendule pesant ni de moment d'inertie.
- Le frottement est visqueux (proportionnel à la vitesse). Pas de frottement sec ni de traînée en v².
- L'échappement de l'horloge est idéalisé : il rend exactement l'énergie perdue à chaque passage, sans modéliser les chocs de l'ancre.
- Coefficients de dilatation usuels, à prendre comme des ordres de grandeur.

### Utiliser en local
Ouvrir `index.html` dans un navigateur. Rien n'est envoyé sur Internet.

---

## English

### What the tool does
Real-time simulation of several mechanical oscillators, in plain HTML / CSS / JavaScript (no library, no server). Equations of motion are integrated with a hand-written 4th-order Runge-Kutta method.

1. **Simple pendulum**:
   - real period versus the small-angle formula, with a grey "small-angle" pendulum alongside for comparison;
   - damping, driving and the resonance curve;
   - phase portrait and energies.
2. **Double pendulum**: ghost pendulums started 0.001° apart diverge (chaos). Tip trail, log-scale separation, energy drift, normal modes.
3. **Coupled pendulums**: beats and full energy exchange, in-phase and anti-phase modes.
4. **Pendulum clock**:
   - animated dial, 30-tooth escape wheel, anchor and pendulum; seconds pendulum length (≈ 99.36 cm);
   - clock rate in seconds per day from rod expansion (material, temperature), bob adjustment, local gravity (latitude) and amplitude (circular error);
   - measured rate (simulation up to ×3600) compared with the computed rate; gear train to the hands.
5. **Numerical methods** (from my numerical physics course):
   - Euler, Euler-Cromer, Heun, Verlet and RK4 side by side, with energy error and measured order of convergence;
   - the exact period computed by rectangles, trapezoids and Simpson;
   - least squares solved by Gaussian elimination, recovering Borda's 1/16 coefficient from simulated periods.

### Tests
```bash
node tests/test.js
```
71 checks:
- simulated period equals the exact period from 1° to 175°;
- energy conservation, including the chaotic double pendulum;
- normal modes, coupled energy transfer, driven amplitude;
- clock rate versus the approximate formulas;
- convergence orders of the five integrators, Gaussian elimination and quadrature orders.

### Limits
- Point masses and massless rods.
- Viscous friction only.
- Idealised escapement.
- Typical expansion coefficients.

---

← [Portfolio](https://valentin-auger-laboratoire.github.io/portfolio/#projets)
