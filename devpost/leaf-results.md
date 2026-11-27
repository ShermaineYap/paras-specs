# Waterline: LEAF results

All runs were in the Lens Studio 5.23.2 preview (SPECS 27 device, "Plane" environment), from the Start camera: eyes 160 cm above the floor, facing the cabinet wall 250 cm ahead. Results are from the 27 November 2026 run, after the round 5 changes. Each test and playthrough was run on its own. The raw LEAF output of every run is in `devpost/leaf-log.txt`.

One run had to be repeated. The first Danger playthrough was cut short in the fifth carry, when Lens Studio refreshed its sign-in tokens and reset the preview. The log keeps that partial run and a note, and the Danger run below is the complete second run.

## 1. Done criteria and tests

| # | Done criterion (from the brief) | LEAF test | Result | Measured |
|---|---|---|---|---|
| 1 | After tagging all five and pressing a level, the water rises to that height within 5 s. Alert stops at 30 cm and flags only the items below it; Warning stops at 80 cm and flags 3; Danger stops at 150 cm (±2 cm) and flags 5. | `c1-levels` | PASS | **Danger:** reached 150 ±2 cm in 3.70 s; final surface 150.00 cm; 5 flagged (extension plug, school bag, rice cooker, photo album, IC and document folder).<br>**Alert:** reached 30 ±2 cm in 3.35 s; final surface 30.00 cm; 2 flagged (extension plug, school bag).<br>**Warning:** reached 80 ±2 cm in 3.59 s; final surface 80.00 cm; 3 flagged (extension plug, school bag, rice cooker).<br>**Hips landmark (round 5):** at Warning, standing with eyes at 160 cm, the tag reads "Water here: 80 cm, up to your hips".<br>**Dec 2021 wall mark (round 5):** drawn at Danger; not drawn at Alert or Warning. |
| 2 | The Lens answers the body every frame. Walking 2 m sideways keeps the ring under the head (within 5 cm). Crouching until the eyes are 10 cm below the surface turns on the underwater tint and muffled sound within 0.3 s; standing up turns them off. The depth tag's body word changes when crouching. | `c2-body` | PASS | **Ring:** walking 200 cm sideways, the worst offset from under the head was 0.00 cm; the ring sat 0.30 cm above the surface.<br>**Standing:** eyes at 160.0 cm, the tag reads "Water here: 150 cm, up to your chin".<br>**Crouching:** eyes at 140.0 cm (10 cm under), tint and muffle on after 0.089 s; the tag reads "Water here: 150 cm, over your head".<br>**Standing up:** tint and muffle off after 0.104 s. |
| 3 | Only one thing asks for attention: exactly one belonging has the amber outline, dotted line and safe spot, always the lowest tagged item still below the water. The edge arrow shows only when that item is out of view. At Danger the album is out of view when it becomes next, and the arrow shows until you turn to face it. | `c3-one-thing` | PASS | **At each of the 5 steps:** exactly 1 amber item, 1 pin and 1 dotted line; the target was always the lowest item still below the water.<br>**Order:** extension plug → school bag → rice cooker → photo album → IC and document folder.<br>**Arrow:** off when facing the item and on when facing away, at every step.<br>**Arrow position (round 5):** 12.0° from the centre of view at all 5 steps (side arrow at steps 1 and 3–5; bottom chevron at step 2).<br>**Album next, facing the cabinet:** album out of view, arrow on. After turning 60° toward it: album in view, arrow off. |
| 4 | Grabbing the amber item and releasing it within 10 cm of its safe spot snaps it there, turns it green and lights up the next lowest item. Releasing it anywhere else leaves it amber. | `c4-snap` | PASS | **Released elsewhere:** 166.3 cm from its spot, it stayed amber and stayed the target.<br>**Depth tag while carrying (round 5):** carrying the plug up to the cabinet at eye level, the tag was hidden in all 64 frames it was held.<br>**Released 6.0 cm from the spot:** it snapped to 0.00 cm and turned green.<br>**Next item:** the school bag lit up 0.27 s after the release (the brief's 1 s green fade runs alongside). |
| 5a | Once all flagged items are safe and the switch is pinched, the water drains to the floor within 4 s, the summary line shows and then hides, and 9 s later nothing from the Lens is visible apart from the level card returning. | `c5-ending` | PASS | **Drain:** reached the floor 3.23 s after the pinch (0.28 cm left).<br>**Summary:** "2 of 2 above water, 0:35" appeared 3.45 s after the pinch and stayed for 4.00 s.<br>**At 9.00 s after the pinch:** only the level card is visible. |
| 5b | Before any level is pressed, nothing is visible apart from the tagging step and the level card. | `c5b-quiet-before-level` | PASS | **First 8 s after a restart:** every frame was checked (357 frames from 0.000 s); only the hint line "Look down. Pinch the things you'd save." and its chevron were drawn.<br>**After tags 1–2:** nothing else is drawn.<br>**After tags 3 and 4:** an edge arrow points to the untagged belongings, which are out of view.<br>**Tag ticks:** each fades within 1.67 s.<br>**River-alert card (round 5):** not shown when the fifth tick fades; shown 1.05 s later, 101 cm away, filling 71% of the view's width (a 15% margin at each side).<br>**After the card appears, before a level:** only the level card. |

Every done criterion has a test, and all six pass.

**Round 5 changes checked by screenshot only** (in `devpost/screenshots/`):
- **Amber cues not tinted:** under the water, the outline and dotted line stay bright amber (`09-hero-danger.png`, `05-amber-item-line-and-pin.png`). With the eyes under the surface, the dotted line stays bright amber under the blue underwater tint (`07-crouching-underwater.png`).
- **Depth tag:** a dark plate with light, larger text, 100 cm ahead (`04-depth-tag.png`). Its soft-lag follow is visible only in motion and has no test.
- **Glowing switch:** the yellow halo around the switch (`13-switch-glowing.png`). Round 5 also fixed a bug that had shrunk the glow to about 1 cm.
- **Dec 2021 wall mark:** the line and the "Dec 2021, reported 1.5 m" label on the left wall (`09-hero-danger.png`).

## 2. First-time playthrough timings

The `playthrough` LEAF scenario plays the whole Lens as a first-time user, from the Start camera, through LEAF and the Spectacles Interaction Kit only. It acts only on what is in view or what a cue points to.

**How the timings are made.** Head movement follows a modelled human pace:
- turning at 120°/s
- walking at 1 m/s
- 0.6 s to react to something new
- 1.5 s extra whenever there is no cue and it has to search (this did not happen in either run)

**Lift times.** Each lift time assumes a person carries the item at 1 m/s, plus 1 s to grab and 1 s to place. The figure in brackets is the time LEAF's simulated hand actually took: it moves an item in short steps, so each carry took 16–20 s.

**Fixed times.** The water rising, draining and summary times are set by the Lens itself, not by pace. Finding the river-alert card now includes the Lens's own wait: the card shows about 1 s after the fifth tick fades, which is 2.3 s after the fifth pinch in both runs.

| Step | Danger (150 cm, 5 items) | Alert (30 cm, 2 items) |
|---|---|---|
| Tagging (5 pinches) | 7.5 s | 7.3 s |
| Finding the river-alert card (includes the card's 2.3 s wait) | 3.6 s | 3.6 s |
| Choosing a level | 1.0 s | 1.0 s |
| Water rising | 3.9 s | 3.9 s |
| Lift 1: extension plug (walked 147 cm) | 6.9 s (20.0 s as played) | 6.5 s (19.0 s as played) |
| Lift 2: school bag (walked 84 cm) | 6.8 s (23.3 s as played) | 6.8 s (23.9 s as played) |
| Lift 3: rice cooker (walked 73 cm) | 7.6 s (21.1 s as played) | — |
| Lift 4: photo album (walked 111 cm) | 8.3 s (24.5 s as played) | — |
| Lift 5: IC and document folder (walked 112 cm) | 8.4 s (21.4 s as played) | — |
| Finding and pinching the mains switch | 3.9 s (switch 28° away; edge arrow pointed to it) | 5.2 s (switch 51° away; edge arrow pointed to it) |
| Ending: water draining | 2.6 s | 2.6 s |
| Ending: summary line on screen | 4.0 s | 4.0 s |
| **Total at the modelled pace** | **65.0 s** | **41.4 s** |
| Total as played by LEAF | 137.3 s | 70.9 s |
| Summary shown | "5 of 5 above water, 1:58" | "2 of 2 above water, 0:52" |

The summary's time counts from pressing the level to pinching the switch, as played by LEAF. That's why it is longer than the modelled-pace total. Both totals are about 3 s longer than in round 4 because of the card's new 1 s wait after the fifth tick.

At both levels, every step had either its target in view or a cue pointing to it. The playthrough also checked every moment for on-screen panels and cues overlapping each other, and found none in these runs. An earlier round 5 run found the larger depth tag sitting over the moved-in edge arrow; the tag now steps aside for the arrow, as it already did for the dotted line and pin. The only flag left is that every safe spot is at eye height (160 cm), as the brief specifies for the cabinet top. Whether that is comfortable is listed below.

## 3. What the tests can't prove: feel unproven

These were all run in the Lens Studio preview, with a simulated hand and camera. The items below need real glasses and a real room.

- **Real hand tracking: feel unproven.** Every pinch, grab and release came from LEAF's simulated hand through the Spectacles Interaction Kit. Tracking accuracy, pinches that are missed or accidental, and grabbing items 70–120 cm away on a real device were not tested.
- **Real lifting: feel unproven.** Carrying is a hand-and-pointer drag with no weight or balance. Several things can't be felt in the preview:
  - lifting a 30 × 30 × 30 cm rice cooker to a 160 cm cabinet top, level with the eyes
  - setting it down without seeing the top surface
  - carrying with both hands full
- **Comfort: feel unproven.** A few things aren't covered by any test:
  - turning and walking between the low belongings, the sideboard and the cabinet over about 1–2 minutes
  - how readable the depth tag, edge arrows and river-alert card are on the SPECS display
  - whether the depth tag's soft lag (it eases after the head over about 0.35 s) feels calm or slow
  - whether the 1 s wait before the river-alert card feels like a pause or a delay
  - whether the panels feel stuck to the face
  - eye strain from cues drawn on top of everything

  The step times above come from a modelled pace, not a real person.
- **Dark depth-tag plate on an additive display: feel unproven.** The brief notes that black renders as transparent on the glasses. The new dark plate reads well in the preview, but on a real SPECS display it may show as little or no plate behind the light text.
- **Real object recognition and memory: feel unproven.** The room, the five belongings, their heights and the cabinet are preview stand-ins. Tagging is a pinch on a stand-in object. Recognising real belongings, remembering their positions and heights between sessions, and finding the real highest surface in a room were not tested (out of scope in the brief).
- **Sound: feel unproven.** The tests check only that the underwater muffle turns on and off. The rain, the rushing water, the splash cues' direction (for items and now the switch), the switch click and the morning birds were not checked by ear.
- **River levels: sample data.** The in-room heights of 30, 80 and 150 cm are illustrative, not real readings from the Sungai Bentong gauge (as stated in the brief). The "Dec 2021, reported 1.5 m" mark uses the reported 2021 depth from the brief.
