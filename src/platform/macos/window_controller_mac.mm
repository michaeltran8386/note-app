#import "window_controller_mac.h"
#import <Cocoa/Cocoa.h>

void WindowControllerMac::SetAlwaysOnTop(NSWindow* window, bool enable) {
    if (!window) return;
    dispatch_async(dispatch_get_main_queue(), ^{
        [window setLevel:(enable ? NSFloatingWindowLevel : NSNormalWindowLevel)];
    });
}

bool WindowControllerMac::IsAlwaysOnTop(NSWindow* window) {
    if (!window) return false;
    return [window level] == NSFloatingWindowLevel;
}

void WindowControllerMac::ApplyMacOSStyling(NSWindow* window) {
    if (!window) return;

    window.styleMask |= NSWindowStyleMaskTitled |
                        NSWindowStyleMaskClosable |
                        NSWindowStyleMaskMiniaturizable |
                        NSWindowStyleMaskResizable |
                        NSWindowStyleMaskFullSizeContentView;

    window.titleVisibility = NSWindowTitleHidden;
    window.titlebarAppearsTransparent = YES;
    window.movableByWindowBackground = YES;
    window.backgroundColor = [NSColor colorWithRed:0.09 green:0.09 blue:0.11 alpha:1.0]; // #18181b dark theme
    window.hasShadow = YES;

    // Hiệu ứng kính mờ Vibrancy chuẩn macOS
    NSVisualEffectView* visualEffect = [[NSVisualEffectView alloc] initWithFrame:window.contentView.bounds];
    visualEffect.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    visualEffect.blendingMode = NSVisualEffectBlendingModeBehindWindow;
    visualEffect.state = NSVisualEffectStateActive;
    if (@available(macOS 10.14, *)) {
        visualEffect.material = NSVisualEffectMaterialUnderWindowBackground;
        visualEffect.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
    }
    
    [window.contentView addSubview:visualEffect positioned:NSWindowBelow relativeTo:nil];
}
