#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <filesystem>
#include <iostream>
#include <vector>
#include "core/storage_manager.h"
#include "core/markdown_engine.h"
#include "core/reminder_manager.h"
#include "core/share_service.h"
#include "platform/window_controller.h"
#include "platform/webview_host.h"
#include "platform/ipc_message.h"
#include "platform/notification_service.h"
#include <winhttp.h>
#include <sstream>
#include <iomanip>
#include <thread>

namespace fs = std::filesystem;

static std::string ShortenUrlWithTinyUrl(const std::string& long_url) {
    if (long_url.length() > 2000) {
        return long_url;
    }

    HINTERNET hSession = WinHttpOpen(L"NoteLocal/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
    if (!hSession) return long_url;

    HINTERNET hConnect = WinHttpConnect(hSession, L"tinyurl.com", INTERNET_DEFAULT_HTTPS_PORT, 0);
    if (!hConnect) {
        WinHttpCloseHandle(hSession);
        return long_url;
    }

    std::ostringstream escaped;
    for (char c : long_url) {
        if (isalnum((unsigned char)c) || c == '-' || c == '_' || c == '.' || c == '~') {
            escaped << c;
        } else {
            escaped << '%' << std::uppercase << std::hex << std::setw(2) << std::setfill('0') << (int)(unsigned char)c;
        }
    }

    std::wstring path = L"/api-create.php?url=";
    std::string esc_str = escaped.str();
    int len = MultiByteToWideChar(CP_UTF8, 0, esc_str.c_str(), -1, nullptr, 0);
    if (len > 0) {
        std::wstring wesc(len - 1, 0);
        MultiByteToWideChar(CP_UTF8, 0, esc_str.c_str(), -1, &wesc[0], len);
        path += wesc;
    }

    HINTERNET hRequest = WinHttpOpenRequest(hConnect, L"GET", path.c_str(), NULL, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, WINHTTP_FLAG_SECURE);
    if (!hRequest) {
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);
        return long_url;
    }

    WinHttpSetTimeouts(hRequest, 3000, 3000, 4000, 4000);

    std::string response;
    if (WinHttpSendRequest(hRequest, WINHTTP_NO_ADDITIONAL_HEADERS, 0, WINHTTP_NO_REQUEST_DATA, 0, 0, 0) &&
        WinHttpReceiveResponse(hRequest, NULL)) {
        DWORD dwSize = 0;
        DWORD dwDownloaded = 0;
        do {
            dwSize = 0;
            if (WinHttpQueryDataAvailable(hRequest, &dwSize) && dwSize > 0) {
                std::vector<char> buffer(dwSize + 1, 0);
                if (WinHttpReadData(hRequest, buffer.data(), dwSize, &dwDownloaded)) {
                    response.append(buffer.data(), dwDownloaded);
                }
            }
        } while (dwSize > 0);
    }

    WinHttpCloseHandle(hRequest);
    WinHttpCloseHandle(hConnect);
    WinHttpCloseHandle(hSession);

    while (!response.empty() && (response.back() == '\r' || response.back() == '\n' || response.back() == ' ')) {
        response.pop_back();
    }

    if (response.rfind("http", 0) == 0) {
        return response;
    }
    return long_url;
}

