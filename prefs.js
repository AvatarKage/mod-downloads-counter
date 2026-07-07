import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";

import {
    ExtensionPreferences
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class Preferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        let settings = this.getSettings();
        let page = new Adw.PreferencesPage();
        let group = new Adw.PreferencesGroup();

        function entry(title, help, key) {
            let box =
                new Gtk.Box({
                    orientation:
                        Gtk.Orientation.VERTICAL,
                    spacing: 8
                });

            box.set_margin_top(12);
            box.set_margin_bottom(12);
            box.set_margin_start(12);
            box.set_margin_end(12);

            let titleLabel =
                new Gtk.Label({
                    label: title,
                    xalign: 0
                });

            titleLabel.add_css_class(
                "heading"
            );

            let helpLabel =
                new Gtk.Label({
                    label: help,
                    xalign: 0,
                    wrap: true
                });

            helpLabel.add_css_class(
                "dim-label"
            );

            helpLabel.set_max_width_chars(
                70
            );

            let input =
                new Gtk.Entry({
                    hexpand: true
                });

            settings.bind(
                key,
                input,
                "text",
                Gio.SettingsBindFlags.DEFAULT
            );

            box.append(
                titleLabel
            );

            box.append(
                helpLabel
            );

            box.append(
                input
            );

            let row =
                new Adw.PreferencesRow();

            row.set_child(
                box
            );

            group.add(
                row
            );

        }

        entry(
            "CurseForge API Token",
            "Create an API key from the CurseForge Developer Console (console.curseforge.com) then copy the API token here. This allows the extension to read CurseForge download statistics.",
            "curseforge-token"
        );

        entry(
            "CurseForge Author ID",
            "Find your Author ID by visiting one of your CurseForge projects. Use the project ID with 'api.curseforge.com/v1/mods/PROJECT_ID' and copy the id value from the authors section. Your API token must be included in the x-api-key header. This can be completed using Postman or equivalent.",
            "curseforge-author"
        );

        entry(
            "Modrinth Author",
            "Enter your Modrinth username. The extension uses it to find your projects and calculate total downloads.",
            "modrinth-author"
        );

        let resetBox =
            new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 8
            });

        resetBox.set_margin_top(12);
        resetBox.set_margin_bottom(12);
        resetBox.set_margin_start(12);
        resetBox.set_margin_end(12);

        let title =
            new Gtk.Label({
                label: "Milestone Notifications",
                xalign: 0
            });

        title.add_css_class("heading");

        let subtitle =
            new Gtk.Label({
                label: "Reset saved milestones so notifications can appear again. Useful if switching to another account.",
                xalign: 0,
                wrap: true
            });

        subtitle.add_css_class("dim-label");

        let button =
            new Gtk.Button({
                label: "Reset Milestones",
                halign: Gtk.Align.START
            });

        button.add_css_class("destructive-action");

        button.connect("clicked", () => {
            settings.set_int("last-milestone", 0);
        });

        resetBox.append(title);
        resetBox.append(subtitle);
        resetBox.append(button);

        let row =
            new Adw.PreferencesRow();

        row.set_child(resetBox);

        group.add(row);

        page.add(
            group
        );

        window.add(
            page
        );
    }
}