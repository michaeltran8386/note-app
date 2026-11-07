#pragma once
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <string>
#include <functional>
#include "WebView2.h"

class WebViewHost {
public:
    WebViewHost();
    ~WebViewHost();

    bool Initialize(HWND hwnd, const std::wstring& initial_url, std::function<void(const std::string&)> on_message);
    void PostWebMessage(const std::string& json_message);
    void Resize(int width, int height);
    void SetFocus();

private:
    HWND m_hwnd{nullptr};
    ICoreWebView2Controller* m_controller{nullptr};
    ICoreWebView2* m_webview{nullptr};
    std::function<void(const std::string&)> m_on_message;
};
