#include "webview_host.h"
#include <iostream>

class EnvironmentCompletedHandler : public ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler {
public:
    using CallbackType = std::function<HRESULT(HRESULT, ICoreWebView2Environment*)>;
    EnvironmentCompletedHandler(CallbackType cb) : m_cb(cb), m_ref(1) {}

    HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override {
        if (!ppv) return E_POINTER;
        if (riid == IID_IUnknown || riid == IID_ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler) {
            *ppv = static_cast<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler*>(this);
            AddRef();
            return S_OK;
        }
        *ppv = nullptr;
        return E_NOINTERFACE;
    }

    ULONG STDMETHODCALLTYPE AddRef() override { return InterlockedIncrement(&m_ref); }
    ULONG STDMETHODCALLTYPE Release() override {
        ULONG count = InterlockedDecrement(&m_ref);
        if (count == 0) delete this;
        return count;
    }

    HRESULT STDMETHODCALLTYPE Invoke(HRESULT errorCode, ICoreWebView2Environment* createdEnvironment) override {
        return m_cb(errorCode, createdEnvironment);
    }

private:
    CallbackType m_cb;
    LONG m_ref;
};

class ControllerCompletedHandler : public ICoreWebView2CreateCoreWebView2ControllerCompletedHandler {
public:
    using CallbackType = std::function<HRESULT(HRESULT, ICoreWebView2Controller*)>;
    ControllerCompletedHandler(CallbackType cb) : m_cb(cb), m_ref(1) {}

    HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override {
        if (!ppv) return E_POINTER;
        if (riid == IID_IUnknown || riid == IID_ICoreWebView2CreateCoreWebView2ControllerCompletedHandler) {
            *ppv = static_cast<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler*>(this);
            AddRef();
            return S_OK;
        }
        *ppv = nullptr;
        return E_NOINTERFACE;
    }

    ULONG STDMETHODCALLTYPE AddRef() override { return InterlockedIncrement(&m_ref); }
    ULONG STDMETHODCALLTYPE Release() override {
        ULONG count = InterlockedDecrement(&m_ref);
        if (count == 0) delete this;
        return count;
    }

    HRESULT STDMETHODCALLTYPE Invoke(HRESULT errorCode, ICoreWebView2Controller* createdController) override {
        return m_cb(errorCode, createdController);
    }

private:
    CallbackType m_cb;
    LONG m_ref;
};

class WebMessageReceivedHandler : public ICoreWebView2WebMessageReceivedEventHandler {
public:
    using CallbackType = std::function<HRESULT(ICoreWebView2*, ICoreWebView2WebMessageReceivedEventArgs*)>;
    WebMessageReceivedHandler(CallbackType cb) : m_cb(cb), m_ref(1) {}

    HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override {
        if (!ppv) return E_POINTER;
        if (riid == IID_IUnknown || riid == IID_ICoreWebView2WebMessageReceivedEventHandler) {
            *ppv = static_cast<ICoreWebView2WebMessageReceivedEventHandler*>(this);
            AddRef();
            return S_OK;
        }
        *ppv = nullptr;
        return E_NOINTERFACE;
    }

    ULONG STDMETHODCALLTYPE AddRef() override { return InterlockedIncrement(&m_ref); }
    ULONG STDMETHODCALLTYPE Release() override {
        ULONG count = InterlockedDecrement(&m_ref);
        if (count == 0) delete this;
        return count;
    }

    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) override {
        return m_cb(sender, args);
    }

private:
    CallbackType m_cb;
    LONG m_ref;
};

WebViewHost::WebViewHost() {}

WebViewHost::~WebViewHost() {
    if (m_controller) {
        m_controller->Close();
        m_controller->Release();
        m_controller = nullptr;
    }
    if (m_webview) {
        m_webview->Release();
        m_webview = nullptr;
    }
}

bool WebViewHost::Initialize(HWND hwnd, const std::wstring& initial_url, std::function<void(const std::string&)> on_message) {
    m_hwnd = hwnd;
    m_on_message = on_message;

    auto envHandler = new EnvironmentCompletedHandler(
        [this, initial_url](HRESULT result, ICoreWebView2Environment* env) -> HRESULT {
            if (FAILED(result) || !env) {
                std::cerr << "Failed to create CoreWebView2Environment: " << result << std::endl;
                return result;
            }

            auto ctrlHandler = new ControllerCompletedHandler(
                [this, initial_url](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
                    if (FAILED(result) || !controller) {
                        std::cerr << "Failed to create CoreWebView2Controller: " << result << std::endl;
                        return result;
                    }

                    m_controller = controller;
                    m_controller->AddRef();
                    m_controller->get_CoreWebView2(&m_webview);

                    if (m_webview) {
                        EventRegistrationToken token;
                        auto msgHandler = new WebMessageReceivedHandler(
                            [this](ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT {
                                LPWSTR messageRaw = nullptr;
                                args->TryGetWebMessageAsString(&messageRaw);
                                if (messageRaw) {
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
                        );

                        m_webview->add_WebMessageReceived(msgHandler, &token);
                        msgHandler->Release();

                        RECT bounds;
                        GetClientRect(m_hwnd, &bounds);
                        m_controller->put_Bounds(bounds);

                        ICoreWebView2Settings* settings = nullptr;
                        m_webview->get_Settings(&settings);
                        if (settings) {
                            settings->put_IsScriptEnabled(TRUE);
                            settings->put_AreDefaultContextMenusEnabled(TRUE);
                            settings->put_IsStatusBarEnabled(FALSE);
                            settings->Release();
                        }

                        m_webview->Navigate(initial_url.c_str());
                    }

                    return S_OK;
                }
            );

            env->CreateCoreWebView2Controller(m_hwnd, ctrlHandler);
            ctrlHandler->Release();

            return S_OK;
        }
    );

    HRESULT hr = CreateCoreWebView2EnvironmentWithOptions(nullptr, nullptr, nullptr, envHandler);
    envHandler->Release();

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
