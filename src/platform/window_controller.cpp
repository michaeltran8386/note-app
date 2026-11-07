#include "window_controller.h"
#include <dwmapi.h>

#ifndef DWMWA_WINDOW_CORNER_PREFERENCE
#define DWMWA_WINDOW_CORNER_PREFERENCE 33
#endif

#ifndef DWMWCP_ROUND
#define DWMWCP_ROUND 2
#endif

bool WindowController::SetAlwaysOnTop(HWND hwnd, bool enable) {
    if (!hwnd || !IsWindow(hwnd)) return false;
    
    HWND insert_after = enable ? HWND_TOPMOST : HWND_NOTOPMOST;
    return SetWindowPos(hwnd, insert_after, 0, 0, 0, 0, 
                        SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE) != 0;
}

bool WindowController::IsAlwaysOnTop(HWND hwnd) {
    if (!hwnd || !IsWindow(hwnd)) return false;

    LONG_PTR ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    return (ex_style & WS_EX_TOPMOST) != 0;
}

void WindowController::ApplyWindows11Styling(HWND hwnd) {
    if (!hwnd || !IsWindow(hwnd)) return;

    // Kích hoạt bo góc Windows 11
    DWORD preference = DWMWCP_ROUND;
    DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, &preference, sizeof(preference));
}

