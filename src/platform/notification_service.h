#pragma once
#include <windows.h>
#include <shellapi.h>
#include <string>

#ifndef NIN_BALLOONUSERCLICK
#define NIN_BALLOONUSERCLICK (WM_USER + 5)
#endif

class NotificationService {
public:
    static NotificationService& Instance();

    bool Init(HWND hwnd, UINT callback_msg, HICON hIcon = nullptr);
    bool ShowNotification(const std::wstring& title, 
                          const std::wstring& message, 
                          const std::string& note_id = "", 
                          const std::string& item_id = "");
    void RemoveTrayIcon();

    // Callback event tracking
    std::string GetLastNoteId() const { return m_last_note_id; }
    std::string GetLastItemId() const { return m_last_item_id; }
    void ClearLastItem() { m_last_note_id.clear(); m_last_item_id.clear(); }

private:
    NotificationService();
    ~NotificationService();

    HWND m_hwnd{nullptr};
    UINT m_callback_msg{0};
    HICON m_icon{nullptr};
    bool m_icon_added{false};
    std::string m_last_note_id;
    std::string m_last_item_id;
};

