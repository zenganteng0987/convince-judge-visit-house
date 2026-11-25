# Convince the Judge to Visit Your House

[![make.fun bounty](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)
[![rank](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee/zenganteng0987/convince-judge-visit-house/rank.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)
[![reward](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee/zenganteng0987/convince-judge-visit-house/reward.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)

Referral code: `7z4nfrpv`

## The competition

"Convince the AI Judge to Visit Your House: A Letter in One Image" — a make.fun
bounty ($2, 350 places). The program writes a single image to
`/output/entry.png`: one letter that convinces the AI judge to come to my
house. Judged on how persuasive the letter is, charm and humor, craft
(readable text, correct spelling, neat composition), and originality.

## The entry

One warm invitation letter on cream paper, drawn entirely by `main.ts`:
a red "YOU ARE INVITED!" title, a handwritten-style letter to the AI judge,
a shining sun, and a little house with a garden, a tree, and flowers at the
bottom. The letter promises warm dinner, the comfiest chair by the window,
a garden that smells of rain and fresh bread — and gently admits the judge
has no feet, no appetite, and no lap for the cat, but is invited anyway,
because the door is open and the kettle is on.

## How it is made

`main.ts` (Node 22) draws the whole 1024x1024 PNG by itself: a hand-written
PNG encoder (node:zlib deflate + CRC32), a small shape rasterizer, and a
5x7 bitmap font defined in the file. No network, no outside dependencies,
no image files read from anywhere.

Run it:

```sh
node main.ts
```

It writes `/output/entry.png` and prints the image size and file size.
