import Mpris from "resource:///com/github/Aylur/ags/service/mpris.js";
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
import { showMusicControls } from "../../../variables.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
const { Box, Button, Label, Overlay } = Widget;

// Helper function to trim track title
function trimTrackTitle(title) {
  if (!title) return "No title";
  const cleanPatterns = [/【[^】]*】/, " [FREE DOWNLOAD]"];
  return cleanPatterns.reduce(
    (str, pattern) => str.replace(pattern, ""),
    title,
  );
}

// Track progress circle widget
const TrackProgress = () => {
  const _updateProgress = (circprog) => {
    const mpris = Mpris.getPlayer("");
    if (!mpris) return;
    circprog.css = `font-size: ${Math.max((mpris.position / mpris.length) * 100, 0)}px;`;
  };
  return AnimatedCircProg({
    className: "bar-music-circprog",
    vpack: "center",
    hpack: "center",
    setup: (self) => {
      self.hook(Mpris, () => _updateProgress(self), "player-changed");
      self.hook(Mpris, () => _updateProgress(self), "position");
      self.poll(3000, () => _updateProgress(self));
    },
  });
};

// Music playback state button
const playingState = Box({
  homogeneous: true,
  children: [
    Overlay({
      child: Box({
        vpack: "center",
        className: "bar-music-playstate",
        homogeneous: true,
        children: [
          Label({
            vpack: "center",
            className: "bar-music-playstate-txt",
            justification: "center",
            setup: (self) =>
              self.hook(Mpris, () => {
                const mpris = Mpris.getPlayer("");
                self.label =
                  mpris?.playBackStatus === "Playing" ? "pause" : "play_arrow";
              }),
          }),
        ],
        setup: (self) =>
          self.hook(Mpris, () => {
            const mpris = Mpris.getPlayer("");
            if (!mpris) return;
            self.toggleClassName(
              "bar-music-playstate-playing",
              mpris.playBackStatus === "Playing",
            );
            self.toggleClassName("bar-music-playstate", true);
          }),
      }),
      overlays: [TrackProgress()],
    }),
  ],
});

// Music track title label
const trackTitle = Label({
  hexpand: true,
  className: "txt-smallie bar-music-txt",
  truncate: "end",
  maxWidthChars: 1,
  setup: (self) => {
    const update = () => {
      const mpris = Mpris.getPlayer("");
      if (mpris) {
        self.label = `${trimTrackTitle(mpris.trackTitle)} • ${mpris.trackArtists.join(", ")}`;
      } else {
        self.label = "No media";
      }
    };
    self.hook(Mpris, update, "player-changed");
    self.hook(Mpris, update, "changed");
  },
});

// Music widget container
const MusicStuff = () => {
  const musicStuff = Box({
    className: "spacing-h-10",
    hexpand: true,
    children: [
      // playingState,
      trackTitle,
    ],
  });

  return musicStuff;
};

// Default export of the MusicStuff function
export default MusicStuff;
