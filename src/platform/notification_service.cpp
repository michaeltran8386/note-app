#include "notification_service.h"
#include <iostream>

#define TRAY_ICON_UID 1001

NotificationService& NotificationService::Instance() {
    static NotificationService instance;
    return instance;
}

NotificationService::NotificationService() {}

NotificationService::~NotificationService() {
    RemoveTrayIcon();
}

bool NotificationService::Init(HWND hwnd, UINT callback_msg, HICON hIcon) {
    m_hwnd = hwnd;
    m_callback_msg = callback_msg;
    m_icon = hIcon ? hIcon : LoadIcon(nullptr, IDI_APPLICATION);

    NOTIFYICONDATAW nid = { sizeof(NOTIFYICONDATAW) };
    nid.hWnd = m_hwnd;
    nid.uID = TRAY_ICON_UID;
    nid.uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP;
    nid.uCallbackMessage = m_callback_msg;
    nid.hIcon = m_icon;
    wcscpy_s(nid.szTip, L"Note Local");

    m_icon_added = Shell_NotifyIconW(NIM_ADD, &nid);
    if (m_icon_added) {
        nid.uVersion = NOTIFYICON_VERSION_4;
        Shell_NotifyIconW(NIM_SETVERSION, &nid);
    }
    return m_icon_added;
}

bool NotificationService::ShowNotification(const std::wstring& title, 
                                          const std::wstring& message,
                                          const std::string& note_id,
                                          const std::string& item_id) {
    if (!m_hwnd) return false;

    m_last_note_id = note_id;
    m_last_item_id = item_id;

    NOTIFYICONDATAW nid = { sizeof(NOTIFYICONDATAW) };
    nid.hWnd = m_hwnd;
    nid.uID = TRAY_ICON_UID;
    nid.uFlags = NIF_INFO | NIF_MESSAGE | NIF_ICON | NIF_TIP;
    nid.uCallbackMessage = m_callback_msg;
    nid.hIcon = m_icon ? m_icon : LoadIcon(nullptr, IDI_APPLICATION);
    wcscpy_s(nid.szTip, L"Note Local");
    
    // NIIF_INFO triggers modern Windows Action Center toast
    nid.dwInfoFlags = NIIF_INFO | NIIF_LARGE_ICON;
    nid.uTimeout = 5000;
    
    wcsncpy_s(nid.szInfoTitle, title.c_str(), _TRUNCATE);
    wcsncpy_s(nid.szInfo, message.c_str(), _TRUNCATE);

    if (!m_icon_added) {
        m_icon_added = Shell_NotifyIconW(NIM_ADD, &nid);
        if (m_icon_added) {
            nid.uVersion = NOTIFYICON_VERSION_4;
            Shell_NotifyIconW(NIM_SETVERSION, &nid);
        }
        return m_icon_added;
    }

    return Shell_NotifyIconW(NIM_MODIFY, &nid);
}

void NotificationService::RemoveTrayIcon() {
    if (m_icon_added && m_hwnd) {
        NOTIFYICONDATAW nid = { sizeof(NOTIFYICONDATAW) };
        nid.hWnd = m_hwnd;
        nid.uID = TRAY_ICON_UID;
        Shell_NotifyIconW(NIM_DELETE, &nid);
        m_icon_added = false;
    }
}
