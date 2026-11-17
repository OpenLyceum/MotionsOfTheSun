/**
 * ZodiacConstellationsNode.ts
 *
 * Renders the 12 zodiac constellations as polyline stick figures + star dots in the
 * Lambert azimuthal sky projection. Each star's ecliptic (lon, lat) position is
 * converted to equatorial (ra, dec) using the inverse of `equatorialToEcliptic`
 * (from ZodiacConstellationsData), then projected onto the screen via `projectCelestial`.
 *
 * Labels are shown/hidden via `constellationLabelsVisibleProperty`. All nodes are
 * created once and updated in place as sidereal time animates.
 *
 * Formula (ecliptic → equatorial; porting plan Step 4.5):
 *   dec = asin(sin lat · cos ε + cos lat · sin ε · sin lon)
 *   ra  = atan2(cos lat · sin lon · cos ε − sin lat · sin ε,  cos lat · cos lon)
 */

import { Multilink } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { ECLIPTIC_CONSTELLATIONS, OBLIQUITY } from "../../common/ZodiacConstellationsData.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import MotionsOfTheSunNamespace from "../../MotionsOfTheSunNamespace.js";
import type { ZodiacModel } from "../model/ZodiacModel.js";
import { projectCelestial, viewOffset } from "./lambertProjection.js";

const SIN_OBL = Math.sin(OBLIQUITY);
const COS_OBL = Math.cos(OBLIQUITY);

/** Convert ecliptic (lon, lat) → equatorial (ra, dec) — inverse of equatorialToEcliptic. */
function eclipticToEquatorial(lon: number, lat: number): { ra: number; dec: number } {
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);

  const dec = Math.asin(sinLat * COS_OBL + cosLat * SIN_OBL * sinLon);
  const ra = Math.atan2(cosLat * sinLon * COS_OBL - sinLat * SIN_OBL, cosLat * cosLon);
  return { ra, dec };
}

/** The persistent nodes that draw one constellation; repositioned on every redraw. */
type ConstellationNodes = {
  readonly constellation: (typeof ECLIPTIC_CONSTELLATIONS)[number];
  readonly linePath: Path;
  readonly dots: Circle[];
  readonly label: Text;
};

export class ZodiacConstellationsNode extends Node {
  private readonly widthPx: number;
  private readonly offset: number;
  private readonly originX: number;
  private readonly labelContainer: Node;

  // Built once and updated in place. Sidereal time animates, so rebuilding these
  // Property-painted nodes on every redraw would leak color-Property listeners.
  private readonly constellationNodes: ConstellationNodes[];

  public constructor(model: ZodiacModel, widthPx: number, labelStrings: Record<string, string>) {
    super({ pickable: false });

    this.widthPx = widthPx;
    this.offset = viewOffset(widthPx);
    this.originX = widthPx / 2;

    const lineContainer = new Node();
    const dotContainer = new Node();
    this.labelContainer = new Node();

    this.constellationNodes = ECLIPTIC_CONSTELLATIONS.map((constellation) => {
      const linePath = new Path(null, {
        stroke: MotionsOfTheSunColors.constellationLineColorProperty,
        lineWidth: 1,
      });
      const dots = constellation.eclipticStars.map(
        () => new Circle(2, { fill: MotionsOfTheSunColors.constellationLineColorProperty }),
      );
      const label = new Text(labelStrings[constellation.name] ?? constellation.name, {
        font: new PhetFont({ size: 10, style: "italic" }),
        fill: MotionsOfTheSunColors.constellationLabelColorProperty,
      });
      lineContainer.addChild(linePath);
      dotContainer.children = [...dotContainer.children, ...dots];
      this.labelContainer.addChild(label);
      return { constellation, linePath, dots, label };
    });

    this.addChild(lineContainer);
    this.addChild(dotContainer);
    this.addChild(this.labelContainer);

    // Reposition the constellation art whenever sidereal time changes
    Multilink.lazyMultilink([model.siderealTimeRadProperty], (lst) => {
      this._redraw(lst);
    });

    // Bind label visibility
    model.constellationLabelsVisibleProperty.link((v) => {
      this.labelContainer.visible = v;
    });

    // Initial draw
    this._redraw(model.siderealTimeRadProperty.value);
  }

  private _redraw(lst: number): void {
    for (const { constellation, linePath, dots, label } of this.constellationNodes) {
      // Convert all stars from ecliptic → equatorial, then project
      const screenPositions: Array<{ x: number; y: number } | null> = constellation.eclipticStars.map(
        ({ lon, lat }) => {
          const { ra, dec } = eclipticToEquatorial(lon, lat);
          const pt = projectCelestial(ra, dec, lst, this.widthPx);
          if (!pt) {
            return null;
          }
          return { x: this.originX + pt.x, y: this.offset + pt.y };
        },
      );

      // ── Polyline stick figures ──────────────────────────────────────────
      const lineShape = new Shape();
      for (const poly of constellation.polylines) {
        let penDown = false;
        for (const idx of poly) {
          const pos = screenPositions[idx];
          if (!pos) {
            penDown = false;
            continue;
          }
          if (!penDown) {
            lineShape.moveTo(pos.x, pos.y);
            penDown = true;
          } else {
            lineShape.lineTo(pos.x, pos.y);
          }
        }
      }
      linePath.shape = lineShape;

      // ── Star dots (2 px radius) ─────────────────────────────────────────
      dots.forEach((dot, i) => {
        const pos = screenPositions[i];
        dot.visible = !!pos;
        if (pos) {
          dot.centerX = pos.x;
          dot.centerY = pos.y;
        }
      });

      // ── Centroid label ──────────────────────────────────────────────────
      // Compute centroid from visible stars
      const visible = screenPositions.filter((p) => p !== null) as Array<{ x: number; y: number }>;
      label.visible = visible.length > 0;
      if (visible.length > 0) {
        const cx = visible.reduce((sum, p) => sum + p.x, 0) / visible.length;
        const cy = visible.reduce((sum, p) => sum + p.y, 0) / visible.length;
        label.centerX = cx;
        label.centerY = cy - 12;
      }
    }
  }
}

MotionsOfTheSunNamespace.register("ZodiacConstellationsNode", ZodiacConstellationsNode);
