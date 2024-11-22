import Widget from "resource:///com/github/Aylur/ags/widget.js";
import clickCloseRegion from "../.commonwidgets/clickcloseregion.js";
import PopupWindow from "../.widgethacks/popupwindow.js";
import SidebarLeft from "./sideleft.js";
const { Box } = Widget;

export default () =>
  PopupWindow({
    keymode: "on-demand",
    anchor: ["left", "top", "bottom"],
    name: "sideleft",
    layer: "top",
    child: Box({
      children: [
        SidebarLeft(),
        clickCloseRegion({
          name: "sideleft",
          multimonitor: false,
          fillMonitor: "horizontal",
        }),
      ],
    }),
  });
