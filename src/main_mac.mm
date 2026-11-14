#import <Cocoa/Cocoa.h>
#include <iostream>
#include <filesystem>
#include <string>
#include <vector>
#include <thread>
#include "core/storage_manager.h"
#include "core/markdown_engine.h"
#include "core/reminder_manager.h"
#include "core/share_service.h"
#include "platform/ipc_message.h"
#include "platform/macos/window_controller_mac.h"
#include "platform/macos/webview_host_mac.h"
#include "platform/macos/platform_utils_mac.h"

namespace fs = std::filesystem;

static NSWindow* g_window = nil;
static WebViewHostMac g_webview;
static AppConfig g_config;
static std::string g_base_dir;

static void SendInitState() {
    nlohmann::json payload;
    payload["tabs"] = nlohmann::json::array();
    for (const auto& tab : g_config.tabs) {
        payload["tabs"].push_back({
            {"id", tab.first},
            {"title", tab.second}
        });
    }
    payload["active_tab_id"] = g_config.active_tab_id;
    payload["always_on_top"] = g_config.always_on_top;
    
    std::string md = StorageManager::LoadNoteMarkdown(g_base_dir + "/notes", g_config.active_tab_id);
    payload["markdown"] = md;
    
    g_webview.PostWebMessage(IPCBridge::Serialize(Actions::INIT_STATE, payload));
}

static void HandleWebMessage(const std::string& raw_json) {
    IPCMessage msg;
    if (!IPCBridge::Parse(raw_json, msg)) return;

    if (msg.action == "request_init") {
        SendInitState();
    } else if (msg.action == Actions::SAVE_NOTE || msg.action == "save_note") {
        std::string tab_id = msg.payload.value("tab_id", g_config.active_tab_id);
        std::string html = msg.payload.value("html", "");
        
        std::string md = "";
        if (msg.payload.contains("markdown") && msg.payload["markdown"].is_string() && !msg.payload["markdown"].get<std::string>().empty()) {
            md = msg.payload["markdown"].get<std::string>();
        } else {
            md = MarkdownEngine::SerializeToMarkdown("", html);
        }
        StorageManager::SaveNoteMarkdown(g_base_dir + "/notes", tab_id, md);
        ReminderManager::Instance().SyncNoteReminders(tab_id, md);
    } else if (msg.action == Actions::SWITCH_TAB || msg.action == "switch_tab") {
        std::string new_tab_id = msg.payload.value("tab_id", "");
        if (!new_tab_id.empty()) {
            g_config.active_tab_id = new_tab_id;
            StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
            SendInitState();
        }
    } else if (msg.action == Actions::CREATE_TAB || msg.action == "create_tab") {
        std::string id = msg.payload.value("id", "");
        std::string title = msg.payload.value("title", "Ghi chú mới");
        if (!id.empty()) {
            g_config.tabs.push_back({id, title});
            g_config.active_tab_id = id;
            StorageManager::SaveNoteMarkdown(g_base_dir + "/notes", id, "");
            StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
        }
    } else if (msg.action == Actions::RENAME_TAB || msg.action == "rename_tab") {
        std::string id = msg.payload.value("tab_id", "");
        std::string title = msg.payload.value("title", "");
        if (!id.empty() && !title.empty()) {
            for (auto& tab : g_config.tabs) {
                if (tab.first == id) {
                    tab.second = title;
                    break;
                }
            }
            StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
        }
    } else if (msg.action == Actions::DELETE_TAB || msg.action == "delete_tab") {
        std::string id = msg.payload.value("tab_id", "");
        if (!id.empty()) {
            StorageManager::DeleteNote(g_base_dir + "/notes", id);
            ReminderManager::Instance().RemoveNoteReminders(id);

            auto it = std::remove_if(g_config.tabs.begin(), g_config.tabs.end(),
                                     [&](const std::pair<std::string, std::string>& t) { return t.first == id; });
            g_config.tabs.erase(it, g_config.tabs.end());
            StorageManager::EnsureValidTabs(g_config);
            StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
        }
    } else if (msg.action == Actions::SAVE_IMAGE || msg.action == "save_image") {
        std::string b64 = msg.payload.value("data", "");
        std::string ext = msg.payload.value("ext", "png");
        std::string img_id = msg.payload.value("img_id", "");
        if (!b64.empty()) {
            auto bytes = IPCBridge::DecodeBase64(b64);
            std::string saved_path = StorageManager::SaveAssetImage(g_base_dir + "/assets", bytes, ext);
            
            fs::path rel = fs::relative(saved_path, g_base_dir);
            nlohmann::json reply;
            reply["path"] = rel.generic_string();
            reply["img_id"] = img_id;
            g_webview.PostWebMessage(IPCBridge::Serialize("image_saved", reply));
        }
    } else if (msg.action == Actions::TOGGLE_PIN || msg.action == "toggle_pin") {
        bool pin = msg.payload.value("always_on_top", false);
        g_config.always_on_top = pin;
        WindowControllerMac::SetAlwaysOnTop(g_window, pin);
        StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);

        nlohmann::json reply;
        reply["always_on_top"] = pin;
        g_webview.PostWebMessage(IPCBridge::Serialize("update_pin", reply));
    } else if (msg.action == Actions::COPY_TO_CLIPBOARD || msg.action == "copy_to_clipboard") {
        std::string text = msg.payload.value("text", "");
        if (!text.empty()) {
            PlatformUtilsMac::CopyToClipboard(text);
        }
    } else if (msg.action == Actions::OPEN_URL || msg.action == "open_url") {
        std::string url = msg.payload.value("url", "");
        if (!url.empty()) {
            PlatformUtilsMac::OpenURLInBrowser(url);
        }
    } else if (msg.action == "shorten_url") {
        std::string long_url = msg.payload.value("url", "");
        std::thread([long_url]() {
            std::string short_url = PlatformUtilsMac::ShortenUrlWithTinyUrl(long_url);
            nlohmann::json reply;
            reply["short_url"] = short_url;
            reply["long_url"] = long_url;
            g_webview.PostWebMessage(IPCBridge::Serialize("shorten_url_result", reply));
        }).detach();
    } else if (msg.action == Actions::SCHEDULE_REMINDER || msg.action == "schedule_reminder") {
        std::string note_id = msg.payload.value("note_id", g_config.active_tab_id);
        std::string item_id = msg.payload.value("item_id", "");
        std::string text = msg.payload.value("text", "");
        int64_t timestamp = msg.payload.value("target_timestamp", 0LL);
        std::string display_time = msg.payload.value("display_time", "");

        if (!item_id.empty() && timestamp > 0) {
            ReminderManager::Instance().AddOrUpdateReminder(note_id, item_id, text, timestamp, display_time);
        }
    } else if (msg.action == Actions::CANCEL_REMINDER || msg.action == "cancel_reminder") {
        std::string note_id = msg.payload.value("note_id", g_config.active_tab_id);
        std::string item_id = msg.payload.value("item_id", "");
        if (!item_id.empty()) {
            ReminderManager::Instance().CancelReminder(note_id, item_id);
        }
    } else if (msg.action == Actions::PUBLISH_WEB_SHARE || msg.action == "publish_web_share") {
        std::string note_id = msg.payload.value("note_id", g_config.active_tab_id);
        std::string title = msg.payload.value("title", "");
        std::string md = msg.payload.value("markdown_content", "");
        std::string client_public_url = msg.payload.value("public_url", "");
        
        std::vector<std::string> image_paths;
        if (msg.payload.contains("referenced_images") && msg.payload["referenced_images"].is_array()) {
            for (const auto& item : msg.payload["referenced_images"]) {
                if (item.is_string()) {
                    image_paths.push_back(item.get<std::string>());
                } else if (item.is_object() && item.contains("local_path")) {
                    image_paths.push_back(item["local_path"].get<std::string>());
                }
            }
        }

        ShareResult res = ShareService::Instance().PublishNote(note_id, title, md, image_paths, g_base_dir);
        if (!client_public_url.empty()) {
            res.public_url = client_public_url;
            res.success = true;
        }
        if (res.success && !res.public_url.empty()) {
            PlatformUtilsMac::CopyToClipboard(res.public_url);
        }

        nlohmann::json reply;
        reply["success"] = res.success;
        reply["share_id"] = res.share_id;
        reply["public_url"] = res.public_url;
        reply["error_message"] = res.error_message;
        g_webview.PostWebMessage(IPCBridge::Serialize(Actions::WEB_SHARE_COMPLETED, reply));
    }
}

