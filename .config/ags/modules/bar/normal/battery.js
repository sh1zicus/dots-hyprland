import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
const { Box, Label, Overlay, Revealer } = Widget;
const { GLib } = imports.gi;
import Battery from "resource:///com/github/Aylur/ags/service/battery.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";

const options = userOptions.asyncGet();

const batteryProgressCache = new Map();
const BarBatteryProgress = () => {
  const _updateProgress = (circprog) => {
    const percent = Battery.percent;
    const key = `${percent}-${Battery.charged}`;

    if (!batteryProgressCache.has(key)) {
      const css = `font-size: ${Math.abs(percent)}px;`;
      batteryProgressCache.set(key, css);
    }

    circprog.css = batteryProgressCache.get(key);
    circprog.toggleClassName(
      "bar-batt-circprog-low",
      percent <= options.battery.low,
    );
    circprog.toggleClassName("bar-batt-circprog-full", Battery.charged);
  };

  return AnimatedCircProg({
    className: "bar-batt-circprog",
    vpack: "center",
    hpack: "center",
    extraSetup: (self) => self.hook(Battery, _updateProgress),
  });
};

const BarBattery = () =>
  Box({
    className: "spacing-h-4 bar-batt-txt",
    children: [
      Revealer({
        transitionDuration: userOptions.asyncGet().animations.durationSmall,
        revealChild: false,
        transition: "slide_right",
        child: MaterialIcon("bolt", "norm", { tooltipText: "Charging" }),
        setup: (self) =>
          self.hook(Battery, (revealer) => {
            self.revealChild = Battery.charging;
          }),
      }),
      Overlay({
        child: Widget.Box({
          vpack: "center",
          className: "bar-batt",
          homogeneous: true,
          children: [MaterialIcon("", "small")],
          setup: (self) =>
            self.hook(Battery, (box) => {
              box.toggleClassName(
                "bar-batt-low",
                Battery.percent <= userOptions.asyncGet().battery.low,
              );
              box.toggleClassName("bar-batt-full", Battery.charged);
            }),
        }),
        overlays: [BarBatteryProgress()],
      }),
    ],
  });

const BatteryModule = () =>
  Box({
    className: "spacing-h-4",
    children: [BarBattery()],
  });

export default () =>
  Widget.EventBox({
    onPrimaryClick: () => App.toggleWindow("sideleft"),
    onMiddleClick: () => Utils.exec(`obsidian`),
    onSecondaryClick: () => Utils.execAsync(`ags run-js 'cycleMode();'`),
    child: Widget.Box({
      children: [BatteryModule()],
    }),
  });
