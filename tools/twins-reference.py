"""Independent Python complex arithmetic fixtures; no product code imported."""
def escape(z, c, limit, radius):
    for n in range(limit + 1):
        if abs(z) > radius:
            return n
        z = z**2 + c
    return -1


for c in [-0.75 + 0.1j, 0.3 + 0.5j, -0.8 + 0.156j, 0.285 + 0.01j]:
    print(c, "M", escape(0j, c, 500, 2), "J seed .2+.1i",
          escape(0.2 + 0.1j, c, 500, max(2, abs(c) + 1)))
