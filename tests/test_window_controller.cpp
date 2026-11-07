#include "test_framework.h"
#include "platform/window_controller.h"
#include <iostream>

void test_window_null_safety() {
    ASSERT_FALSE(WindowController::SetAlwaysOnTop(nullptr, true));
    ASSERT_FALSE(WindowController::IsAlwaysOnTop(nullptr));
}

void test_window_topmost_toggle() {
    // Đăng ký và tạo cửa sổ Win32 ẩn để test
    const wchar_t CLASS_NAME[] = L"TestWindowClass";
    WNDCLASSW wc = {};
    wc.lpfnWndProc = DefWindowProcW;
    wc.hInstance = GetModuleHandle(nullptr);
    wc.lpszClassName = CLASS_NAME;
    RegisterClassW(&wc);

    HWND hwnd = CreateWindowExW(
        0, CLASS_NAME, L"Test Window", WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT, 300, 300,
        nullptr, nullptr, GetModuleHandle(nullptr), nullptr
    );

    ASSERT_TRUE(hwnd != nullptr);
    ASSERT_FALSE(WindowController::IsAlwaysOnTop(hwnd));

    // Bật AlwaysOnTop
    ASSERT_TRUE(WindowController::SetAlwaysOnTop(hwnd, true));
    ASSERT_TRUE(WindowController::IsAlwaysOnTop(hwnd));

    // Tắt AlwaysOnTop
    ASSERT_TRUE(WindowController::SetAlwaysOnTop(hwnd, false));
    ASSERT_FALSE(WindowController::IsAlwaysOnTop(hwnd));

    WindowController::ApplyWindows11Styling(hwnd);

    DestroyWindow(hwnd);
    UnregisterClassW(CLASS_NAME, GetModuleHandle(nullptr));
}

int main() {
    std::cout << "Running Window Controller Tests..." << std::endl;
    test_window_null_safety();
    test_window_topmost_toggle();
    return test_framework_report();
}

