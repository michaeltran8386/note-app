#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shellapi.h>
#include <filesystem>
#include <iostream>
#include "core/storage_manager.h"
#include "core/markdown_engine.h"
#include "platform/window_controller.h"
#include "platform/webview_host.h"
#include "platform/ipc_message.h"

namespace fs = std::filesystem;

static AppConfig g_config;
static WebViewHost g_webview;
static HWND g_hwnd = nullptr;
static std::string g_base_dir;

void SendInitState() {
    std::string md = StorageManager::LoadNoteMarkdown(g_base_dir + "/notes", g_config.active_tab_id);
    std::string html = MarkdownEngine::ParseToHtml(md);

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
    } else if (msg.action == "save_note") {
        std::string tab_id = msg.payload.value("tab_id", g_config.active_tab_id);
        std::string html = msg.payload.value("html", "");
        
        std::string md = MarkdownEngine::SerializeToMarkdown("", html);
        StorageManager::SaveNoteMarkdown(g_base_dir + "/notes", tab_id, md);
    } else if (msg.action == "switch_tab") {
        std::string new_tab_id = msg.payload.value("tab_id", "");
        if (!new_tab_id.empty()) {
            g_config.active_tab_id = new_tab_id;
            StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
            SendInitState();
        }
    } else if (msg.action == "create_tab") {
        std::string id = msg.payload.value("id", "");
        std::string title = msg.payload.value("title", "Ghi chú mới");
        if (!id.empty()) {
            g_config.tabs.push_back({id, title});
            g_config.active_tab_id = id;
            StorageManager::SaveNoteMarkdown(g_base_dir + "/notes", id, "");
            StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
        }
    } else if (msg.action == "rename_tab") {
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
    } else if (msg.action == "delete_tab") {
        std::string id = msg.payload.value("tab_id", "");
        if (!id.empty()) {
            StorageManager::DeleteNote(g_base_dir + "/notes", id);
            auto it = std::remove_if(g_config.tabs.begin(), g_config.tabs.end(),
                                     [&](const std::pair<std::string, std::string>& t) { return t.first == id; });
            g_config.tabs.erase(it, g_config.tabs.end());
            StorageManager::EnsureValidTabs(g_config);
            StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);
        }
    } else if (msg.action == "save_image") {
        std::string b64 = msg.payload.value("data", "");
        std::string ext = msg.payload.value("ext", "png");
        if (!b64.empty()) {
            auto bytes = IPCBridge::DecodeBase64(b64);
            std::string saved_path = StorageManager::SaveAssetImage(g_base_dir + "/assets", bytes, ext);
            
            // Đường dẫn tương đối dạng assets/img_xxx.png
            fs::path rel = fs::relative(saved_path, g_base_dir);
            std::string rel_str = rel.generic_string();

            nlohmann::json reply;
            reply["path"] = rel_str;
            g_webview.PostWebMessage(IPCBridge::Serialize("image_saved", reply));
        }
    } else if (msg.action == "toggle_pin") {
        bool pin = msg.payload.value("always_on_top", false);
        g_config.always_on_top = pin;
        WindowController::SetAlwaysOnTop(g_hwnd, pin);
        StorageManager::SaveConfig(g_base_dir + "/config.json", g_config);

        nlohmann::json reply;
        reply["always_on_top"] = pin;
        g_webview.PostWebMessage(IPCBridge::Serialize("update_pin", reply));
    } else if (msg.action == "copy_to_clipboard") {
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
    } else if (msg.action == "open_url") {
        std::string url = msg.payload.value("url", "");
        if (!url.empty()) {
            int len = MultiByteToWideChar(CP_UTF8, 0, url.c_str(), -1, nullptr, 0);
            std::wstring wurl(len - 1, 0);
            MultiByteToWideChar(CP_UTF8, 0, url.c_str(), -1, &wurl[0], len);
            ShellExecuteW(nullptr, L"open", wurl.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
        }
    }
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
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
            PostQuitMessage(0);
            return 0;
        }
    }
    return DefWindowProcW(hwnd, msg, wParam, lParam);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

    // Xác định thư mục ứng dụng
    wchar_t exe_path[MAX_PATH];
    GetModuleFileNameW(nullptr, exe_path, MAX_PATH);
    fs::path app_dir = fs::path(exe_path).parent_path();
    if (app_dir.filename() == "bin") {
        app_dir = app_dir.parent_path().parent_path();
    }
    g_base_dir = app_dir.generic_string();

    // Nạp cấu hình
    StorageManager::LoadConfig(g_base_dir + "/config.json", g_config);

    // Đăng ký Window Class
    const wchar_t CLASS_NAME[] = L"NoteLocalWindowClass";
    WNDCLASSW wc = {};
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    RegisterClassW(&wc);

    // Tạo cửa sổ chính
    g_hwnd = CreateWindowExW(
        0, CLASS_NAME, L"Note Local - Windows 11",
        WS_OVERLAPPEDWINDOW,
        g_config.window_x, g_config.window_y,
        g_config.window_w, g_config.window_h,
        nullptr, nullptr, hInstance, nullptr
    );

    if (!g_hwnd) return 1;

    // Áp dụng bo góc Windows 11 và chế độ Always on Top nếu đã lưu
    WindowController::ApplyWindows11Styling(g_hwnd);
    if (g_config.always_on_top) {
        WindowController::SetAlwaysOnTop(g_hwnd, true);
    }

    ShowWindow(g_hwnd, nCmdShow);
    UpdateWindow(g_hwnd);

    // Sử dụng virtual host https://notelocal.app/
    fs::path base_path = fs::absolute(app_dir);
    std::wstring base_dir_w = base_path.wstring();
    std::wstring initial_url = L"https://notelocal.app/src/ui/assets/index.html";

    // Khởi tạo WebView2
    if (!g_webview.Initialize(g_hwnd, base_dir_w, initial_url, HandleWebMessage)) {
        MessageBoxW(g_hwnd, L"Không thể khởi tạo WebView2 Runtime!", L"Lỗi", MB_OK | MB_ICONERROR);
        return 1;
    }

    // Message Loop
    MSG msg = {};
    while (GetMessageW(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    CoUninitialize();
    return 0;
}
