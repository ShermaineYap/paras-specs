---
status: approved
---

# Design brief: Waterline

<!-- Filled in by plan-lens from the learner's interview. Use the learner's words. Mark any value they didn't choose as (default). -->

## Context
Bentong, Pahang. In December 2021 the floods came at night; one family in Kampung Kemansur had water about 1.5 m deep inside their house, and Bentong has flooded again several times since, most recently in November 2026. When the river alert comes, the one person moving things has minutes and both hands full, and nobody can picture where 1.5 m actually reaches in their own room.

## The one spatial moment
The river alert has come. Standing in my living room, I see the water line drawn through the room at its real height, 150 cm, just under my chin. I look down and the Lens shows me the one lowest thing to lift next. I carry it up onto the safe spot, and the next one lights up, until everything that matters is above the water.

## Why it belongs on glasses
- Uses: draws in the world, leaves your body free.
- Why it's better than the phone or laptop version: the water is drawn at its real height against my body and my furniture, so I can see where 1.5 m actually reaches in my own room. A phone can only give me a number. And the person moving things has both hands full, so the next step has to show up where they're already looking, with no screen to hold.

## Product or overlay
- Type: overlay. It responds to my real room and my real belongings.
- What the real version would sense: on real glasses I'd tag my important things once, on a dry day, long before any flood. I look at each thing and pinch it to say "this matters". The glasses remember where it sits and how high it is.
- Stand-in for the preview: the living room comes already set up as a furnished Malaysian terrace-house living room. It has five virtual belongings (three low in front of me, two on a sideboard to my right), a tall cabinet and a wall switch. A short setup step lets me pinch each belonging once to tag it. The room, the five belongings, their heights, and the cabinet are clearly labelled as preview stand-ins. Everything after tagging is built for real: the water at its real height, the depth on my body, and lifting the lowest thing first.

## Where things live
All heights are measured from the floor. In the preview the floor is about 160 cm below my eyes. There are two looks, and only one at a time.

- Where the user is looking during the main task: (1) seeing the water: standing, looking straight ahead; (2) lifting: looking down about 30°, at arm's length, at the one item to lift next, then following it up to the cabinet.
- **Water surface:** a thin, pale glowing sheet across the whole room at the chosen level's height (150 cm for Danger, just under my chin). Keep it light: black shows as transparent.
- **Depth tag:** about 60 cm in front of me, slightly below eye level. Text: "Water here: <height> cm, <up to / above> your <body word>". The body word comes from my real head height, not a fixed phrase: ankles, knees, waist, chest or chin, depending on where the water sits on me. At Danger with 160 cm eyes it reads "Water here: 150 cm, up to your chin". At Warning it reads "Water here: 80 cm, above your knees". Body landmarks as fractions of current eye height (default): ankles 10%, knees 30%, waist 60%, chest 78%, chin 92%. The word is the highest landmark at or below the water. Within 5 cm of a landmark it says "up to your …", otherwise "above your …". If my eyes are below the surface it says "over your head" (default). It updates live, so crouching changes the word.
- **Ring:** a small ring on the water surface directly under my head. It follows me as I walk.
- **Stand-in room (preview stand-in, clearly labelled):** a furnished Malaysian terrace-house living room. Floor tiles, walls, a sofa, a low coffee table, a TV cabinet, a window with rain outside, the low stool, the sideboard on my right, the tall cabinet and the wall switch. Light colours, nothing dark.
- **Five belongings (preview stand-ins):**
  - In front of me, 50 to 80 cm from the starting position: extension plug 0 cm (on the floor), school bag 15 cm (default), rice cooker 35 cm (on the low stool).
  - On a sideboard about 120 cm to my RIGHT, so they start out of view: family photo album 95 cm, IC and document folder 100 cm.
  - So Alert 30 cm flags 2 items, Warning 80 cm flags 3, and Danger 150 cm flags all 5. Each level gives a different list, which is why you'd run it again.
  - Real-world sizes (default): rice cooker about 30 x 30 x 30 cm, school bag about 40 x 30 x 15 cm, album about 30 x 25 x 5 cm, folder about 32 x 24 x 3 cm, extension plug about 30 x 6 x 4 cm.
