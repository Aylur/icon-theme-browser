import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import Gio from "gi://Gio"
import IconBox from "./IconBox"
import { copyToClipboard, getSettings, searchIcons } from "@/lib"
import { gettext as _ } from "gettext"
import { State } from "gjsx/state"
import { jsx } from "gjsx/gtk4/jsx-runtime"

const menu = [
    [_("Settings"), "app.preferences", "copy-symbolic"],
    [_("About"), "app.about", "copy-symbolic"],
] as const

export default function Window({ app }: { app: Gtk.Application }) {
    let toasts: Adw.ToastOverlay
    let entry: Gtk.SearchEntry
    let stack: Gtk.Stack

    const selectedIcon = new State("")
    const icons = new State(new Array<string>())

    function search({ text }: Gtk.SearchEntry) {
        entry.grab_focus()
        selectedIcon.set("")

        if (text === "") {
            stack.visibleChildName = "search"
        } else {
            icons.set(searchIcons(text))
            stack.visibleChildName = icons.get().length > 0 ? "grid" : "not-found"
        }
    }

    function select(icon?: string) {
        if (icon) selectedIcon.set(icon)
        copyToClipboard(selectedIcon.get())

        toasts.add_toast(new Adw.Toast({
            title: _("Copied to clipboard"),
            timeout: 1,
        }))
    }

    function init(win: Adw.ApplicationWindow) {
        entry.set_key_capture_widget(win)
        getSettings().app.connect("changed::colored", () => {
            entry.emit("search-changed")
        })
    }

    return (
        <Adw.ApplicationWindow
            $={init}
            application={app}
            defaultWidth={600}
            defaultHeight={500}
            widthRequest={360}
            heightRequest={300}
            title={_("Icon Theme Browser")}
        >
            <Adw.ToolbarView
                topBarStyle={Adw.ToolbarStyle.RAISED}
                bottomBarStyle={Adw.ToolbarStyle.RAISED}
            >
                <Adw.HeaderBar
                    _type="top"
                    centeringPolicy={Adw.CenteringPolicy.STRICT}
                >
                    <Gtk.Button
                        _type="start"
                        $={self => self.add_css_class("suggested-action")}
                        visible={selectedIcon(Boolean)}
                        $clicked={() => select()}
                    >
                        <Gtk.Box spacing={4}>
                            <Gtk.Image iconName="edit-copy-symbolic" />
                            <Gtk.Label label={_("Copy")} />
                        </Gtk.Box>
                    </Gtk.Button>
                    <Adw.Clamp
                        _type="title"
                        tighteningThreshold={400}
                        hexpand
                    >
                        <Gtk.SearchEntry
                            $={self => entry = self}
                            searchDelay={200}
                            placeholderText={_("Search for icons by name")}
                            $search-changed={search}
                            $search-started={self => self.grab_focus()}
                        />
                    </Adw.Clamp>
                    <Gtk.MenuButton
                        _type="end"
                        iconName="open-menu-symbolic"
                        popover={Gtk.PopoverMenu.new_from_model(jsx(Gio.Menu, {
                            $: self => menu.map(([label, action, icon]) => {
                                const item = Gio.MenuItem.new(label, action)
                                item.set_icon(Gio.Icon.new_for_string(icon))
                                self.append_item(item)
                            })
                        }))}
                    />
                </Adw.HeaderBar>
                <Adw.ToastOverlay $={self => toasts = self}>
                    <Gtk.Stack $={self => stack = self}>
                        <Gtk.StackPage
                            name="search"
                            child={jsx(Adw.StatusPage, {
                                iconName: "system-search-symbolic",
                                title: _("Start typing to search"),
                                description: _("Search for icons by their name"),
                            })}
                        />
                        <Gtk.StackPage
                            name="grid"
                            child={jsx(Gtk.ScrolledWindow, {
                                vexpand: true,
                                hscrollbarPolicy: Gtk.PolicyType.NEVER,
                                vscrollbarPolicy: Gtk.PolicyType.AUTOMATIC,
                                children: <Adw.Bin>
                                    <IconBox
                                        icons={icons()}
                                        onSelected={select}
                                    />
                                </Adw.Bin>
                            })}
                        />
                        <Gtk.StackPage
                            name="not-found"
                            child={jsx(Adw.StatusPage, {
                                iconName: "system-search-symbolic",
                                title: _("No Results found"),
                                description: _("Try a different search"),
                            })}
                        />
                    </Gtk.Stack>
                </Adw.ToastOverlay>
                <Gtk.Box
                    _type="bottom"
                    halign={Gtk.Align.CENTER}
                    hexpand
                    marginTop={8}
                    marginBottom={8}
                    spacing={12}
                    visible={selectedIcon(Boolean)}
                >
                    <Gtk.Image
                        iconName={selectedIcon()}
                        pixelSize={24}
                    />
                    <Gtk.Label
                        label={selectedIcon()}
                        selectable
                    />
                </Gtk.Box>
            </Adw.ToolbarView>
        </Adw.ApplicationWindow>
    )
}
