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
// Music track title label with customizable max characters for wrapping
const trackTitle = Label({
  hexpand: true,
  className: "txt-smallie bar-music-txt", // No truncation here
  setup: (self) => {
    const maxChars = 100; // Customizable number of characters before wrapping (can be changed dynamically)

    const update = () => {
      const mpris = Mpris.getPlayer("");
      if (mpris) {
        // Get the track title and artists, then truncate it based on maxChars
        let title = `${trimTrackTitle(mpris.trackTitle)} • ${mpris.trackArtists.join(", ")}`;
        if (title.length > maxChars) {
          title = title.slice(0, maxChars) + ""; // Optionally add ellipsis at the end if the text exceeds maxChars
        }
        self.label = title;
      } else {
        self.label = "No music playing";
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
