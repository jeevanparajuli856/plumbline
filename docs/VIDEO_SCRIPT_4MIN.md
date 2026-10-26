# Truehand demo video: script (v5)

Date: 2026-10-25. One video, about 5:05. YouTube, exported at 4K.
Supersedes the 2:45 cut in `docs/VIDEO_STORYBOARD.md`.

**How to use this file:** the lines in quotes under **VO** are what you read. Everything else is for the edit.
Read slowly, about 2.4 words per second. `(beat)` = half-second pause. `/` = breath.

---

## 1. Cold open: my uncle (0:00-0:25)

**SCREEN:** Black. One multimeter beep. Fade up on a slow, quiet shot: your uncle at his workbench (only with his permission), or his tools on a bench in soft light, a multimeter and a soldering iron, no hands shown. Warm grade, no music, room tone only.
**TEXT (small, lower left):** `My uncle. Blind. Still fixing things.`
On "where his probe really is": hard cut to the 3D bench, tight on a probe tip coming down between two rows.
**TEXT:** `3.671 V` slams in, one digit at a time, with a small screen shake.

**VO:** (first part quiet and personal, like telling one person; last line punchy)

> "My uncle is blind. / He loves working on electronics. (beat)
> He has been shocked more than once. / He still picks up the probe. (beat)
> His meter can tell him a number. / It cannot tell him where his probe really is. (beat)
> And that one gap is enough to make a machine / completely, / confidently wrong."

**SFX:** hard cut to silence on "wrong".

---

## 2. The problem (0:25-0:55)

**SCREEN:** 3D bench in slow motion: the probe slides one row off. Freeze frame. Two labels draw on: `told: row 3` and `actually: row 2`.

**VO:**

> "If you cannot see your hands, every measurement hides a question: / is the probe where I think it is? (beat)
> Talking multimeters fixed the display years ago. / Nobody fixed the probe. (beat)
> A blind participant in a 2024 study put the feeling in one line:"

**SCREEN:** Quote card, exact words:
_"Sometimes I wonder whether or not the inaccuracy is really more my picture taking skills."_
Under it: `Participant 23, "Misfitting With AI," ASSETS 2024`

**VO:**

> "Is the mistake mine, / or the machine's? / Without sight, you cannot check."

---

## 3. The numbers (0:55-1:19)

Animated statement, kinetic type over a field of dots. Every number has its source in small type on screen while it is visible.

**SCREEN:**
1. A dark globe made of dots. A counter rolls up: `2.2 billion` / `people live with a vision impairment.` Source: WHO, World report on vision, 2019.
2. Camera dives into the US. Dots regroup: `7.7 million Americans have a visual disability.` Source: NFB (2016 data).
3. A smaller cluster lights up: `547,000 students who are blind or have significant visual impairment.` Source: Frontiers in Education (2023), citing ACS.
4. A rising line marked `interest in math and science`, which hits a wall labelled `access`. Text: `High interest. Blocked by access.` Source: Bell & Silverman, Journal of Blindness Innovation and Research, 2018.
5. Two bars race: `76.3% of all working-age adults employed` vs `52.3% with visual impairments`. The gap between them flashes: `24 points`. Source: 2023 ACS, analyzed by NRTC, Mississippi State.

**VO:**

> "Two point two billion people live with a vision impairment. / In the US alone, seven point seven million. / More than half a million of them are students. (beat)
> Studies show blind teenagers want math and science. / What stops them is access. (beat)
> And it shows up later: / among working-age adults with visual impairments, / just over half have a job. (beat)
> Hands-on technical work should be one of the open doors. / Today, it is one of the closed ones."

---

## 4. Meet Truehand (1:19-1:35)

**SCREEN:** Home page hero: the three phones. Zoom through the center phone into the live app.
**TEXT:** `Truehand`

**VO:**

> "This is Truehand. / An assistant for blind hands, on mobile and the web. (beat)
> It does something no meter does: / it works out what is broken, / and where your probe really landed, / at the same time."

---

## 5. The slip (1:35-2:23)

**SCREEN:** Desktop web app, side by side. Left: Truehand. Right: the published method.
Instruction on screen and spoken by the app: "Touch the red probe to row 3."
3D bench: probe lands on row 2. Reading `3.671 V` enters both logs.
Right panel: `R2 is shorted, 100%`. Snap zoom, red flash, glitch on "100%".
Left panel: belief spreads out, top answer `63.1%`, nothing certain yet.

**VO:**

> "Here is a real fault. / One resistor on this board is ten times too small. (beat)
> Both systems say: touch row 3. / The hand lands on row 2. / Three point six seven one volts. (beat)
> The published method trusts the row. / One hundred percent sure: / R2 is shorted. (beat)
> Wrong part. / Wrong fix. / And it has no idea. (beat)
> Truehand does not trust the row. / It asks: / which fault, and which row, / best explain this number?"

---

## 6. The warning (2:23-2:51)

**SCREEN:** Warning banner slides in. Everything else dims. Let the app's own voice play, no music:
_"Warning. That reading did not come from row 3. It most likely came from row 2..."_
Then the second reading `0.338 V`. Whip pan to the answer card: `R3 is ten times too small`, `97.5%`.

