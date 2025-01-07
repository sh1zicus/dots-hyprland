const { GLib } = imports.gi;
import App from 'resource:///com/github/Aylur/ags/app.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import Mpris from 'resource:///com/github/Aylur/ags/service/mpris.js';
const { exec, execAsync } = Utils;
const { Box, EventBox, Icon, Scrollable, Label, Button, Revealer } = Widget;

import { AnimatedCircProg } from "../.commonwidgets/cairo_circularprogress.js";
import { showMusicControls } from '../../variables.js';
import { hasPlasmaIntegration } from '../.miscutils/system.js';

function isRealPlayer(player) {
    return (
        // Remove unecessary native buses from browsers if there's plasma integration
        !(hasPlasmaIntegration && player.busName.startsWith('org.mpris.MediaPlayer2.firefox')) &&
        !(hasPlasmaIntegration && player.busName.startsWith('org.mpris.MediaPlayer2.chromium')) &&
        // playerctld just copies other buses and we don't need duplicates
        !player.busName.startsWith('org.mpris.MediaPlayer2.playerctld') &&
        // Non-instance mpd bus
        !(player.busName.endsWith('.mpd') && !player.busName.endsWith('MediaPlayer2.mpd'))
    );
}

export const getPlayer = (name = userOptions.music.preferredPlayer) => Mpris.getPlayer(name) || Mpris.players[0] || null;
function lengthStr(length) {
    const min = Math.floor(length / 60);
    const sec = Math.floor(length % 60);
    const sec0 = sec < 10 ? '0' : '';
    return `${min}:${sec0}${sec}`;
}

