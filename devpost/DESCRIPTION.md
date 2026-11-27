# Waterline: Devpost submission text

Paste each part into the matching Devpost field.

**Project name:** Waterline: see the flood at real height in your own living room

**Elevator pitch (under 200 characters):**
See where the flood reaches before it comes: the water drawn through your living room at its real height, the depth on your body, and the one lowest thing to lift first.

**Built with (tags):** lens-studio, snap-specs, spectacles-interaction-kit, spectacles-ui-kit, clad, lens-studio-mcp, leaf, plan-lens, typescript, claude-code

**Try it out links:**
- https://github.com/ShermaineYap/paras-specs

**Video:** _YouTube link after recording_

**Image gallery (in this order):** `devpost/gallery/01-cover.png` (cover), then the other cards in `devpost/gallery/` in number order.

---

## About the project (story, Markdown)

## Inspiration
I'm from Bentong, Pahang. In December 2021 the floods came at night. In Kampung Kemansur, one resident said the water rose to **about 1.5 m inside her house** ([Malaysiakini](https://malaysiakini.com/news/604316)). In Bentong, **1,518 people** were in relief centres on 29 Dec ([Pahang state government](https://pahang.gov.my/pahang/resources/PDF/Berita/2021/Dis/(29hb)JUMLAH_MANGSA_BANJIR_DI_PAHANG_MENURUN_KEPADA_7,730_MANGSA.pdf)). Across Malaysia, **55 people died** and losses reached **RM6.1 billion** ([The Star](https://www.thestar.com.my/news/nation/2022/03/08/floods-55-fatalities-from-december-2021-to-january-2022); [DOSM](https://www.dosm.gov.my/portal-main/release-content/special-report-on-impact-of-floods-in-malaysia-2021)). It keeps happening: Janda Baik in September 2026, and near Kemasul in November 2026.

A river reading like "89.00 m" means nothing in your own room. Nobody can picture where 1.5 m reaches until they see it against their own sofa and their own body.

## What it does
**Waterline is for families in flood-prone towns. You walk through it on a dry day, before the alert, to see the water and plan what to lift first.**

1. **Tag what you'd save.** "Look down. Pinch the things you'd save."
2. **Choose a level:** Alert 30 cm, Warning 80 cm, Danger 150 cm, named after the Bentong river gauge's levels. Each level floods a different list: 2, 3 or 5 belongings.
3. **See the water.** It rises through the room at its real height. A ring sits on the water under your head, and the tag reads the depth off your body: "up to your hips", "up to your chin". At Danger a line on the wall marks the reported 2021 depth. Crouch, and your eyes go under.
4. **Lift the lowest thing first.** One item glows amber, with a dotted line up to its pin on the cabinet. Grab, carry, release: it snaps green and the next one lights up. An edge arrow and a splash point to anything behind you.
5. **Mains off, and done.** The water drains, the rain turns to morning birds, and one line says "5 of 5 above water".

**Why glasses:** the water is drawn at real size against your body and furniture, it answers your head every frame, and only one cue shows at a time, where you're already looking.

## How I built it
1. **Planned with the `plan-lens` skill.** It interviewed me, checked the idea against what the preview can show, and wrote `devpost/design-brief.md` with real heights and testable done criteria. Reading the draft brief, I made two changes before approving it. All five belongings sat below 45 cm, so Warning and Danger flagged the same list; two moved to a sideboard so each level gives a different list. And the depth tag's fixed phrase became a body word worked out from eye height.
2. **Built by CLAD** in Lens Studio 5.23.2 through the **Lens Studio MCP**: the procedural living room and belongings, the water surface, Spectacles Interaction Kit interactables, UI Kit panels, generated sounds, and the LEAF scenarios.
3. **Tested with LEAF.** All five done criteria pass, as six scenarios: Danger reaches 150.00 cm in 3.70 s; crouching under turns on the underwater view in 0.089 s; a release 6 cm from the pin snaps and turns green; the first 8 seconds are checked frame by frame (357 frames) to prove nothing shows but the hint line.
4. **Fixed with design notes, not code, over five rounds.** The notes are in the repo (`devpost/design-notes.md`).

## Challenges I ran into
- **A room that reads as a home.** The first build was grey boxes. Round 2 made it a Malaysian terrace-house living room: teak cabinet, patterned tiles, rain on the window.
- **The first seconds.** Restarting the preview flashed every panel at once, and nothing told a first-time user what to do. Now one line says "Look down. Pinch the things you'd save."
- **Moments with no cue.** I wrote a seventh LEAF scenario that plays the whole Lens as a first-time user, acting only on what's in view or what a cue points to. It found four moments with no cue: the sideboard items, the level card appearing behind you, the switch glowing out of view, and the depth tag hidden by the cabinet. All four are fixed.
- **The cues that matter most were the weakest.** Under the water, the amber outline turned pale olive, and the depth tag was the faintest text in the Lens. Round 5 drew the amber after the water and moved the tag onto a plate, larger and further away.
- **A stable editor.** Lens Studio closed several times in long runs. An extra preview-hand package froze the editor with a hidden permission pop-up, so it came out. After that, every test ran one at a time, with the project saved first.

## Accomplishments that I'm proud of
- Every done criterion has a passing LEAF test with measured numbers, and a playthrough test proves every step has a cue.
- One thing asks for attention at a time, and the Lens shows nothing until it's needed.
- It's a real problem in my own town, built on sourced facts.

## What I learned
- **Put the number on the body.** "Up to your chin" lands in a way "150 cm" never does.
- **Test the first-time user, not just the features.** Every feature passed, and the playthrough still found four dead ends.
- **The cue that matters most needs the most contrast.** I'd made the two most important things the faintest.
- **Say what's simulated.** The room, my belongings and the levels are stand-ins; the water height, the depth on your body and lowest-first are built for real.

## What's next for Waterline
These are "feel unproven" items that only real glasses and a real room can answer:
- finding the real floor height
- recognising real belongings and remembering them
- lifting things to eye height safely
- what happens when you bend at Danger
- reading the cues on the SPECS display

The real order should also switch off the mains first, while everything is dry. After that, I'd try it with families in Bentong before the next monsoon.