- **Tall cabinet (preview stand-in for "the highest surface in the room"):** against the wall about 120 cm from the belongings in front of me, top at 160 cm.
- **Safe spots:** each item has its own safe spot on the cabinet top, shown as a glowing pin that stands about 10 cm above the top, so I can see it from 160 cm eye height.
- **Amber outline:** on the one tagged belonging to lift next.
- **Dotted line:** a thin dotted line from that item up to its safe spot on the cabinet, so I know where it goes without looking up.
- **River-alert card:** 80 cm ahead at about 110 cm high.
- **Mains switch:** on the wall at 140 cm.
- **Edge arrow:** small, at the edge of my view, pointing to the next item when it's out of view.

## Hands and input
All actions are one-handed: pinch, or grab and release. No voice, no two-hand gestures.
- **Tag (setup):** pinch each of the five belongings once. A small "tagged" tick appears on each.
- **River alert:** one big card with three large buttons, each showing its height. Levels are illustrative in-room heights (default): Alert 30 cm (above the ankles, so only the lowest things are at risk), Warning 80 cm (above the knees), Danger 150 cm (the reported 2021 depth in a Bentong home). The names Alert, Warning and Danger follow the real Sungai Bentong river gauge, but the heights are sample data. The Lens flags only tagged belongings below the chosen height.
- **Lift (main moment):** grab the amber item with one hand, carry it, and release it on its safe spot on the cabinet. Released within 10 cm of the spot, it snaps into place. Released anywhere else, it stays amber.
- **Mains switch:** one pinch on the wall switch once everything is safe. It's the last step before the water drains.
- Targets are big and highlight when aimed at.
- Voice: none.

## When things show
- **Before anything:** nothing from the Lens is shown beyond the stand-in room, belongings, cabinet and switch.
- **Tagged ticks:** appear on pinch, fade within 2 seconds, and the room is empty again.
- **River-alert card:** shows after tagging. It disappears when a level is pressed.
- **Water:** rises from the floor to its height over about 4 seconds, with rain and a low rushing sound placed at the surface.
- **Depth tag:** shows only while I'm standing and looking roughly level. It hides while I'm looking down to lift or carrying something.
- **Ring under my head:** on the whole time the water is up.
- **Underwater:** if I crouch so my eyes go below the surface, a cool tint and muffled sound come on the moment my eyes go under, and go off as I stand up.
- **Amber outline, dotted line and safe spot:** only for the one lowest tagged item still below the water. When it snaps into place, it turns green with a soft tick, the green fades after 1 second, and the next lowest item lights up.
- **Edge arrow:** only if the next item is out of view. It disappears as soon as I face the item, with a soft splash sound from the item's direction.
- **Mains switch:** glows only after every flagged item is safe.
- **Ending:** when I pinch the switch, there's a click and the water drains to the floor over about 3 seconds. The rain fades into morning birds, and one line shows for 4 seconds, for example "5 of 5 above water, 1:48" (items saved, time from pressing the level to pinching the switch). Then everything disappears, and the level card comes back if I want to run it again at another level.
- If something needs attention out of view: small edge arrow plus a soft splash sound from the item's direction.

## Done criteria
Each one can be checked in Lens Studio's preview. "Nothing visible" means nothing from the Lens beyond the stand-in room, belongings, cabinet, wall switch and (where stated) the level card.
1. After I tag all five belongings and press Danger, the water surface rises to 150 cm (±2 cm) above the floor within 5 seconds. Pressing Alert instead stops it at 30 cm, and only the belongings below 30 cm are flagged. Warning stops at 80 cm and flags exactly 3 items; Danger flags all 5.
2. The Lens answers my body every frame. Walking 2 m sideways keeps the ring under my head (within 5 cm). Crouching until my eyes are 10 cm below the surface turns on the underwater tint and muffled sound within 0.3 seconds. Standing back up turns them off. The depth tag's body word changes when I crouch.
3. Only one thing asks for attention. Exactly one belonging has the amber outline, dotted line and safe spot at a time, and it is always the lowest tagged item still below the water. The edge arrow shows only when that item is out of view. At Danger the album is out of view when it becomes next, and the edge arrow shows until I turn to face it.
4. Grabbing the amber item and releasing it within 10 cm of its safe spot on the cabinet snaps it there, turns it green and lights up the next lowest item. Releasing it anywhere else leaves it amber.
5. Once all flagged items are safe and I pinch the mains switch, the water drains to the floor within 4 seconds, the summary line shows and then hides, and nothing from the Lens is visible 9 seconds later apart from the level card returning. Before I press any level, nothing is visible either, apart from the tagging step and the level card.

