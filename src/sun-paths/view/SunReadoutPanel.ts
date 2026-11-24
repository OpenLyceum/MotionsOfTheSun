/**
 * SunReadoutPanel.ts
 *
 * Ephemeris readout panel for the Sun Paths screen. Displays seven live rows:
 *  1. Altitude (degrees)
 *  2. Azimuth (degrees)
 *  3. Right Ascension (h m)
 *  4. Declination (degrees)
 *  5. Hour Angle (h m, signed)
 *  6. Sidereal Time (HH:MM)
 *  7. Equation of Time (m:ss, signed)
 */

import { DerivedProperty } from "scenerystack/axon";
import { roundSymmetric, toFixed } from "scenerystack/dot";
import { GridBox, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { MotionsOfTheSunPanel } from "../../common/MotionsOfTheSunPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { CONTROL_FONT_SIZE, PANEL_CONTENT_SPACING, PANEL_TITLE_FONT_SIZE } from "../../MotionsOfTheSunConstants.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";

// ── Formatters ─────────────────────────────────────────────────────────────────

const formatDeg = (deg: number, decimals = 1): string => {
  const sign = deg < 0 ? "−" : "";
  return `${sign}${toFixed(Math.abs(deg), decimals)}°`;
};

const formatRa = (hours: number): string => {
  const normalized = ((hours % 24) + 24) % 24;
  const h = Math.floor(normalized);
  const m = Math.floor((normalized - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

const formatHoursMinutesSigned = (hours: number): string => {
  const sign = hours < 0 ? "−" : "+";
  const absH = Math.abs(hours);
  const h = Math.floor(absH);
  const m = Math.floor((absH - h) * 60);
  return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
};

const formatSiderealTime = (hours: number): string => {
  const normalized = ((hours % 24) + 24) % 24;
  const h = Math.floor(normalized);
  const m = Math.floor((normalized - h) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

const formatEoT = (minutes: number): string => {
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  const m = Math.floor(abs);
  const s = roundSymmetric((abs - m) * 60);
  return `${sign}${m}:${s.toString().padStart(2, "0")}`;
};

// ── Panel ──────────────────────────────────────────────────────────────────────

export class SunReadoutPanel extends MotionsOfTheSunPanel {
  public constructor(model: SunPathsModel) {
    const strings = StringManager.getInstance().getSunPathsStrings();

    const titleText = new Text(strings.informationTitleStringProperty, {
      font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
      fill: MotionsOfTheSunColors.textColorProperty,
    });

    const makeRow = (
      labelProperty: import("scenerystack/axon").TReadOnlyProperty<string>,
      valueProperty: import("scenerystack/axon").TReadOnlyProperty<string>,
    ): [Text, Text] => [
      new Text(labelProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: MotionsOfTheSunColors.textColorProperty,
        maxWidth: 120,
      }),
      new Text(valueProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: MotionsOfTheSunColors.accentColorProperty,
        maxWidth: 80,
      }),
    ];

    const altValueProperty = new DerivedProperty([model.sunAltDegProperty], (alt) => formatDeg(alt));
    const azValueProperty = new DerivedProperty([model.sunAzDegProperty], (az) => `${toFixed(az, 1)}°`);
    const raValueProperty = new DerivedProperty([model.sunRaHoursProperty], (ra) => formatRa(ra));
    const decValueProperty = new DerivedProperty([model.sunDecDegProperty], (dec) => formatDeg(dec));
    const haValueProperty = new DerivedProperty([model.hourAngleHoursProperty], (ha) => formatHoursMinutesSigned(ha));
    const lstValueProperty = new DerivedProperty([model.siderealTimeHoursProperty], (lst) => formatSiderealTime(lst));
    const eotValueProperty = new DerivedProperty([model.eqnOfTimeMinutesProperty], (eot) => formatEoT(eot));

    const rows: [Text, Text][] = [
      makeRow(strings.altitudeStringProperty, altValueProperty),
      makeRow(strings.azimuthStringProperty, azValueProperty),
      makeRow(strings.rightAscensionStringProperty, raValueProperty),
      makeRow(strings.declinationStringProperty, decValueProperty),
      makeRow(strings.hourAngleStringProperty, haValueProperty),
      makeRow(strings.siderealTimeStringProperty, lstValueProperty),
      makeRow(strings.equationOfTimeStringProperty, eotValueProperty),
    ];

    const grid = new GridBox({
      xSpacing: 8,
      ySpacing: 4,
      rows: rows,
    });

    const content = new VBox({
      align: "left",
      spacing: PANEL_CONTENT_SPACING,
      children: [titleText, grid],
    });

    super(content);
  }
}
