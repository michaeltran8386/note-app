#pragma once
#include <string>
#include <vector>

namespace PlatformUtilsMac {
    std::string GetApplicationSupportPath();
    std::string GetBundleResourcePath();
    void CopyToClipboard(const std::string& text);
    void OpenURLInBrowser(const std::string& url);
    void ShowNotification(const std::string& title, const std::string& message);
    std::string ShortenUrlWithTinyUrl(const std::string& long_url);
}
