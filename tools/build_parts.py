"""Cut the snapped Cup sprite (art/cup.png, native 100x100 grid) into animation layers.

Outputs assets/pet/: head.png body.png footL.png footR.png wingL.png wingR.png
beak-open.png + parts.json (eye geometry, pupil sprite, lid colour, anchors).
Everything stays on the art's own grid - no resampling; the renderer scales by integers.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'cup.png')
OUT = os.path.join(ROOT, 'assets', 'pet')
os.makedirs(OUT, exist_ok=True)

a = np.array(Image.open(SRC).convert('RGBA'))
H, W = a.shape[:2]
r, g, b, al = [a[..., i].astype(int) for i in range(4)]
opaque = al > 0
ink = opaque & (r < 40) & (g < 40) & (b < 50)
blue = opaque & (b > 100) & (r < 80)
white = opaque & (r > 180) & (g > 180) & (b > 180)

def save(mask, name, src=a):
    im = np.zeros_like(src)
    im[mask] = src[mask]
    Image.fromarray(im).save(os.path.join(OUT, name))

# ---------------------------------------------------------------- eyes
def eye(x0, x1, y0, y1):
    box = np.zeros_like(opaque)
    box[y0:y1 + 1, x0:x1 + 1] = True
    wmask = white & box
    interior = ndimage.binary_fill_holes(wmask)          # whites + pupil
    pupil = interior & ~wmask & ink                       # black disc
    # highlight = white pixels fully enclosed by the pupil
    pupil_full = ndimage.binary_fill_holes(pupil)
    hl = pupil_full & ~pupil
    ys, xs = np.nonzero(pupil_full)
    px0, py0, px1, py1 = xs.min(), ys.min(), xs.max(), ys.max()
    sprite = []
    for yy in range(py0, py1 + 1):
        row = ''
        for xx in range(px0, px1 + 1):
            row += 'h' if hl[yy, xx] else ('p' if pupil_full[yy, xx] else '.')
        sprite.append(row)
    rows = []
    iy, ix = np.nonzero(interior)
    for yy in range(iy.min(), iy.max() + 1):
        xs_ = np.nonzero(interior[yy])[0]
        if len(xs_):
            rows.append([int(yy), int(xs_.min()), int(xs_.max())])
    # the white the pupil sits on (most common bright colour)
    cols = a[wmask][:, :3]
    vals, counts = np.unique(cols, axis=0, return_counts=True)
    whitec = vals[counts.argmax()].tolist()
    return dict(interior=rows, pupil=dict(x=int(px0), y=int(py0), w=int(px1 - px0 + 1), h=int(py1 - py0 + 1), sprite=sprite),
                white=whitec), interior, pupil_full

eyeL, intL, pupL = eye(33, 55, 34, 56)
eyeR, intR, pupR = eye(70, 92, 33, 54)

# base with pupils erased (pupil pixels -> eye white); renderer draws pupils itself
base = a.copy()
for e, pf in ((eyeL, pupL), (eyeR, pupR)):
    base[pf] = e['white'] + [255]

# ---------------------------------------------------------------- head / body split
head = np.zeros_like(opaque)
boundary = np.full(W, 61)
for x in range(W):
    for y in range(H):
        if not opaque[y, x]:
            continue
        if y < 56:
            head[y, x] = True
            continue
        # outside the face columns the head ends at the helmet flap (row 62)
        if y > 72 or blue[y, x] or ((x < 27 or x >= 77) and y > 62):
            break
        head[y, x] = True
    ys = np.nonzero(head[:, x])[0]
    boundary[x] = ys.max() if len(ys) else -1

# left wing / hand (orange paw at the jacket's left) and right wing tip
wingL = np.zeros_like(opaque); wingL[66:83, 8:23] = True
wingL &= opaque & ~blue
# keep the jacket's own outline in the body layer
wingR = np.zeros_like(opaque); wingR[74:81, 70:78] = True
wingR &= opaque & ~blue
feetZone = np.zeros_like(opaque); feetZone[86:, :] = True
footL = feetZone & opaque & (np.arange(W)[None, :] < 51)
footR = feetZone & opaque & (np.arange(W)[None, :] >= 51)

body = opaque & ~head & ~wingL & ~wingR & ~feetZone
# underlay: 3 rows of head just above the jacket so head bobs never open a hole
under = np.zeros_like(opaque)
for x in range(W):
    if boundary[x] >= 56:
        under[max(0, boundary[x] - 3):boundary[x] + 1, x] = head[max(0, boundary[x] - 3):boundary[x] + 1, x]
body |= under & (np.arange(H)[:, None] >= 60)

save(head, 'head.png', base)
save(body, 'body.png', base)
save(footL, 'footL.png', base)
save(footR, 'footR.png', base)
save(wingL, 'wingL.png', base)
save(wingR, 'wingR.png', base)
Image.fromarray(base).save(os.path.join(OUT, 'full-nopupil.png'))

# ---------------------------------------------------------------- beak open patch
# lower beak (rows 52..55, cols 57..68) drops 2 rows; gap = ember mouth
bx0, bx1, by0, by1 = 56, 69, 47, 57
patch = base[by0:by1 + 1, bx0:bx1 + 1].copy()
op = patch.copy()
low = 52 - by0
op[low + 2:] = patch[low:-2]
inkc = np.array([22, 28, 36, 255], np.uint8)
mouth = np.array([185, 39, 28, 255], np.uint8)
tongue = np.array([248, 122, 113, 255], np.uint8)
# carve a small mouth slot under the beak tip, cols 59..66
for yy in range(low, low + 3):
    for xx in range(3, 11):
        op[yy, xx] = mouth if 4 <= xx <= 9 and yy < low + 2 else inkc
op[low + 1, 5:8] = tongue
Image.fromarray(op).save(os.path.join(OUT, 'beak-open.png'))

# skin colour for eyelids = most common yellow on the face
face = opaque & (r > 230) & (g > 170) & (b < 110)
vals, counts = np.unique(a[face][:, :3], axis=0, return_counts=True)
skin = vals[counts.argmax()].tolist()

ys, xs = np.nonzero(opaque)
parts = dict(
    size=[W, H], bbox=[int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
    ground=int(ys.max()), skin=skin, ink=[22, 28, 36],
    eyes=[eyeL, eyeR], beak=dict(x=bx0, y=by0),
    headPivot=[54, 66],
)
json.dump(parts, open(os.path.join(OUT, 'parts.json'), 'w'), indent=1)
print('ok', parts['bbox'], 'skin', skin, 'eyeL pupil', eyeL['pupil']['x'], eyeL['pupil']['y'], 'eyeR pupil', eyeR['pupil']['x'], eyeR['pupil']['y'])
# ES-module copy so the renderer can import it over file:// (no fetch)
with open(os.path.join(OUT, 'parts.js'), 'w') as f:
    f.write('export default ' + json.dumps(parts) + ';\n')
