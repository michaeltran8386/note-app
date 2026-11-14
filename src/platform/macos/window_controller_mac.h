#pragma once
#include <string>

#ifdef __OBJC__
@class NSWindow;
#else
class NSWindow;
#endif

class WindowControllerMac {
public:
    static void SetAlwaysOnTop(NSWindow* window, bool enable);
    static bool IsAlwaysOnTop(NSWindow* window);
    static void ApplyMacOSStyling(NSWindow* window);
};