**VO:** (after the app's voice finishes)

> "That is the moment. / It caught the slip from the number itself, / and asked for one more reading instead of guessing. (beat)
> Zero point three three eight volts. / R3, ten times too small. / Correct. (beat)
> Two readings. / One warning. / No guess."

---

## 7. It refuses to guess (2:51-3:07)

**SCREEN:** Unresolved replay. Two candidates slide in from left and right and stop, never merging: `LED open` and `LED reversed`. Status: `Unresolved`.

**VO:**

> "And when two faults look identical at every point on the board, / Truehand will not pick one to sound smart. / It tells you it cannot separate them. (beat)
> When you cannot check the screen, / an honest 'I don't know' / beats a confident wrong answer."

---

## 8. We tested it blindfolded (3:07-3:35)

No footage from the original tests, so this scene is type-driven. No generated people or hands.

**SCREEN:** Black frame. A blindfold drawn in line art, then text builds word by word on the beat: `Blindfolded.` `Real board.` `Real meter.` `Real slips.` Under it, the app's real warning audio plays (taken from the iPhone screen recording).
**TEXT (lower third):** `Tested by our team, blindfolded.`

**VO:**

> "We did not stop at simulation. / We built the board, / put on blindfolds, / and used Truehand ourselves, / on a real meter. (beat)
> Our hands slipped more often than we expected, / and Truehand caught it. (beat)
> Blindfolded is not blind. / We know that. / So the next test is not ours."

---

## 9. At scale, in simulation (3:35-3:57)

**SCREEN:** Two bars grow from zero. SIMULATED badge fixed top-right for the whole scene.
**TEXT:** `Ends confidently wrong` / Published method `27.7%` / Truehand `0.5%`
**TEXT (small):** `1,500 simulated faults, 5 seeds.`

**VO:**

> "Then we ran fifteen hundred simulated faults. (beat)
> The published method ended confidently wrong / more than one time in four. (beat)
> Truehand: / one time in two hundred."

---

## 10. In your pocket (3:57-4:11)

**SCREEN:** Real iPhone screen recording (iOS Screen Recording, mic on). Tap the Truehand icon on the Home Screen → splash mark → app opens full screen with the bottom tab bar → app says "Touch the red probe to row 3." → tap **Say reading**, speak "three point six seven one volts" → the number appears → the app speaks the warning → **Say reading**, "zero point three three eight volts" → the answer. In the edit, the recording sits inside a 3D phone that tilts to face-on, and a caption shows the spoken words as they are said.

**VO:**

> "Truehand is an app on your phone. (beat)
> Say the reading. / Hear the answer. (beat)
> No screen needed."

---

## 11. Our mission (4:11-4:41)

**SCREEN:** Pull back from the breadboard. The circuit fades and a kitchen thermometer probe in a roast fades in (the app's thermometer scene, SIMULATED badge), then the frame widens to a montage of everyday instruments a blind hand has to place: a probe, a sensor, a tool tip. Clean line art, one accent colour.
**TEXT:** `Circuits are the first instrument. Not the last.`

**VO:**

> "Truehand started with a breadboard. / It will not end there. (beat)
> The same idea already runs on a second instrument, / a kitchen thermometer, in simulation. / Anywhere a blind hand places a probe and trusts a number, / this research applies. (beat)
> And Truehand is our first product, / not our last. / Our mission is to take the newest breakthroughs in research, / and turn them into tools blind people can actually trust."

---

## 12. Close (4:41-5:05)

**SCREEN:** Calm dark background.
**TEXT:** `Mid-November 2026 · Field sessions with blind participants · Louisiana Center for the Blind`
Then a callback: `3.671 V` slams back in, the same as the cold open, but this time it turns cyan and a small label appears under it: `row 2`.
Then the logo, and: `It cannot tell you something it has not measured.` / `truehand.tech` / `Jeevan Parajuli · Pankaj Bhatta · University of Louisiana Monroe`

**VO:**

> "In mid-November, / we take Truehand to the Louisiana Center for the Blind, / and we measure real hands. (beat)
> Remember three point six seven one volts? (beat)
> One machine heard that number and named the wrong part. / Truehand heard the same number / and knew where your hand really was. (beat)
> We built it for my uncle, / and for everyone like him / who keeps picking up the probe. (beat)
> Truehand. (beat)
> It cannot tell you something it has not measured."

**SFX:** one meter beep. Cut to black.

---

## Recording the voiceover

- Quiet room, soft furnishings around you. Phone or USB mic 15-20 cm from your mouth, slightly off to the side.
- One file per scene (`vo-01.wav` ... `vo-12.wav`), 48 kHz. Two takes each, 2 seconds of silence between takes.
- Say numbers the way they are written in the VO ("three point six seven one volts").
- If a scene runs long, cut words. Do not speed up.
- Energy: scene 1 starts quiet and personal (your uncle), then turns punchy on the last line. Scenes 5, 6 punchy. Scene 3 (numbers) firm and steady. Scenes 7, 8 slower. Scene 11 rising, confident. Scene 12 starts quiet, warm on the uncle line, lands hard on the last line.
- Scene 1 first line: record it five or six times. Use the take where you sound like you are just telling someone about him, not performing.

## What we film (you two)

| Shot                          | Notes                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| iPhone screen recording | Real iPhone, not a simulator. Speech ON in Web app settings. From the Home Screen icon, one full worked example, readings spoken with **Say reading** ("three point six seven one volts", then "zero point three three eight volts"). Mic on so both your voice and the app's voice are captured. |

## What Claude builds

- 4K captures of the desktop web app (side by side, 3D bench, warning, answer, unresolved, thermometer, simulation chart).
- Remotion edit: snap zooms, whip pans, match cuts, zoom-through on the phone, type slams on numbers, the 3.671 V callback at the end.
- VO cleanup (noise, level, de-ess, -16 LUFS), captions burned in plus an SRT for YouTube, chapters, thumbnail.

## Open items

- [ ] Music: low bed under the VO that drops out for scenes 1, 6 and 7, or voice only.
- [ ] Before the final render, open the Frontiers in Education (2023) paper and the Bell & Silverman (2018) abstract and confirm the 547,000 figure and the wording on screen.
- [ ] Scene 1: ask your uncle if we may show him (photo or short clip) and whether to use his name. If not, use the tools-on-a-bench shot.
