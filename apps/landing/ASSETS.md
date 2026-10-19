# Assets and licences

No image ships without a row here. Every painting was downloaded **only** from the holding museum's own
open-access endpoint by `scripts/fetch-art.mjs`, which also refuses any object the museum's API does not mark as
public domain:

- **The Met:** `GET collectionapi.metmuseum.org/public/collection/v1/objects/{id}` must return `isPublicDomain: true`
  (Met Open Access, CC0 1.0). Image = the object's `primaryImage`.
- **Rijksmuseum:** `GET id.rijksmuseum.nl/{id}?_profile=dc` must return `rights` = Public Domain Mark 1.0 or CC0 1.0.
  Image = the record's IIIF `relation` (`iiif.micr.io`), capped at 3000 px.

The raw evidence (API values on the day of the check) is in `art-src/records.json`. Checked **2026-10-18**.

> The paintings are centuries out of copyright; the question is the *photograph*. We only use files the museum
> itself publishes under CC0 / PDM, never a copy found elsewhere.

## Paintings

| Used for | Title | Artist | Date | Collection | Object URL | Licence |
|---|---|---|---|---|---|---|
| Intro | A Goldsmith in his Shop | Petrus Christus | 1449 | The Met, Robert Lehman Collection, 1975 (459052) | https://www.metmuseum.org/art/collection/search/459052 | CC0 1.0 (Met Open Access) |
| I Bezahlen | The Calling of Saint Matthew | Jan Sanders van Hemessen | early 17th century (per the Met) | The Met, Purchase, 1871 (436643) | https://www.metmuseum.org/art/collection/search/436643 | CC0 1.0 (Met Open Access) |
| II Kasse | Fish Market | Joachim Beuckelaer | 1568 | The Met, 2015 (679844) | https://www.metmuseum.org/art/collection/search/679844 | CC0 1.0 (Met Open Access) |
| III Wallet | Zinnebeeldige voorstelling van het muntwezen (Allegory of coinage) | Romeyn de Hooghe | 1670–1708 | Rijksmuseum, SK-A-833 | https://id.rijksmuseum.nl/20027197 | Public Domain Mark 1.0 |
| IV Auszahlung | Vismarkt bij avond (Fish market at night) | Egbert Lievensz. van der Poel | 1640–1664 | Rijksmuseum, SK-A-1755 | https://id.rijksmuseum.nl/20026050 | Public Domain Mark 1.0 |
| V Funkloch | Het kanonschot (The Cannon Shot) | Willem van de Velde (II) | ca. 1680 | Rijksmuseum, SK-C-244 | https://id.rijksmuseum.nl/200108360 | Public Domain Mark 1.0 |
| VI Pläne | Francesco Sassetti (1421–1490) and His Son Teodoro | Domenico Ghirlandaio | ca. 1488 | The Met, Jules Bache Collection, 1949 (436489) | https://www.metmuseum.org/art/collection/search/436489 | CC0 1.0 (Met Open Access) |
| VII Ordnung | De Staalmeesters (The Sampling Officials) | Rembrandt van Rijn | 1662 | Rijksmuseum, SK-C-6 | https://id.rijksmuseum.nl/200107929 | Public Domain Mark 1.0 |
| VIII Campus | Het stadhuis op de Dam in Amsterdam | Gerrit Berckheyde | 1672 | Rijksmuseum, SK-A-34 | https://id.rijksmuseum.nl/200108218 | Public Domain Mark 1.0 |
| IX Sicherheit | Het kantoor van de notaris (The notary's office) | Jan Woutersz Stap | ca. 1629 | Rijksmuseum, SK-A-1341 | https://id.rijksmuseum.nl/20026987 | Public Domain Mark 1.0 |
| X Für Entwickler | Antoine Laurent Lavoisier and Marie Anne Lavoisier | Jacques Louis David | 1788 | The Met, Wrightsman Gift, 1977 (436106) | https://www.metmuseum.org/art/collection/search/436106 | CC0 1.0 (Met Open Access) |
| Closing | De Waag en de kraan aan het Spaarne te Haarlem | Gerrit Berckheyde | 1660–1698 | Rijksmuseum, SK-A-35 | https://id.rijksmuseum.nl/200108216 | Public Domain Mark 1.0 |

Rijksmuseum object URLs are the museum's persistent identifiers; in a browser they redirect to the collection page.

**Not used, on purpose:** Quentin Matsys' *The Moneylender and his Wife* is in the Louvre (not one of our CC0
sources), and searches of the Met and Rijksmuseum open-access APIs on 2026-10-18 found no Marinus van Reymerswaele
money-changer, so Petrus Christus' goldsmith with his scales opens the page instead. A Rijksmuseum painting titled
*Joodse geldwisselaar* (SK-A-2044) was found and deliberately left out: on a payments page, a figure identified by
religion and money-changing would echo an old antisemitic trope.

### Treatment (`scripts/grade-art.mjs`, sharp)
Trim the frame edge → crop 16:10 (desktop) and 9:16 (mobile) around a per-painting focal point
(`scripts/art-manifest.json`) → saturation 0.82, slight contrast → soft-light ember highlight + ink vignette
(no baked grain: the page overlays it) → AVIF (q40) + WebP (q64) at 640/960/1280/2048 (portrait 640/960/1280) → 16 px blurred
placeholder in `lib/art.gen.ts`. Output: `public/art/`. Originals (`art-src/*.jpg`, ~26 MB) are git-ignored and
re-downloaded by `pnpm --filter @zaster/landing fetch-art`.

## App screens
`public/screens/*.{avif,webp}` are crops of our own screenshots in `docs/screenshots/` (`act1-payment-moment.png`,
`showcase-app.png`, `showcase-onboarding.png`), made by `scripts/screens.mjs` and shown inside CSS device frames.
Our own work; no third-party rights.

**Video slot:** `components/DeviceFrame.tsx` takes a `video` prop (MP4 + WebM + poster) and lazy-attaches the
sources in view. No screen recordings exist yet, so every device currently shows a still.

## Fonts
Inter, Inter Tight, Instrument Serif, Pinyon Script: all SIL Open Font License 1.1, self-hosted via `next/font`
(downloaded at build time from Google Fonts, served from our origin). The title lettering (`lib/lettering.gen.ts`)
is Inter Tight 800 outlines converted to paths by `scripts/letter-title.mjs`, which the OFL permits for artwork.

## Marks and icons
The Zaster receipt mark (`components/Mark.tsx`, `public/icon.svg`) is our own drawing.
