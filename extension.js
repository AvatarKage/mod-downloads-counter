import St from "gi://St";
import Soup from "gi://Soup";
import GLib from "gi://GLib";
import Clutter from "gi://Clutter";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

export default class ModDownloadsExtension extends Extension {
    enable() {
        this.settings = this.getSettings();

        this.settingsChangedId =
            this.settings.connect(
                "changed",
                () => {
                    this.startTimer();
                    this.update();
                }
            );

        this.session = new Soup.Session();

        this.milestones = [];

        for (let i = 100; i <= 900; i += 100) {
            this.milestones.push(i);
        }

        for (let i = 1000; i <= 9000; i += 1000) {
            this.milestones.push(i);
        }

        for (let i = 10000; i <= 90000; i += 10000) {
            this.milestones.push(i);
        }

        for (let i = 100000; i <= 900000; i += 100000) {
            this.milestones.push(i);
        }

        for (let i = 1000000; i <= 100000000; i += 1000000) {
            this.milestones.push(i);
        }

        for (let i = 200000000; i <= 1000000000; i += 100000000) {
            this.milestones.push(i);
        }

        for (let i = 2000000000; i <= 9000000000; i += 1000000000) {
            this.milestones.push(i);
        }

        this.lastMilestone =
            this.settings.get_int(
                "last-milestone"
            );

        this.indicator =
            new PanelMenu.Button(
                0.0,
                "Mod Downloads"
            );

        this.box =
            new St.BoxLayout({
                style_class: "moddownloads-box"
            });

        this.icon =
            new St.Label({
                text: "●",
                style_class: "moddownloads-dot",
                y_align: Clutter.ActorAlign.CENTER
            });

        this.label =
            new St.Label({
                text: "Loading...",
                y_align: Clutter.ActorAlign.CENTER,
                style_class: "moddownloads-label"
            });

        this.box.add_child(
            this.icon
        );

        this.box.add_child(
            this.label
        );

        this.indicator.add_child(
            this.box
        );

        let settingsItem =
            new PopupMenu.PopupMenuItem(
                "Settings"
            );

        settingsItem.connect(
            "activate",
            () => {
                this.openPreferences();
            }
        );

        this.indicator.menu.addMenuItem(
            settingsItem
        );

        Main.panel.addToStatusArea(
            "moddownloads",
            this.indicator
        );

        this.update();
        this.startTimer();
    }

    startTimer() {
        if (this.timer) {
            GLib.Source.remove(
                this.timer
            );
            this.timer = null;
        }

        this.timer =
            GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                900,
                () => {
                    this.update();
                    return GLib.SOURCE_CONTINUE;
                }
            );
    }

    async request(url, headers = {}) {
        let message =
            Soup.Message.new(
                "GET",
                url
            );

        for (let key in headers) {
            message.request_headers.append(
                key,
                headers[key]
            );
        }

        let bytes =
            await this.session.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                null
            );

        return JSON.parse(
            new TextDecoder().decode(
                bytes.get_data()
            )
        );
    }

    async curseforge() {
        let token = this.settings.get_string("curseforge-token");
        let authorId = this.settings.get_string("curseforge-author");

        if (!token || !authorId) return 0;

        let total = 0;

        let gameIds = [
            432, // Minecraft Java
            78022, // Minecraft Bedrock
            70216 // Hytale
        ];

        for (let gameId of gameIds) {
            let index = 0;
            let pageSize = 50;

            while (true) {
                let url =
                    "https://api.curseforge.com/v1/mods/search?" +
                    "gameId=" + gameId +
                    "&primaryAuthorId=" + authorId +
                    "&sortField=6" +
                    "&sortOrder=desc" +
                    "&index=" + index +
                    "&pageSize=" + pageSize;

                let data =
                    await this.request(
                        url,
                        {
                            "x-api-key": token,
                            "Accept": "application/json"
                        }
                    );

                if (!data.data || data.data.length === 0)
                    break;

                for (let mod of data.data) {
                    total += mod.downloadCount ?? 0;
                }

                if (data.data.length < pageSize)
                    break;

                index += pageSize;

                if (index > 5000)
                    break;
            }
        }

        return total;
    }

    async modrinth() {
        let author = this.settings.get_string("modrinth-author");

        if (!author) return 0;

        let user =
            await this.request(
                "https://api.modrinth.com/v2/user/" +
                encodeURIComponent(author),
                {
                    "User-Agent": "moddownloads-gnome-extension"
                }
            );

        let projects =
            await this.request(
                "https://api.modrinth.com/v2/user/" +
                user.id +
                "/projects",
                {
                    "User-Agent": "moddownloads-gnome-extension"
                }
            );

        let total = 0;

        for (let project of projects) {
            total += project.downloads ?? 0;
        }

        return total;
    }

    checkMilestone(total) {
        for (let milestone of this.milestones) {
            if (
                total >= milestone &&
                this.lastMilestone < milestone
            ) {
                Main.notify(
                    "Mod Downloads",
                    `🎉 Reached ${milestone.toLocaleString()} downloads!`
                );

                this.lastMilestone = milestone;

                this.settings.set_int(
                    "last-milestone",
                    milestone
                );
            }
        }
    }

    async update() {
        try {
            let cf = await this.curseforge();
            let mr = await this.modrinth();

            let total = cf + mr;

            this.checkMilestone(total);
            
            this.label.text = ` ${total.toLocaleString()}`;
        } catch (error) {
            logError(error);

            if (this.label) this.label.text = "Loading...";

            if (!this.retryTimer) {
                this.retryTimer = GLib.timeout_add_seconds(
                    GLib.PRIORITY_DEFAULT,
                    5,
                    () => {
                        this.retryTimer = null;
                        this.update();
                        return GLib.SOURCE_REMOVE;
                    }
                );
            }
        }
    }

    disable() {
        if (this.timer) {
            GLib.Source.remove(this.timer);
            this.timer = null;
        }

        if (this.retryTimer) {
            GLib.Source.remove(this.retryTimer);
            this.retryTimer = null;
        }

        if (this.settings) {
            if (this.settingsChangedId) {
                this.settings.disconnect(
                    this.settingsChangedId
                );
                this.settingsChangedId = null;
            }

            this.settings = null;
        }

        if (this.label) {
            this.label.destroy();
            this.label = null;
        }

        if (this.icon) {
            this.icon.destroy();
            this.icon = null;
        }

        if (this.box) {
            this.box.destroy();
            this.box = null;
        }

        if (this.indicator) {
            this.indicator.destroy();
            this.indicator = null;
        }

        if (this.session) {
            this.session.abort();
            this.session = null;
        }

        this.milestones = null;
        this.lastMilestone = null;
    }
}