static std::string ResolveRedirectUrl(const std::string& short_url) {
    HINTERNET hSession = WinHttpOpen(L"NoteLocal/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
    if (!hSession) return short_url;

    URL_COMPONENTSW urlCompW = {};
    urlCompW.dwStructSize = sizeof(urlCompW);
    wchar_t hostW[256] = {};
    wchar_t pathW[2048] = {};
    urlCompW.lpszHostName = hostW;
    urlCompW.dwHostNameLength = 256;
    urlCompW.lpszUrlPath = pathW;
    urlCompW.dwUrlPathLength = 2048;

    std::wstring wUrl(short_url.begin(), short_url.end());
    if (!WinHttpCrackUrl(wUrl.c_str(), 0, 0, &urlCompW)) {
        WinHttpCloseHandle(hSession);
        return short_url;
    }

    INTERNET_PORT port = (urlCompW.nScheme == INTERNET_SCHEME_HTTP) ? INTERNET_DEFAULT_HTTP_PORT : INTERNET_DEFAULT_HTTPS_PORT;
    DWORD flags = (urlCompW.nScheme == INTERNET_SCHEME_HTTPS) ? WINHTTP_FLAG_SECURE : 0;

    HINTERNET hConnect = WinHttpConnect(hSession, hostW, port, 0);
    if (!hConnect) {
        WinHttpCloseHandle(hSession);
        return short_url;
    }

    HINTERNET hRequest = WinHttpOpenRequest(hConnect, L"GET", pathW, NULL, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, flags);
    if (!hRequest) {
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);
        return short_url;
    }

    DWORD redirectPolicy = WINHTTP_OPTION_REDIRECT_POLICY_NEVER;
    WinHttpSetOption(hRequest, WINHTTP_OPTION_REDIRECT_POLICY, &redirectPolicy, sizeof(redirectPolicy));
    WinHttpSetTimeouts(hRequest, 3000, 3000, 3000, 3000);

    std::string finalUrl = short_url;
    if (WinHttpSendRequest(hRequest, WINHTTP_NO_ADDITIONAL_HEADERS, 0, WINHTTP_NO_REQUEST_DATA, 0, 0, 0) &&
        WinHttpReceiveResponse(hRequest, NULL)) {
        DWORD dwStatusCode = 0;
        DWORD dwSize = sizeof(dwStatusCode);
        WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_HEADER_NAME_BY_INDEX, &dwStatusCode, &dwSize, WINHTTP_NO_HEADER_INDEX);

        if (dwStatusCode == 301 || dwStatusCode == 302 || dwStatusCode == 307 || dwStatusCode == 308) {
            DWORD dwHeaderSize = 0;
            WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_LOCATION, WINHTTP_HEADER_NAME_BY_INDEX, NULL, &dwHeaderSize, WINHTTP_NO_HEADER_INDEX);
            if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && dwHeaderSize > 0) {
                std::vector<wchar_t> headerBuf(dwHeaderSize / sizeof(wchar_t) + 1, 0);
                if (WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_LOCATION, WINHTTP_HEADER_NAME_BY_INDEX, headerBuf.data(), &dwHeaderSize, WINHTTP_NO_HEADER_INDEX)) {
                    int len = WideCharToMultiByte(CP_UTF8, 0, headerBuf.data(), -1, nullptr, 0, nullptr, nullptr);
                    if (len > 0) {
                        std::string loc(len - 1, 0);
                        WideCharToMultiByte(CP_UTF8, 0, headerBuf.data(), -1, &loc[0], len, nullptr, nullptr);
                        finalUrl = loc;
                    }
                }
            }
        }
    }

    WinHttpCloseHandle(hRequest);
    WinHttpCloseHandle(hConnect);
    WinHttpCloseHandle(hSession);

    return finalUrl;
}

#define TIMER_REMINDER_ID 1001
#define WM_TRAY_NOTIFICATION (WM_APP + 101)
#define WM_POST_WEBVIEW_MESSAGE (WM_APP + 102)

static AppConfig g_config;
static WebViewHost g_webview;
static HWND g_hwnd = nullptr;
static std::string g_base_dir;

void PostWebMessageSafe(const std::string& serialized_msg) {
    if (!g_hwnd) return;
    std::string* pStr = new std::string(serialized_msg);
    if (!PostMessage(g_hwnd, WM_POST_WEBVIEW_MESSAGE, 0, (LPARAM)pStr)) {
        delete pStr;
    }
}

void SendInitState() {
    std::string md = StorageManager::LoadNoteMarkdown(g_base_dir + "/notes", g_config.active_tab_id);
    std::string html = MarkdownEngine::ParseToHtml(md);

    // Đồng bộ lại danh sách nhắc hẹn từ Markdown vào bộ nhớ
    ReminderManager::Instance().SyncNoteReminders(g_config.active_tab_id, md);

    nlohmann::json payload;
    nlohmann::json tabs_arr = nlohmann::json::array();
    for (const auto& tab : g_config.tabs) {
        tabs_arr.push_back({
            {"id", tab.first},
            {"title", tab.second}
        });
    }
    payload["tabs"] = tabs_arr;
    payload["active_tab_id"] = g_config.active_tab_id;
    payload["content_html"] = html;
    payload["always_on_top"] = g_config.always_on_top;

    std::string msg = IPCBridge::Serialize("init_state", payload);
    g_webview.PostWebMessage(msg);
}

