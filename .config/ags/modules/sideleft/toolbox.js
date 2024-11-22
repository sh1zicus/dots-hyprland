import Widget from "resource:///com/github/Aylur/ags/widget.js";
import ModuleConfigure from "../sideright/centermodules/configure.js";
import ColorPicker from "./tools/colorpicker.js";
import QuickScripts from "./tools/quickscripts.js";
const { Box, Scrollable } = Widget;
export default Scrollable({
  hscroll: "never",
  vscroll: "automatic",
  child: Box({
    vertical: true,
    className: "spacing-v-10",
    children: [
      // Box({ vexpand: true }),
      // ModuleCalendar(),
      ModuleConfigure(),
      // Name(),
      QuickScripts(),
      ColorPicker(),
    ],
  }),
});