@interface AppDelegate : NSObject <NSApplicationDelegate, NSWindowDelegate>
@property (nonatomic, strong) NSTimer* reminderTimer;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    g_base_dir = PlatformUtilsMac::GetApplicationSupportPath();
    StorageManager::LoadConfig(g_base_dir + "/config.json", g_config);

    NSRect frame = NSMakeRect(g_config.window_x, g_config.window_y, g_config.window_w, g_config.window_h);
    g_window = [[NSWindow alloc] initWithContentRect:frame
                                           styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable
                                             backing:NSBackingStoreBuffered
                                               defer:NO];

    g_window.delegate = self;
    g_window.minSize = NSMakeSize(280, 200);
    g_window.title = @"Note Local";

    WindowControllerMac::ApplyMacOSStyling(g_window);
    WindowControllerMac::SetAlwaysOnTop(g_window, g_config.always_on_top);

    // Tìm thư mục assets trong Bundle hoặc source code
    std::string resPath = PlatformUtilsMac::GetBundleResourcePath();
    std::string assetDir = resPath + "/assets";
    std::string indexPath = assetDir + "/index.html";

    if (!fs::exists(indexPath)) {
        // Fallback đường dẫn tương đối khi chạy dev
        assetDir = "src/ui/assets";
        indexPath = "src/ui/assets/index.html";
    }

    g_webview.Initialize(g_window, assetDir, indexPath, HandleWebMessage);

    [g_window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];

    // Khởi động đồng hồ kiểm tra lời nhắc mỗi giây
    self.reminderTimer = [NSTimer scheduledTimerWithTimeInterval:1.0 repeats:YES block:^(NSTimer * _Nonnull timer) {
        int64_t now_epoch = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        auto dueList = ReminderManager::Instance().CheckDueReminders(now_epoch);
        for (const auto& r : dueList) {
            std::string note_title = "Nhắc nhở";
            for (const auto& t : g_config.tabs) {
                if (t.first == r.note_id) { note_title = t.second; break; }
            }
            PlatformUtilsMac::ShowNotification(note_title, r.todo_text);
        }
    }];
}

- (void)windowDidMove:(NSNotification *)notification {
    if (!g_window) return;
    NSRect r = g_window.frame;
    g_config.window_x = (int)r.origin.x;
    g_config.window_y = (int)r.origin.y;
    StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
}

- (void)windowDidResize:(NSNotification *)notification {
    if (!g_window) return;
    NSRect r = g_window.frame;
    g_config.window_w = (int)r.size.width;
    g_config.window_h = (int)r.size.height;
    StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

- (void)applicationWillTerminate:(NSNotification *)notification {
    [self.reminderTimer invalidate];
    self.reminderTimer = nil;
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication* app = [NSApplication sharedApplication];
        AppDelegate* delegate = [[AppDelegate alloc] init];
        app.delegate = delegate;
        [app run];
    }
    return 0;
}
