// resources.js

import {
  Box,
  Button,
  Label,
  Overlay,
} from "resource:///com/github/Aylur/ags/widget.js";
import { execAsync } from "resource:///com/github/Aylur/ags/utils.js";
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";

// Function to create a resource widget (e.g., CPU, RAM, Swap)
const BarResource = (
  name,
  icon,
  command,
  circprogClassName = "bar-batt-circprog",
  textClassName = "txt-onSurfaceVariant",
  iconClassName = "bar-batt",
) => {
  const resourceCircProg = AnimatedCircProg({
    className: `${circprogClassName}`,
    vpack: "center",
    hpack: "center",
  });

  const resourceLabel = Label({
    className: `txt-smallie ${textClassName}`,
  });

  const widget = Button({
    onClicked: () =>
      execAsync([
        "bash",
        "-c",
        `${userOptions.asyncGet().apps.taskManager}`,
      ]).catch(print),
    child: Box({
      className: `spacing-h-4 ${textClassName}`,
      children: [
        Box({
          homogeneous: true,
          children: [
            Overlay({
              child: Box({
                vpack: "center",
                className: `${iconClassName}`,
                homogeneous: true,
                children: [MaterialIcon(icon, "small")],
              }),
              overlays: [resourceCircProg],
            }),
          ],
        }),
        resourceLabel,
      ],
      setup: (self) =>
        self.poll(5000, () => {
          execAsync(["bash", "-c", command])
            .then((output) => {
              const value = Math.round(Number(output));
              resourceCircProg.css = `font-size: ${value}px;`;
              resourceLabel.label = `${value}%`;
              widget.tooltipText = `${name}: ${value}%`;
            })
            .catch((err) =>
              console.error("Error fetching resource data:", err),
            );
        }),
    }),
  });

  return widget;
};

// Function to handle system or custom module widgets
export const SystemResourcesOrCustomModule = () => {
  const CUSTOM_MODULE_CONTENT_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-poll.sh`;
  const CUSTOM_MODULE_CONTENT_INTERVAL_FILE = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-interval.txt`;

  if (GLib.file_test(CUSTOM_MODULE_CONTENT_SCRIPT, GLib.FileTest.EXISTS)) {
    const interval =
      Number(execAsync(CUSTOM_MODULE_CONTENT_INTERVAL_FILE)) || 5000;
    let cachedLabel = "";

    // Function to update the custom label
    const updateLabel = async (label) => {
      try {
        const newContent = await execAsync([CUSTOM_MODULE_CONTENT_SCRIPT]);
        if (newContent !== cachedLabel) {
          cachedLabel = newContent;
          label.label = newContent;
        }
      } catch (err) {
        console.error("Error updating label:", err);
      }
    };

    return Box({
      children: [
        Button({
          child: Label({
            className: "txt-smallie txt-onSurfaceVariant",
            useMarkup: true,
            setup: (self) => {
              updateLabel(self);
              self.poll(interval, () => updateLabel(self));
            },
          }),
          onPrimaryClickRelease: () =>
            execAsync(CUSTOM_MODULE_LEFTCLICK_SCRIPT),
          onSecondaryClickRelease: () =>
            execAsync(CUSTOM_MODULE_RIGHTCLICK_SCRIPT),
          onMiddleClickRelease: () =>
            execAsync(CUSTOM_MODULE_MIDDLECLICK_SCRIPT),
          onScrollUp: () => execAsync(CUSTOM_MODULE_SCROLLUP_SCRIPT),
          onScrollDown: () => execAsync(CUSTOM_MODULE_SCROLLDOWN_SCRIPT),
        }),
      ],
    });
  }

  // If no custom module, return the default system resource widgets (RAM, Swap, CPU)
  return Box({
    children: [
      BarResource(
        "RAM Usage",
        "memory",
        `LANG=C free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`,
        "bar-ram-circprog",
        "bar-ram-txt",
        "bar-ram-icon",
      ),
      Box({
        children: [
          BarResource(
            "Swap Usage",
            "swap_horiz",
            `LANG=C free | awk '/^Swap/ {if ($2 > 0) printf("%.2f\\n", ($3/$2) * 100); else print "0";}'`,
            "bar-swap-circprog",
            "bar-swap-txt",
            "bar-swap-icon",
          ),
          BarResource(
            "CPU Usage",
            "settings_motion_mode",
            `LANG=C top -bn1 | grep Cpu | sed 's/\\,/\\./g' | awk '{print $2}'`,
            "bar-cpu-circprog",
            "bar-cpu-txt",
            "bar-cpu-icon",
          ),
        ],
      }),
    ],
  });
};

// Default export of the module
export default SystemResourcesOrCustomModule;