## Out of scope
- Recognizing real objects or real furniture. Tagging is pinch-based, on stand-in belongings.
- Remembering tags between sessions. Tagging happens as a setup step each run.
- Live river-gauge data. Levels are hard-coded sample heights.
- The floor gauge pole and the go-bag (dropped to keep the video short).
- Voice and two-hand gestures.

## Risks and open questions
- On real glasses, tags would be made on a dry day and remembered until flood night. That needs memory between sessions and real object positions, which the preview can't show. Feel unproven.
- Real lifting: weight, balance, and setting things down on a real high surface aren't felt with a mouse drag. Feel unproven.
- In-room level heights (30 / 80 cm) are illustrative, not real gauge conversions.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources

---

## Changes after approval (rounds 1 to 5)

The brief above is the approved plan, unchanged. These are the changes made during the five build rounds, each from a design note after walking the preview, reading the screenshots or a LEAF playthrough. The notes themselves are in `devpost/design-notes.md`; the measured results are in `devpost/leaf-results.md`.

**Where things live**
- **Start position (round 2):** I start in the middle of a furnished living room, facing the cabinet wall, so the first view shows a room and not a single wall. The belongings stay low in front of me, but they sit about 1 m away rather than 50–80 cm.
- **The lifting look:** because of that distance and the narrow view, the floor items are 45–60° below eye level from the start, not "about 30°". The amber item and its pin are not in view together; the dotted line and the edge arrow or chevron connect them.
- **Sideboard:** the album (95 cm) and the IC folder (100 cm) sit on a sideboard to my right, beyond 1.2 m. They start out of view on purpose, so the edge arrow is needed.
- **Cabinet (round 2):** 200 cm wide, top at 160 cm, with five pins evenly spaced. Each pin stands about 10 cm above the top so it is visible from eye height.
- **River-alert card (rounds 4–5):** it appears in front of me wherever I am facing (about 1 m ahead), not at a fixed spot. It waits about 1 s after the fifth tick fades, fills about 71% of the view's width, and has wider gaps between the buttons.
- **Depth tag (rounds 2, 4, 5):** about 100 cm ahead, not 60 cm, on a dark plate with light, larger text. It follows the head with a soft lag instead of being locked to it. It steps aside for the dotted line, the pin and the edge arrow, draws on top of furniture so it is never cut off, and hides while I carry an item.
- **Stand-in sign (round 2):** small, on the wall by the door, never over a belonging or a safe spot.

**When things show**
- **Start (round 3):** one line, "Look down. Pinch the things you'd save.", with a chevron pointing down to the belongings. It disappears after the first tag. The brief's "nothing shown" start left first-time users with no cue.
- **Tagging (round 4):** after the third tag, an edge arrow points to the sideboard items until all five are tagged.
- **Edge arrow (rounds 2, 4, 5):** about 12° from the centre of view. A side arrow for items to the left or right, a bottom chevron for items below the view. It also points to the mains switch once the switch glows and is out of view, with the same soft splash.
- **Water (round 2):** ripples, small sparkles, a glowing line where it meets the walls and furniture, and a floating slipper and leaves. Under the surface the tint is bluer.
- **Amber cue (round 5):** the outline and dotted line draw after the water, so they stay bright amber under it.
- **Flood mark (round 5):** at Danger only, a thin line on the wall at 150 cm with the label "Dec 2021, reported 1.5 m".
- **Body words (round 5):** a "hips" landmark at 50% of eye height was added, so 80 cm reads "up to your hips".

**Done criteria and tests**
- Criterion 5 is tested as two scenarios, the ending (`c5-ending`) and the quiet start (`c5b-quiet-before-level`).
- A seventh scenario, `playthrough`, plays the whole Lens as a first-time user at Danger and at Alert and checks that every step has a cue. It found the four missing cues fixed in round 4.

**Additive display.** The brief says "nothing dark". The level card, summary line and depth tag use a dark plate behind light text, which reads well in the preview; on real glasses the plate may show as almost nothing. This is listed as feel unproven.

**Still as planned, and still unproven.** Every safe spot is at eye height (160 cm), as the brief specifies. Nobody bent down in a test. The mains switch is the last step, though safety advice is to switch off the mains while things are dry. These are listed as feel unproven in the README.
