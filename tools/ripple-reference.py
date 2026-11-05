"""Independent scalar oracle: direct cosine sum and cmath phasors, no app imports."""
import cmath
import json
import math
from pathlib import Path

cases = []
for count, wavelength, radius, amplitude, angle, phase, x, y, time in [
    (1, 2, 1, 1, 0, 0, 0, 0, 0),
    (2, 2, 1, 1, 0, 0, 0, 0, 0),
    (2, 2, 1, 1, 0, 180, 0, 0, .7),
    (6, 1.25, 2.2, 1, 0, 0, .7, .4, .8),
    (5, .85, 2.6, 1.3, 18, 73, 1.25, -.75, 2.4),
    (8, .5, 3, 2, -180, -180, -5, 5, 5.9),
    (3, 4, .25, 0, 180, 180, 0, 0, 6),
]:
    sources = [(radius * math.cos(2 * math.pi * j / count + math.radians(angle)),
                radius * math.sin(2 * math.pi * j / count + math.radians(angle))) for j in range(count)]
    distances = [math.dist((x, y), source) for source in sources]
    phases = [2 * math.pi / wavelength * distance + (math.radians(phase) if j == 0 else 0)
              for j, distance in enumerate(distances)]
    phasor = sum(amplitude * cmath.exp(1j * value) for value in phases)
    cases.append(dict(settings=dict(count=count, wavelength=wavelength, radius=radius, amplitude=amplitude, angle=angle, phase=phase),
                      point=dict(x=x, y=y), time=time, distances=distances,
                      u=sum(amplitude * math.cos(value - 2 * math.pi / 6 * time) for value in phases),
                      C=abs(phasor), I=abs(phasor)**2, real=phasor.real, imag=phasor.imag))
destination = Path(__file__).resolve().parents[1] / 'docs/ripple-kaleidoscope/reference.json'
destination.write_text(json.dumps(cases, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(cases)} independent reference cases -> {destination.name}')
