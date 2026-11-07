#pragma once
#define WIN32_LEAN_AND_MEAN
#include <windows.h>

class WindowController {
public:
    static bool SetAlwaysOnTop(HWND hwnd, bool enable);
    static bool IsAlwaysOnTop(HWND hwnd);
    static void ApplyWindows11Styling(HWND hwnd);
};

