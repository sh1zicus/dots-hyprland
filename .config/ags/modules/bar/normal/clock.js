import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
const { Box, Label } = Widget;
const { GLib } = imports.gi;

const options = userOptions.asyncGet();
const timeFormat = options.time.format;
const dateFormat = options.time.dateFormatLong;

const time = Variable("", {
  poll: [
    options.time.interval,
    () => GLib.DateTime.new_now_local().format(timeFormat),
  ],
});

const date = Variable("", {
  poll: [
    options.time.dateInterval,
    () => GLib.DateTime.new_now_local().format(dateFormat),
  ],
});

const BarClock = () =>
  Widget.Box({
    vpack: "center",
    className: "spacing-h-4 ",
    children: [
      Widget.Label({
        className: "bar-time",
        label: time.bind(),
      }),
      Widget.Label({
        className: "txt-norm txt-onLayer1",
        label: "•",
      }),
      Widget.Label({
        className: "txt-smallie bar-date",
        label: date.bind(),
      }),
    ],
  });

export default () =>
  Widget.EventBox({
    child: Widget.Box({
      children: [BarClock()],
    }),
  });
