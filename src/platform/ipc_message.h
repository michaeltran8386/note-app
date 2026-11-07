#pragma once
#include <string>
#include <vector>
#include "json/json.hpp"

namespace Actions {
    inline const std::string LOAD_NOTE = "load_note";
    inline const std::string SAVE_NOTE = "save_note";
    inline const std::string CREATE_TAB = "create_tab";
    inline const std::string SWITCH_TAB = "switch_tab";
    inline const std::string RENAME_TAB = "rename_tab";
    inline const std::string DELETE_TAB = "delete_tab";
    inline const std::string SAVE_IMAGE = "save_image";
    inline const std::string TOGGLE_PIN = "toggle_pin";
    inline const std::string COPY_TO_CLIPBOARD = "copy_to_clipboard";
    inline const std::string OPEN_URL = "open_url";
    
    // New Feature Actions
    inline const std::string SCHEDULE_REMINDER = "schedule_reminder";
    inline const std::string CANCEL_REMINDER = "cancel_reminder";
    inline const std::string REMINDER_TRIGGERED = "reminder_triggered";
    inline const std::string NOTIFICATION_CLICKED = "notification_clicked";
    inline const std::string PUBLISH_WEB_SHARE = "publish_web_share";
    inline const std::string WEB_SHARE_COMPLETED = "web_share_completed";
}

struct IPCMessage {
    std::string action;
    nlohmann::json payload;
};

class IPCBridge {
public:
    static std::string Serialize(const std::string& action, const nlohmann::json& payload);
    static bool Parse(const std::string& json_str, IPCMessage& out_msg);
    static std::vector<uint8_t> DecodeBase64(const std::string& base64_str);
    static std::string EncodeBase64(const std::vector<uint8_t>& bytes);
};
