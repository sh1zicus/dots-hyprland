import Widget from "resource:///com/github/Aylur/ags/widget.js";
const { Box, Label, Scrollable } = Widget;
import QuickScripts from "./tools/quickscripts.js";
import ColorPicker from "./tools/colorpicker.js";
import Name from "./tools/name.js";
import { ModuleCalendar } from "../sideright/calendar.js";
import ModuleConfigure from "../sideright/centermodules/configure.js";
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