void HandleWebMessage(const std::string& raw_json) {
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
        
        // Cập nhật lại reminder scheduler tức thì theo nội dung vừa lưu
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
    } else if (msg.action == "import_shared_note") {
        std::string mode = msg.payload.value("mode", "current");
        std::string md = msg.payload.value("markdown", "");
        std::string title = msg.payload.value("title", "Ghi chú chia sẻ");
        if (title.empty()) title = "Ghi chú chia sẻ";

        if (mode == "new_tab") {
            static uint32_t s_import_seq = 0;
            auto now_ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
            std::string new_id = "tab_" + std::to_string(now_ms) + "_" + std::to_string(++s_import_seq);
            g_config.tabs.push_back({new_id, title});
            g_config.active_tab_id = new_id;
            StorageManager::SaveNoteMarkdown(g_base_dir + "/notes", new_id, md);
            StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
            SendInitState();
        } else {
            StorageManager::SaveNoteMarkdown(g_base_dir + "/notes", g_config.active_tab_id, md);
            for (auto& tab : g_config.tabs) {
                if (tab.first == g_config.active_tab_id && (tab.second == "Ghi chú mới" || tab.second.empty())) {
                    tab.second = title;
                    StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
                    break;
                }
            }
            SendInitState();
        }
    } else if (msg.action == "shorten_url") {
        std::string long_url = msg.payload.value("url", "");
        std::thread([long_url]() {
            std::string short_url = ShortenUrlWithTinyUrl(long_url);
            nlohmann::json reply;
            reply["short_url"] = short_url;
            reply["long_url"] = long_url;
            PostWebMessageSafe(IPCBridge::Serialize("shorten_url_result", reply));
        }).detach();
    } else if (msg.action == "resolve_url") {
        std::string short_url = msg.payload.value("url", "");
        std::string req_id = msg.payload.value("req_id", "");
        std::thread([short_url, req_id]() {
            std::string resolved_url = ResolveRedirectUrl(short_url);
            nlohmann::json reply;
            reply["short_url"] = short_url;
            reply["resolved_url"] = resolved_url;
            reply["req_id"] = req_id;
            PostWebMessageSafe(IPCBridge::Serialize("resolve_url_result", reply));
        }).detach();
    } else if (msg.action == Actions::SAVE_IMAGE || msg.action == "save_image") {
        std::string b64 = msg.payload.value("data", "");
        std::string ext = msg.payload.value("ext", "png");
        std::string img_id = msg.payload.value("img_id", "");
        if (!b64.empty()) {
            auto bytes = IPCBridge::DecodeBase64(b64);
            std::string saved_path = StorageManager::SaveAssetImage(g_base_dir + "/assets", bytes, ext);
            
            fs::path rel = fs::relative(saved_path, g_base_dir);
            std::string rel_str = rel.generic_string();

            nlohmann::json reply;
            reply["path"] = rel_str;
            reply["img_id"] = img_id;
            g_webview.PostWebMessage(IPCBridge::Serialize("image_saved", reply));
        }
    } else if (msg.action == Actions::TOGGLE_PIN || msg.action == "toggle_pin") {
        bool pin = msg.payload.value("always_on_top", false);
        g_config.always_on_top = pin;
        WindowController::SetAlwaysOnTop(g_hwnd, pin);
        StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);

        nlohmann::json reply;
        reply["always_on_top"] = pin;
        g_webview.PostWebMessage(IPCBridge::Serialize("update_pin", reply));
    } else if (msg.action == Actions::COPY_TO_CLIPBOARD || msg.action == "copy_to_clipboard") {
        std::string text = msg.payload.value("text", "");
        if (!text.empty() && OpenClipboard(g_hwnd)) {
            EmptyClipboard();
            int len = MultiByteToWideChar(CP_UTF8, 0, text.c_str(), -1, nullptr, 0);
            HGLOBAL hMem = GlobalAlloc(GMEM_MOVEABLE, len * sizeof(wchar_t));
            if (hMem) {
                wchar_t* pMem = (wchar_t*)GlobalLock(hMem);
                if (pMem) {
                    MultiByteToWideChar(CP_UTF8, 0, text.c_str(), -1, pMem, len);
                    GlobalUnlock(hMem);
                    SetClipboardData(CF_UNICODETEXT, hMem);
                }
            }
            CloseClipboard();
        }
    } else if (msg.action == Actions::OPEN_URL || msg.action == "open_url") {
        std::string url = msg.payload.value("url", "");
        if (!url.empty()) {
            int len = MultiByteToWideChar(CP_UTF8, 0, url.c_str(), -1, nullptr, 0);
            std::wstring wurl(len - 1, 0);
            MultiByteToWideChar(CP_UTF8, 0, url.c_str(), -1, &wurl[0], len);
            ShellExecuteW(nullptr, L"open", wurl.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
        }
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
        
        // Tự động sao chép public URL vào clipboard
        if (res.success && !res.public_url.empty() && OpenClipboard(g_hwnd)) {
            EmptyClipboard();
            int len = MultiByteToWideChar(CP_UTF8, 0, res.public_url.c_str(), -1, nullptr, 0);
            HGLOBAL hMem = GlobalAlloc(GMEM_MOVEABLE, len * sizeof(wchar_t));
            if (hMem) {
                wchar_t* pMem = (wchar_t*)GlobalLock(hMem);
                if (pMem) {
                    MultiByteToWideChar(CP_UTF8, 0, res.public_url.c_str(), -1, pMem, len);
                    GlobalUnlock(hMem);
                    SetClipboardData(CF_UNICODETEXT, hMem);
                }
            }
            CloseClipboard();
        }

        nlohmann::json reply;
        reply["success"] = res.success;
        reply["share_id"] = res.share_id;
        reply["public_url"] = res.public_url;
        reply["error_message"] = res.error_message;
        g_webview.PostWebMessage(IPCBridge::Serialize(Actions::WEB_SHARE_COMPLETED, reply));
    }
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_POST_WEBVIEW_MESSAGE: {
            std::string* pStr = reinterpret_cast<std::string*>(lParam);
            if (pStr) {
                g_webview.PostWebMessage(*pStr);
                delete pStr;
            }
            return 0;
        }
        case WM_GETMINMAXINFO: {
            LPMINMAXINFO mmi = (LPMINMAXINFO)lParam;
            mmi->ptMinTrackSize.x = 280; // Giới hạn chiều rộng tối thiểu 280px
            mmi->ptMinTrackSize.y = 200; // Giới hạn chiều cao tối thiểu 200px
            return 0;
        }
        case WM_SIZE: {
            int w = LOWORD(lParam);
            int h = HIWORD(lParam);
            g_webview.Resize(w, h);
            return 0;
        }
        case WM_SETFOCUS: {
            g_webview.SetFocus();
            return 0;
        }
        case WM_TIMER: {
            if (wParam == TIMER_REMINDER_ID) {
                // Kiểm tra các nhắc hẹn đã đến hạn
                auto due = ReminderManager::Instance().CheckDueReminders();
                for (const auto& item : due) {
                    std::wstring wtitle = L"Nhắc việc Note Local";
                    int len = MultiByteToWideChar(CP_UTF8, 0, item.text.c_str(), -1, nullptr, 0);
                    std::wstring wmsg(len > 1 ? len - 1 : 0, 0);
                    if (len > 1) {
                        MultiByteToWideChar(CP_UTF8, 0, item.text.c_str(), -1, &wmsg[0], len);
                    }

                    // 1. Kích hoạt Windows Action Center Toast Notification
                    NotificationService::Instance().ShowNotification(wtitle, wmsg, item.note_id, item.item_id);

                    // 2. Phát âm thanh chuông báo Windows
                    MessageBeep(MB_ICONASTERISK);

                    // 3. Flash taskbar nếu cửa sổ đang ẩn hoặc unfocused
                    FLASHWINFO fi = { sizeof(FLASHWINFO), hwnd, FLASHW_ALL | FLASHW_TIMERNOFG, 4, 0 };
                    FlashWindowEx(&fi);

                    // 4. Bắn thông điệp sang WebView2 để cập nhật giao diện & hiện Toast
                    nlohmann::json reply;
                    reply["note_id"] = item.note_id;
                    reply["item_id"] = item.item_id;
                    reply["text"] = item.text;
                    reply["display_time"] = item.display_time;
                    g_webview.PostWebMessage(IPCBridge::Serialize(Actions::REMINDER_TRIGGERED, reply));
                }
            }
            return 0;
        }
        case WM_TRAY_NOTIFICATION: {
            if (lParam == NIN_BALLOONUSERCLICK || lParam == WM_LBUTTONUP) {
                // Người dùng nhấp vào thông báo hoặc icon khay hệ thống -> khôi phục cửa sổ
                ShowWindow(hwnd, SW_RESTORE);
                SetForegroundWindow(hwnd);

                if (lParam == NIN_BALLOONUSERCLICK) {
                    std::string target_note = NotificationService::Instance().GetLastNoteId();
                    std::string target_item = NotificationService::Instance().GetLastItemId();
                    if (!target_note.empty() && target_note != g_config.active_tab_id) {
                        g_config.active_tab_id = target_note;
                        StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
                        SendInitState();
                    }

                    nlohmann::json payload;
                    payload["note_id"] = target_note;
                    payload["item_id"] = target_item;
                    g_webview.PostWebMessage(IPCBridge::Serialize(Actions::NOTIFICATION_CLICKED, payload));
                    NotificationService::Instance().ClearLastItem();
                }
            }
            return 0;
        }
        case WM_CLOSE: {
            RECT r;
            if (GetWindowRect(hwnd, &r)) {
                g_config.window_x = r.left;
                g_config.window_y = r.top;
                g_config.window_w = r.right - r.left;
                g_config.window_h = r.bottom - r.top;
            }
            StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
            DestroyWindow(hwnd);
            return 0;
        }
        case WM_DESTROY: {
            KillTimer(hwnd, TIMER_REMINDER_ID);
            NotificationService::Instance().RemoveTrayIcon();
            PostQuitMessage(0);
            return 0;
        }
    }
    return DefWindowProcW(hwnd, msg, wParam, lParam);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

    // Đăng ký AppUserModelID để Windows 10/11 Action Center hỗ trợ Toast thông báo đầy đủ
    SetCurrentProcessExplicitAppUserModelID(L"MichaelTran.NoteLocal.App.1");

    wchar_t exe_path[MAX_PATH];
    GetModuleFileNameW(nullptr, exe_path, MAX_PATH);
    fs::path app_dir = fs::path(exe_path).parent_path();
    while (!fs::exists(app_dir / "src") && app_dir.has_parent_path() && app_dir != app_dir.parent_path()) {
        app_dir = app_dir.parent_path();
    }
    g_base_dir = app_dir.generic_string();

    StorageManager::LoadConfig(g_base_dir + "/config.json", g_config);

    const wchar_t CLASS_NAME[] = L"NoteLocalWindowClass";
    HICON hIcon = LoadIconW(hInstance, MAKEINTRESOURCEW(101));
    HICON hIconSm = (HICON)LoadImageW(hInstance, MAKEINTRESOURCEW(101), IMAGE_ICON, GetSystemMetrics(SM_CXSMICON), GetSystemMetrics(SM_CYSMICON), LR_DEFAULTCOLOR);

    WNDCLASSW wc = {};
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wc.hIcon = hIcon;
    RegisterClassW(&wc);

    g_hwnd = CreateWindowExW(
        0, CLASS_NAME, L"Note Local - Windows 11",
        WS_OVERLAPPEDWINDOW,
        g_config.window_x, g_config.window_y,
        g_config.window_w, g_config.window_h,
        nullptr, nullptr, hInstance, nullptr
    );

    if (!g_hwnd) return 1;

    if (hIcon) SendMessageW(g_hwnd, WM_SETICON, ICON_BIG, (LPARAM)hIcon);
    if (hIconSm) SendMessageW(g_hwnd, WM_SETICON, ICON_SMALL, (LPARAM)hIconSm);

    WindowController::ApplyWindows11Styling(g_hwnd);
    if (g_config.always_on_top) {
        WindowController::SetAlwaysOnTop(g_hwnd, true);
    }

    // Khởi tạo NotificationService và Timer định thời 3s (kiểm tra nhắc hẹn chính xác)
    NotificationService::Instance().Init(g_hwnd, WM_TRAY_NOTIFICATION, hIconSm);
    SetTimer(g_hwnd, TIMER_REMINDER_ID, 3000, nullptr);

    ShowWindow(g_hwnd, nCmdShow);
    UpdateWindow(g_hwnd);

    fs::path base_path = fs::absolute(app_dir);
    std::wstring base_dir_w = base_path.wstring();
    std::wstring initial_url = L"https://notelocal.app/src/ui/assets/index.html";

    if (!g_webview.Initialize(g_hwnd, base_dir_w, initial_url, HandleWebMessage)) {
        MessageBoxW(g_hwnd, L"Không thể khởi tạo WebView2 Runtime!", L"Lỗi", MB_OK | MB_ICONERROR);
        return 1;
    }

    MSG msg = {};
    while (GetMessageW(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    CoUninitialize();
    return 0;
}
