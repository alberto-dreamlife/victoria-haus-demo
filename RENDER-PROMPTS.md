# Victoria Haus — render prompts for ChatGPT

Eleven images. Each one is already placed on the site as a placeholder with the
**exact filename below** — generate the image, save it with that name into
`assets/img/`, overwrite the placeholder, and the site picks it up. No code changes.

Every prompt is written from the actual drawings in *Victoria Haus – Floorplans
Draft v4* and *Siteplan v4*, so the geometry is real: four homes in a 2×2 block on
a corner lot, three storeys, 1,410 sq ft interior each, roof deck 17'-0" × 10'-2".

---

## Use this style block on EVERY prompt

Paste this at the end of each prompt so all eleven images look like one project.

> **Style:** photorealistic architectural visualisation, shot on a full-frame camera
> with a 35mm lens, natural light, soft overcast Vancouver daylight with occasional
> warm sun break. Muted Japandi palette — pale white oak, lime-washed off-white
> plaster, blackened steel, charcoal fibre-cement, warm cedar soffits. Restrained,
> uncluttered, no people unless stated, no text, no watermarks, no logos.
> Colour grade slightly desaturated and warm. 16:9 unless stated.

---

## 1 — `01-exterior-corner.png` · HERO · 2400×1350

Three-storey contemporary multiplex building on a corner lot in East Vancouver, seen
from the street corner at eye level. Four homes in one block, each expressed as a
narrow vertical bay with its own front door. Charcoal fibre-cement cladding with warm
cedar soffits and blackened steel window frames. Large ground-floor windows, recessed
entry porches, mature street trees in front, low hedge and a concrete paver walk.
Late afternoon, warm low sun raking across the facade, lights just coming on inside.
Residential East Vancouver street with older houses visible behind.

## 2 — `02-exterior-lane.png` · 1920×1280

The landscaped entry walk running between the street and the front doors of the four
homes. Concrete pavers with moss joints, low planting of ferns and grasses, a slim
blackened-steel canopy over each recessed entry. Cedar screen detail beside each door.
Soft overcast light, wet pavers after rain. Shot at eye level looking down the walk.

## 3 — `03-living-kitchen.png` · 1920×1280

Interior, ground floor of a narrow three-storey home, looking from the living area
back toward the kitchen. One long open room the full depth of the house: living at the
front with a low sofa, dining table for six in the middle, kitchen at the back with a
pale oak island and integrated appliances. White oak floors, off-white plaster walls,
blackened hardware. Full-height glazed door at the far end opening to a small green
garden patio. Bright, calm, natural light from both ends.

## 4 — `04-genkan.png` · 1920×1280

A Japanese-style genkan entry vestibule inside a contemporary Vancouver home. A
recessed lowered entry area with a pale oak step up into the hallway, built-in white
oak shoe storage and bench, a blackened steel coat rail, one pair of shoes neatly
placed. Lime-washed plaster walls, a small window with soft daylight, a single ceramic
vase. Quiet, warm, minimal. Shot straight on at standing height.

## 5 — `05-primary-bedroom.png` · 1920×1280

Top-floor primary bedroom in a narrow three-storey home, 13' × 9'. Low platform bed
with linen bedding in warm greys, white oak floors, off-white plaster walls, a slim
blackened reading light. A full-height glazed door on the left opens onto a private
roof deck with a glimpse of treetops and sky. Morning light. Calm and uncluttered.

## 6 — `06-roof-deck.png` · 1920×1280

Private rooftop deck of a three-storey city home, 17 feet by 10 feet, on the top floor
above the street trees. Ipe wood decking, blackened metal guardrail with slim vertical
bars, a small outdoor dining table for four, two planters with Japanese maple and
grasses. Glazed door back into the primary bedroom on one side. Early evening, warm
light, East Vancouver rooftops and distant North Shore mountains in the background.

## 7 — `07-patio.png` · 1920×1280

Small private garden patio at the back of a narrow city home, seen from the garden
looking back at the house. Concrete paver terrace with a low bench, planting of ferns,
hostas and a Japanese maple against a cedar fence. Full-height glazed sliding door
into the living space, warm light inside. Overcast soft daylight, everything green
and damp.

## 8 — `08-ensuite.png` · 1920×1280

Compact contemporary bathroom, 6' × 12'. Micro-cement walls in warm off-white, a pale
oak floating vanity with an integrated basin, blackened tapware, a large frameless
mirror, a walk-in shower with a linear drain behind clear glass. One small high window
with soft daylight. Two folded linen towels. Minimal and warm, not clinical.

## 9 — `09-trout-lake.png` · 1920×1280

Trout Lake in John Hendry Park, East Vancouver, on a summer morning. Still water with
reflections of tall cottonwoods and cedars, a grassy bank, the wooden dock in the
middle distance, a few people walking dogs far away. Soft haze, warm early light,
North Shore mountains faint on the horizon.

## 10 — `10-victoria-drive.png` · 1920×1280

A working East Vancouver shopping street on a weekday morning — Victoria Drive.
Low two-storey storefronts, a bakery with an awning, a produce shop with fruit stacked
outside, a small café with two tables on the pavement. Mature street trees, parked
cars, a bus stop. Ordinary, lived-in, not gentrified. Soft overcast light.

## 11 — `11-the-drive.png` · 1920×1280

Commercial Drive, East Vancouver, late afternoon. A busy independent shopping street
with cafés spilling onto the pavement, striped awnings, cyclists, mature trees, brick
and painted storefronts. Warm low sun down the length of the street. Lively but not
crowded.

---

## Optional — the hero video loop

If you want the header to move (the site is already wired for it), generate a
10-second loop from image 1 and save it as `assets/video/hero-loop.mp4`.

> Static locked-off camera, no camera movement whatsoever. Only the clouds drift
> slowly across the sky and the street-tree foliage sways gently in a light breeze.
> Photorealistic, cinematic, subtle. 10 seconds, seamless loop — the last frame must
> match the first.

Specs: 1920×1080, no audio track, under 4 MB, encoded with
`-movflags +faststart`. Same filenames work for `homes-loop` and
`neighbourhood-loop` on the other two pages.

---

## Consistency tips

- Generate **image 1 first**, then attach it as a reference to every following prompt
  and add *"match the architectural style, materials and colour grade of the attached
  image."* This is what keeps the set looking like one project.
- Interiors 3, 4, 5, 8 should share the same floor, plaster and hardware. Generate
  image 3 first, then reference it for the rest.
- If a render comes back cluttered, add *"remove all decorative objects except one"*.
  Japandi fails when it gets busy.
