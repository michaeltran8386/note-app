#pragma once
#include <string>
#include <functional>

#ifdef __OBJC__
@class NSWindow;
@class WKWebView;
#else
class NSWindow;
class WKWebView;
#endif

class WebViewHostMac {
public:
    WebViewHostMac();
    ~WebViewHostMac();

    bool Initialize(NSWindow* window, 
                    const std::string& asset_dir, 
                    const std::string& initial_url, 
                    std::function<void(const std::string&)> on_message);

    void PostWebMessage(const std::string& json_message);
    void Resize(int width, int height);
    void SetFocus();

private:
    void* m_impl{nullptr};
};
