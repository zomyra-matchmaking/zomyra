/**
 * Generate Zomyra brand assets from the designer's vector lockup.
 *
 * Run it only when the artwork changes:
 *     npm i --no-save sharp && node scripts/make-brand-assets.js
 *
 * `sharp` is deliberately NOT a project dependency — it is a large native package and
 * this script runs perhaps twice a year. Install it ad hoc, or delete node_modules/sharp
 * afterwards. Nothing in the app imports it.
 *
 * Source: Logo_zomayra_.svgz (Illustrator, viewBox 0 0 1080 1080, single fill #5B2C70).
 * It contains 7 paths: indices 0-5 are the ZOMYRA wordmark letters, index 6 is the Z mark.
 *
 * Outputs into assets/images/:
 *   icon.png          1024x1024, OPAQUE white   (iOS rejects alpha in app icons)
 *   adaptive-icon.png 1024x1024, transparent    (mark inside Android's centre-66% safe zone)
 *   splash-icon.png   lockup, transparent       (interim — designer's splash still pending)
 *   zomyra-logo.png   1024x1024, transparent    (in-app <Logo/>, rendered square with `contain`)
 */

const fs = require('fs');
const sharp = require('sharp');

const SVG = fs.readFileSync(`${__dirname}/../assets/brand/zomyra-lockup.svg`, 'utf8');
const OUT = `${__dirname}/../assets/images/`;
const PURPLE = '#5B2C70';
const CANVAS = 1024;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const paths = [...SVG.matchAll(/<path[^>]*\/>/g)].map((m) => m[0]);
if (paths.length !== 7) throw new Error(`expected 7 paths, found ${paths.length}`);

const wrap = (inner, viewBox) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">` +
      `<style>.st2{fill:${PURPLE};}</style>${inner}</svg>`,
  );

// The Z mark on its own, viewBox cropped to its measured bounding box.
const markSvg = wrap(paths[6], '286 212 508 534');
const lockupSvg = wrap(paths.join(''), '0 0 1080 1080');

/**
 * Render an SVG so its long edge lands near `targetPx`, then trim to true ink bounds.
 * Density is derived rather than hardcoded — a fixed high density on a 1080 viewBox
 * produces a 13500px render and trips sharp's pixel limit.
 */
async function inked(svg, viewBoxLongEdge, targetPx = 2400) {
  const density = Math.round((96 * targetPx) / viewBoxLongEdge);
  const png = await sharp(svg, { density }).png().toBuffer();
  return sharp(png).trim({ threshold: 1 }).png().toBuffer();
}

/** Centre `art` on a CANVAS square so its longest side is `fraction` of it. */
async function onSquare(art, fraction, background) {
  const target = Math.round(CANVAS * fraction);
  const resized = await sharp(art)
    .resize(target, target, { fit: 'inside', background: CLEAR })
    .toBuffer();
  const { width, height } = await sharp(resized).metadata();
  return sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background },
  })
    .composite([
      {
        input: resized,
        top: Math.round((CANVAS - height) / 2),
        left: Math.round((CANVAS - width) / 2),
      },
    ])
    .png()
    .toBuffer();
}

(async () => {
  const mark = await inked(markSvg, 534);
  const lockup = await inked(lockupSvg, 1080);

  // iOS/store icon — flattened to RGB so no alpha channel survives.
  await sharp(await onSquare(mark, 0.72, WHITE)).removeAlpha().png().toFile(`${OUT}icon.png`);

  // Android adaptive foreground. 0.51 is not arbitrary: launchers mask to a circle of
  // 66% diameter, and at 0.55 the Z's bottom-left corner sat 18.6px outside it — a
  // bounding box that fits the square can still poke out of the circle. Measured, not
  // guessed; re-measure if the artwork changes.
  await sharp(await onSquare(mark, 0.51, CLEAR)).png().toFile(`${OUT}adaptive-icon.png`);

  // In-app <Logo/> — square, transparent, matches the component's `contain` box.
  await sharp(await onSquare(mark, 0.92, CLEAR)).png().toFile(`${OUT}zomyra-logo.png`);

  // Splash — the full lockup reads better than a bare mark; expo-splash-screen
  // scales it and paints its own background, so no canvas padding here.
  await sharp(lockup)
    .resize({ height: 1024, fit: 'inside' })
    .png()
    .toFile(`${OUT}splash-icon.png`);

  for (const f of ['icon.png', 'adaptive-icon.png', 'splash-icon.png', 'zomyra-logo.png']) {
    const m = await sharp(OUT + f).metadata();
    console.log(
      `${f.padEnd(18)} ${m.width}x${m.height}  channels=${m.channels}  alpha=${m.hasAlpha}`,
    );
  }
})();