function detectMediaSource(link) {
    if (link.startsWith("file://")) {
        if (link.includes('firefox-mpris'))
            return '󰈹 Firefox'
        return "󰈣 File";
    }
    let url = link.replace(/(^\w+:|^)\/\//, '');
    let domain = url.match(/(?:[a-z]+\.)?([a-z]+\.[a-z]+)/i)[1];
    if (domain == 'ytimg.com') return '󰗃 Youtube';
    if (domain == 'discordapp.net') return '󰙯 Discord';
    if (domain == 'sndcdn.com') return '󰓀 SoundCloud';
    return domain;
}

const DEFAULT_MUSIC_FONT = 'Gabarito, sans-serif';
function getTrackfont(player) {
    const title = player.trackTitle;
    const artists = player.trackArtists.join(' ');
    if (artists.includes('TANO*C') || artists.includes('USAO') || artists.includes('Kobaryo'))
        return 'Chakra Petch'; // Rigid square replacement
    if (title.includes('東方'))
        return 'Crimson Text, serif'; // Serif for Touhou stuff
    return DEFAULT_MUSIC_FONT;
}
function trimTrackTitle(title) {
    if (!title) return '';
    const cleanPatterns = [
        /【[^】]*】/,         // Touhou n weeb stuff
        " [FREE DOWNLOAD]", // F-777
    ];
    cleanPatterns.forEach((expr) => title = title.replace(expr, ''));
    return title;
}

const TrackProgress = ({ player, ...rest }) => {
    const _updateProgress = (circprog) => {
        // const player = Mpris.getPlayer();
        if (!player) return;
        // Set circular progress (see definition of AnimatedCircProg for explanation)
        circprog.css = `font-size: ${Math.max(player.position / player.length * 100, 0)}px;`
    }
    return AnimatedCircProg({
        ...rest,
        className: 'osd-music-circprog',
        vpack: 'center',
        extraSetup: (self) => self
            .hook(Mpris, _updateProgress)
            .poll(3000, _updateProgress)
        ,
    })
}

const TrackTitle = ({ player, ...rest }) => Label({
    ...rest,
    label: 'No music playing',
    xalign: 0,
    truncate: 'end',
    // wrap: true,
    className: 'osd-music-title',
    setup: (self) => self.hook(player, (self) => {
        // Player name
        self.label = player.trackTitle.length > 0 ? trimTrackTitle(player.trackTitle) : 'No media';
        // Font based on track/artist
        const fontForThisTrack = getTrackfont(player);
        self.css = `font-family: ${fontForThisTrack}, ${DEFAULT_MUSIC_FONT};`;
    }, 'notify::track-title'),
});

const TrackArtists = ({ player, ...rest }) => Label({
    ...rest,
    xalign: 0,
    className: 'osd-music-artists',
    truncate: 'end',
    setup: (self) => self.hook(player, (self) => {
        self.label = player.trackArtists.length > 0 ? player.trackArtists.join(', ') : '';
    }, 'notify::track-artists'),
})

const TrackControls = ({ player, ...rest }) => Widget.Revealer({
    revealChild: false,
    transition: 'slide_right',
    transitionDuration: userOptions.animations.durationLarge,
    child: Widget.Box({
        ...rest,
        vpack: 'center',
        className: 'osd-music-controls spacing-h-3',
        children: [
            Button({
                className: 'osd-music-controlbtn',
                onClicked: () => player.previous(),
                child: Label({
                    className: 'icon-material osd-music-controlbtn-txt',
                    label: 'skip_previous',
                })
            }),
            Button({
                className: 'osd-music-controlbtn',
                onClicked: () => player.next(),
                child: Label({
                    className: 'icon-material osd-music-controlbtn-txt',
                    label: 'skip_next',
                })
            }),
        ],
    }),
    setup: (self) => self.hook(Mpris, (self) => {
        // const player = Mpris.getPlayer();
        if (!player)
            self.revealChild = false;
        else
            self.revealChild = true;
    }, 'notify::play-back-status'),
});

const TrackSource = ({ player, ...rest }) => Widget.Revealer({
    revealChild: false,
    transition: 'slide_left',
    transitionDuration: userOptions.animations.durationLarge,
    child: Widget.Box({
        ...rest,
        className: 'osd-music-pill spacing-h-5',
        homogeneous: true,
        children: [
            Label({
                hpack: 'fill',
                justification: 'center',
                className: 'icon-nerd',
            }),
        ],
    }),
    setup: (self) => self.hook(Mpris, (self) => {
        const mpris = Mpris.getPlayer('');
        if (!mpris)
            self.revealChild = false;
        else
            self.revealChild = true;
    }),
});

const TrackTime = ({ player, ...rest }) => {
    return Widget.Revealer({
        revealChild: false,
        transition: 'slide_left',
        transitionDuration: userOptions.animations.durationLarge,
        child: Widget.Box({
            ...rest,
            vpack: 'center',
            className: 'osd-music-pill spacing-h-5',
            children: [
                Label({
                    setup: (self) => self.poll(1000, (self) => {
                        // const player = Mpris.getPlayer();
                        if (!player) return;
                        self.label = lengthStr(player.position);
                    }),
                }),
                Label({ label: '/' }),
                Label({
                    setup: (self) => self.hook(Mpris, (self) => {
                        // const player = Mpris.getPlayer();
                        if (!player) return;
                        self.label = lengthStr(player.length);
                    }),
                }),
            ],
        }),
        setup: (self) => self.hook(Mpris, (self) => {
            if (!player) self.revealChild = false;
            else self.revealChild = true;
        }),
    })
}

const PlayState = ({ player }) => {
    var position = 0;
    const trackCircProg = TrackProgress({ player: player });
    return Widget.Button({
        className: 'osd-music-playstate',
        child: Widget.Overlay({
            child: trackCircProg,
            overlays: [
                Widget.Button({
                    className: 'osd-music-playstate-btn',
                    onClicked: () => player.playPause(),
                    child: Widget.Label({
                        justification: 'center',
                        hpack: 'fill',
                        vpack: 'center',
                        setup: (self) => self.hook(player, (label) => {
                            label.label = `${player.playBackStatus == 'Playing' ? 'pause' : 'play_arrow'}`;
                        }, 'notify::play-back-status'),
                    }),
                }),
            ],
            passThrough: true,
        })
    });
}

const MusicControlsWidget = (player) => Box({
    className: 'osd-music spacing-h-20 test',
    children: [
        Box({
            vertical: true,
            className: 'spacing-v-5 osd-music-info',
            children: [
                Box({
                    vertical: true,
                    vpack: 'center',
                    hexpand: true,
                    children: [
                        TrackTitle({ player: player }),
                        TrackArtists({ player: player }),
                    ]
                }),
                Box({ vexpand: true }),
                Box({
                    className: 'spacing-h-10',
                    setup: (box) => {
                        box.pack_start(TrackControls({ player: player }), false, false, 0);
                        box.pack_end(PlayState({ player: player }), false, false, 0);
                        if(hasPlasmaIntegration || player.busName.startsWith('org.mpris.MediaPlayer2.chromium')) box.pack_end(TrackTime({ player: player }), false, false, 0)
                        // box.pack_end(TrackSource({ vpack: 'center', player: player }), false, false, 0);
                    }
                })
            ]
        })
    ]
})

export default () => Revealer({
    transition: 'slide_down',
    transitionDuration: userOptions.animations.durationLarge,
    revealChild: false,
    child: Box({
        children: Mpris.bind("players")
            .as(players => players.map((player) => (isRealPlayer(player) ? MusicControlsWidget(player) : null)))
    }),
    setup: (self) => self.hook(showMusicControls, (revealer) => {
        revealer.revealChild = showMusicControls.value;
    }),
})
