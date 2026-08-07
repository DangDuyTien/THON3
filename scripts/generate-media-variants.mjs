import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const widths = [640, 960, 1440, 1920];
const profiles = [
  ["hero-home", "eq=contrast=1.04:brightness=-0.085:saturation=0.84"],
  ["hero-water", "eq=contrast=1.05:brightness=-0.06:saturation=0.98"],
  ["hero-road", "eq=contrast=1.1:brightness=-0.12:saturation=0.72"],
  ["hero-field", "eq=contrast=1.02:brightness=-0.08:saturation=0.9"],
  ["story-message", "eq=contrast=1.04:brightness=-0.03:saturation=0.88"],
  ["gallery-mono", "hue=s=0,eq=contrast=0.9:brightness=-0.11"],
  ["gallery-vivid", "eq=contrast=1.08:brightness=0:saturation=1.36"],
  ["gallery-warm", "colorchannelmixer=rr=0.89074:rg=0.13842:rb=0.03402:gr=0.06282:gg=0.9163:gb=0.03078:br=0.04914:bg=0.0963:bb=0.84358,eq=brightness=0.04:saturation=0.82"],
  ["archive-default", "eq=contrast=1.05:brightness=-0.04:saturation=0.92"],
  ["archive-muted", "hue=s=0,eq=contrast=0.92:brightness=-0.11"],
  ["archive-warm", "eq=contrast=1.08:brightness=-0.035:saturation=1.16"],
  ["archive-vivid", "eq=contrast=1.05:brightness=0.01:saturation=1.27"],
  ["update-soft", "eq=contrast=1.04:brightness=-0.06:saturation=0.94"],
  ["update-mono", "hue=s=0,eq=contrast=0.95:brightness=-0.125"],
  ["update-vivid", "eq=contrast=1.08:brightness=-0.025:saturation=1.3"],
  ["update-warm", "colorchannelmixer=rr=0.91402:rg=0.10766:rb=0.02646:gr=0.04886:gg=0.9349:gb=0.02394:br=0.03822:bg=0.0749:bb=0.87834,eq=contrast=1.04:brightness=-0.035:saturation=1.15"],
];

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const assetDirectory = join(scriptDirectory, "..", "public", "assets");
const temporaryDirectory = mkdtempSync(join(tmpdir(), "thon-media-"));

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

try {
  for (const [profile, filter] of profiles) {
    for (const width of widths) {
      const source = join(assetDirectory, `village-hero-${width}.webp`);
      const png = join(temporaryDirectory, `${profile}-${width}.png`);
      const target = join(assetDirectory, `village-hero-${profile}-${width}.webp`);
      if (!existsSync(source)) throw new Error(`Missing source asset: ${source}`);

      run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", source, "-frames:v", "1", "-vf", filter, png]);
      run("cwebp", ["-quiet", "-m", "6", "-q", "82", png, "-o", target]);
    }
  }

  console.log(`Generated ${profiles.length * widths.length} baked WebP variants.`);
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
