#import "webview_host_mac.h"
#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface ScriptHandlerMac : NSObject <WKScriptMessageHandler, WKNavigationDelegate>
@property (nonatomic, assign) std::function<void(const std::string&)>* onMessage;
@end

@implementation ScriptHandlerMac
- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message {
    if ([message.name isEqualToString:@"noteLocal"] && self.onMessage && *self.onMessage) {
        NSString* body = nil;
        if ([message.body isKindOfClass:[NSString class]]) {
            body = message.body;
        } else if ([NSJSONSerialization isValidJSONObject:message.body]) {
            NSData* jsonData = [NSJSONSerialization dataWithJSONObject:message.body options:0 error:nil];
            if (jsonData) {
                body = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
            }
        }
        if (body) {
            std::string cStr = [body UTF8String];
            (*self.onMessage)(cStr);
        }
    }
}
@end

struct WebViewHostMacImpl {
    WKWebView* webView{nil};
    ScriptHandlerMac* scriptHandler{nil};
    std::function<void(const std::string&)> onMessageCallback;
};

WebViewHostMac::WebViewHostMac() {
    m_impl = new WebViewHostMacImpl();
}

WebViewHostMac::~WebViewHostMac() {
    if (m_impl) {
        auto* impl = static_cast<WebViewHostMacImpl*>(m_impl);
        if (impl->webView) {
            [impl->webView removeFromSuperview];
            impl->webView = nil;
        }
        impl->scriptHandler = nil;
        delete impl;
        m_impl = nullptr;
    }
}

bool WebViewHostMac::Initialize(NSWindow* window,
                                const std::string& asset_dir,
                                const std::string& initial_url,
                                std::function<void(const std::string&)> on_message) {
    if (!window || !m_impl) return false;
    auto* impl = static_cast<WebViewHostMacImpl*>(m_impl);
    impl->onMessageCallback = on_message;

    WKWebViewConfiguration* config = [[WKWebViewConfiguration alloc] init];
    WKUserContentController* ucc = [[WKUserContentController alloc] init];

    impl->scriptHandler = [[ScriptHandlerMac alloc] init];
    impl->scriptHandler.onMessage = &impl->onMessageCallback;
    [ucc addScriptMessageHandler:impl->scriptHandler name:@"noteLocal"];
    config.userContentController = ucc;

    // Cho phép inspect element trên macOS Safari Developer Tools
    [config.preferences setValue:@YES forKey:@"developerExtrasEnabled"];

    NSRect frame = window.contentView.bounds;
    impl->webView = [[WKWebView alloc] initWithFrame:frame configuration:config];
    impl->webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    impl->webView.navigationDelegate = impl->scriptHandler;
    
    // Nền trong suốt để hòa hợp với Vibrancy của macOS
    [impl->webView setValue:@NO forKey:@"drawsBackground"];

    [window.contentView addSubview:impl->webView];

    // Load file HTML giao diện
    NSString* pathStr = [NSString stringWithUTF8String:initial_url.c_str()];
    NSURL* fileURL = [NSURL fileURLWithPath:pathStr];
    
    NSString* accessStr = [NSString stringWithUTF8String:asset_dir.c_str()];
    NSURL* accessURL = [NSURL fileURLWithPath:accessStr];

    [impl->webView loadFileURL:fileURL allowingReadAccessToURL:accessURL];
    return true;
}

void WebViewHostMac::PostWebMessage(const std::string& json_message) {
    if (!m_impl) return;
    auto* impl = static_cast<WebViewHostMacImpl*>(m_impl);
    if (!impl->webView) return;

    NSString* rawJson = [NSString stringWithUTF8String:json_message.c_str()];
    if (!rawJson) return;

    // Encode an toàn sang JSON string argument để truyền vào JavaScript
    NSData* strData = [NSJSONSerialization dataWithJSONObject:@[rawJson] options:0 error:nil];
    if (!strData) return;
    NSString* jsonArrayStr = [[NSString alloc] initWithData:strData encoding:NSUTF8StringEncoding];
    // jsonArrayStr có dạng ["{\"action\":\"...\"}"] -> lấy phần tử đầu tiên
    NSString* jsCode = [NSString stringWithFormat:@"window.__onMacIPCMessage(%@[0]);", jsonArrayStr];

    dispatch_async(dispatch_get_main_queue(), ^{
        [impl->webView evaluateJavaScript:jsCode completionHandler:nil];
    });
}

void WebViewHostMac::Resize(int width, int height) {
    if (!m_impl) return;
    auto* impl = static_cast<WebViewHostMacImpl*>(m_impl);
    if (!impl->webView) return;

    dispatch_async(dispatch_get_main_queue(), ^{
        NSRect frame = impl->webView.frame;
        frame.size.width = width;
        frame.size.height = height;
        impl->webView.frame = frame;
    });
}

void WebViewHostMac::SetFocus() {
    if (!m_impl) return;
    auto* impl = static_cast<WebViewHostMacImpl*>(m_impl);
    if (!impl->webView) return;

    dispatch_async(dispatch_get_main_queue(), ^{
        [impl->webView.window makeFirstResponder:impl->webView];
    });
}
