#include "webview_host.h"
#include <wrl/event.h>
#include <iostream>

using namespace Microsoft::WRL;

WebViewHost::WebViewHost() {}

WebViewHost::~WebViewHost() {
    if (m_controller) {
        m_controller->Close();
        m_controller = nullptr;
    }
    m_webview = nullptr;
}

bool WebViewHost::Initialize(HWND hwnd, const std::wstring& initial_url, std::function<void(const std::string&)> on_message) {
    m_hwnd = hwnd;
    m_on_message = on_message;

    HRESULT hr = CreateCoreWebView2EnvironmentWithOptions(
        nullptr, nullptr, nullptr,
        Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
            [this, initial_url](HRESULT result, ICoreWebView2Environment* env) -> HRESULT {
                if (FAILED(result) || !env) {
                    std::cerr << "Failed to create CoreWebView2Environment: " << result << std::endl;
                    return result;
                }

                env->CreateCoreWebView2Controller(
                    m_hwnd,
                    Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                        [this, initial_url](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
                            if (FAILED(result) || !controller) {
                                std::cerr << "Failed to create CoreWebView2Controller: " << result << std::endl;
                                return result;
                            }

                            m_controller = controller;
                            m_controller->get_CoreWebView2(&m_webview);

                            if (m_webview) {
                                // Lắng nghe thông điệp từ JavaScript
                                EventRegistrationToken token;
                                m_webview->add_WebMessageReceived(
                                    Callback<ICoreWebView2WebMessageReceivedEventHandler>(
                                        [this](ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT {
                                            LPWSTR messageRaw = nullptr;
                                            args->TryGetWebMessageAsString(&messageRaw);
                                            if (messageRaw) {
                                                // Convert WCHAR* to UTF-8 std::string
                                                int len = WideCharToMultiByte(CP_UTF8, 0, messageRaw, -1, nullptr, 0, nullptr, nullptr);
                                                std::string msg(len - 1, 0);
                                                WideCharToMultiByte(CP_UTF8, 0, messageRaw, -1, &msg[0], len, nullptr, nullptr);
                                                CoTaskMemFree(messageRaw);

                                                if (m_on_message) {
                                                    m_on_message(msg);
                                                }
                                            }
                                            return S_OK;
                                        }
                                    ).Get(), &token
                                );

                                // Thiết lập kích thước
                                RECT bounds;
                                GetClientRect(m_hwnd, &bounds);
                                m_controller->put_Bounds(bounds);

                                // Cấu hình Settings: bật script, tắt status bar
                                ICoreWebView2Settings* settings = nullptr;
                                m_webview->get_Settings(&settings);
                                if (settings) {
                                    settings->put_IsScriptEnabled(TRUE);
                                    settings->put_AreDefaultContextMenusEnabled(TRUE);
                                    settings->put_IsStatusBarEnabled(FALSE);
                                    settings->Release();
                                }

                                // Điều hướng tới giao diện editor
                                m_webview->Navigate(initial_url.c_str());
                            }

                            return S_OK;
                        }
                    ).Get()
                );

                return S_OK;
            }
        ).Get()
    );

    return SUCCEEDED(hr);
}

void WebViewHost::PostWebMessage(const std::string& json_message) {
    if (!m_webview) return;
    int len = MultiByteToWideChar(CP_UTF8, 0, json_message.c_str(), -1, nullptr, 0);
    std::wstring wmsg(len - 1, 0);
    MultiByteToWideChar(CP_UTF8, 0, json_message.c_str(), -1, &wmsg[0], len);
    m_webview->PostWebMessageAsJson(wmsg.c_str());
}

void WebViewHost::Resize(int width, int height) {
    if (m_controller) {
        RECT bounds = {0, 0, width, height};
        m_controller->put_Bounds(bounds);
    }
}

void WebViewHost::SetFocus() {
    if (m_controller) {
        m_controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);
    }
}
