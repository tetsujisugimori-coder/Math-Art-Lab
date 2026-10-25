"""Independent exact rational classical RK4 one-step fixture (Python stdlib)."""
from fractions import Fraction as F

h = F(1, 200)
p = (F(1),) * 3


def derivative(v):
    x, y, z = v
    return (10 * (y - x), x * (28 - z) - y, x * y - F(8, 3) * z)


def add(v, k, t):
    return tuple(a + t * b for a, b in zip(v, k))


a = derivative(p)
b = derivative(add(p, a, h / 2))
c = derivative(add(p, b, h / 2))
d = derivative(add(p, c, h))
out = tuple(p[i] + h * (a[i] + 2*b[i] + 2*c[i] + d[i]) / 6 for i in range(3))
print(out)
print([float(v) for v in out])
