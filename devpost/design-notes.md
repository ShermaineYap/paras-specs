# Waterline: design notes, round by round

These are the notes I gave CLAD (Claude Code with Snap's `ls-clad` plugin) after each build, lightly shortened. Each round came from walking the preview, reading the screenshots, or a LEAF playthrough. Every round ended with all LEAF tests re-run.

## Round 1: the first build

> Read devpost/design-brief.md (status: approved) and build it for SPECS. Remove the Day-1 test cube. The preview camera starts at eye level, with the floor 160 cm below; every height in the brief is measured from the floor. Build in layers and confirm each one renders with a screenshot before adding the next: the room and belongings; tagging and the level card; the water rising (a pale, see-through cyan surface with slow ripples and a bright thin line where it meets the walls and furniture, nothing dark); the ring, depth tag and underwater state; the amber item, line, pin, grab and snap, edge arrow; the switch, drain, birds and summary. Write a LEAF scenario for every done criterion and give me a table with the measured numbers.

**What I saw:** every step worked, but the room was flat grey-beige boxes with no shading, the start view was pressed against the cabinet, the water read as a grey tint, the stand-in sign sat on the cabinet over the safe spots, and the edge arrow floated in the middle of the view across the depth tag.

## Round 2: make it a home

> 1. Start in the middle of the room, about 250 cm from the cabinet wall, so the first view shows the whole living room.
> 2. It must read as a Malaysian terrace-house living room at a glance: lit materials with a soft light from the window, cream walls, a light patterned floor tile, a teak-brown cabinet and sideboard, a light-blue sofa, curtains with rain outside, a ceiling fan, a wall clock and a calendar. Nothing dark.
> 3. Make the belongings recognisable from 2 m: a rice cooker with a lid and handle, a school bag with straps, an album with a spine, a folder in a clear sleeve, an extension plug with a cable.
> 4. Make the water look like water: a light cyan-blue body, a visible top surface with slow ripples and small sparkles, a glowing line where it meets walls and furniture, and two or three small things floating on the surface. Underwater, the tint is bluer.
> 5. Put the stand-in sign, smaller, on the wall by the door.
> 6. Put the edge arrow at the true edge of view; when the item is below the view, a small chevron at the bottom edge.
> 7. Make the depth tag about 30% smaller and lighter, below and left of centre, so it never covers the line or the pin.
> 8. Make the cabinet top wide enough for all five belongings with 5 cm gaps, with evenly spaced pins.

## Round 3: the first seconds

> 1. Fix the start flash: after restarting the preview, the summary card, the depth tag and the river-alert card all show at once for about 2–5 seconds. Nothing may show before the tagging step. Extend the quiet-start LEAF test to check every frame for the first 8 seconds.
> 2. First-time guidance: one short line about 60 cm ahead, "Look down. Pinch the things you'd save.", with the bottom chevron pointing to the belongings. Both disappear after the first tag.
> 3. Do a full first-time playthrough yourself, at Danger and at Alert, and report the time for each step, anything hard to reach, anything that overlapped, and any moment where nothing told me what to do next.

## Round 4: a cue at every step

The round 3 playthrough found four moments with no cue.

> 1. After the third tag, point the chevron toward the sideboard until all five are tagged.
> 2. Show the river-alert card in front of me, wherever I'm facing when it appears, and the same when it comes back at the end.
> 3. Add the edge arrow and the soft splash for the mains switch once it glows and is out of view.
> 4. The depth tag must never be cut off by furniture: draw it on top of everything, the same way the edge arrow is.
> 5. Re-run the playthrough at Danger and Alert and tell me if any step still leaves me without a cue.

## Round 5: the cues that matter most

A design audit against Snap's and the skill pack's design rules found that the two cues the whole Lens depends on were the weakest on screen.

> 1. The amber outline and dotted line must stay bright amber under the water: draw them after the water.
> 2. Depth tag: light text on a dark plate, about 40% larger, about 100 cm ahead, following my head with a soft lag rather than rigidly, and hidden while I'm carrying an item.
> 3. Add a "hips" body landmark at 50% of eye height, so 80 cm reads "up to your hips".
> 4. River-alert card: show it about 1 second after the fifth tick fades, leave a clear margin at both sides of the view, and widen the gaps between the three buttons.
> 5. Move the edge arrow slightly inward, about 12° from the centre of view.
> 6. At Danger only, draw a thin line on the wall at 150 cm with the label "Dec 2021, reported 1.5 m".
> 7. Re-run all LEAF tests and both playthroughs one at a time, and save the raw log.
