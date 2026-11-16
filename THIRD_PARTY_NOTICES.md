# Third-party fonts

The application code is MIT licensed. Bundled fonts retain their own licenses.

| Font | License | License file |
| --- | --- | --- |
| Courier Prime | SIL Open Font License 1.1 | [License](fonts/licenses/CourierPrime-OFL.txt) |
| Vazirmatn | SIL Open Font License 1.1 | [License](fonts/licenses/Vazirmatn-LICENSE.txt) |
| Special Elite | Apache License 2.0 | [License](fonts/licenses/SpecialElite-LICENSE.txt) |

Font license texts are reproduced from the [Google Fonts repository](https://github.com/google/fonts).

## Recorded mechanical typewriter sounds (CC0)

Digital Ink includes five short **downloaded, real-world recordings**; these are not generated from the app's synthesized fallback. Files have been trimmed/converted by the upstream app. The upstream [Typewriter Letter](https://github.com/Appletrumpet/Typewriter) project documents their source and licenses. We retain independent credit links as a courtesy.

| Bundled file(s) | Original recording | Creator | License |
| --- | --- | --- | --- |
| `sounds/key-1.wav` – `key-3.wav` | [typewriter.wav](https://freesound.org/s/160678/); [Typewriter single key type 2](https://freesound.org/s/380137/); carriage thunk excerpt from the recording below | BMacZero, yottasounds, knufds | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `sounds/carriage-return.wav` | [Typewriter bell & carriage reset](https://freesound.org/s/345955/) | knufds | CC0 1.0 |
| `sounds/paper-select.wav` | [paper2.wav](https://freesound.org/s/68221/) | XTYL33 | CC0 1.0 |

Bundled audio copies come from [Appletrumpet/Typewriter `public/sfx/`](https://github.com/Appletrumpet/Typewriter/tree/main/public/sfx) at the verified Git blob IDs pinned in `scripts/vendor-media.py`. The application does **not** contact Freesound or upstream GitHub to play sound.

### App icon

`icons/icon-art.webp.b64` is original icon artwork made for Digital Ink. `scripts/vendor-media.py` renders the PNG and SVG app icon assets from this source. The icon is not a third-party stock illustration.

## Persian typewriter print font

**Parastoo** by **Saber Rastikerdar / The Parastoo Project Authors** is bundled for the worn Persian letterpress effect. The font is distributed under the **SIL Open Font License 1.1**.

- Official source: [Google Fonts — Parastoo](https://github.com/google/fonts/tree/main/ofl/parastoo) (the pinned variable TTF source and license are verified by Git blob hash in `scripts/vendor-persian-font.py`).
- Bundled font: [`fonts/Parastoo-Persian-Typewriter.woff2`](fonts/Parastoo-Persian-Typewriter.woff2); copied/converted with fontTools, with no changes to font outlines.
- License text: [`fonts/licenses/Parastoo-OFL.txt`](fonts/licenses/Parastoo-OFL.txt).

The CSS font-face uses the Arabic-script Unicode range only. Latin typewriter text remains in Courier Prime / Special Elite. Persian ink pressure and baseline jitter are CSS rendering effects, not changes to the font or stored note content.
