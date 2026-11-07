#include "ipc_message.h"

static const std::string BASE64_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789+/";

std::string IPCBridge::Serialize(const std::string& action, const nlohmann::json& payload) {
    nlohmann::json j;
    j["action"] = action;
    j["payload"] = payload;
    return j.dump();
}

bool IPCBridge::Parse(const std::string& json_str, IPCMessage& out_msg) {
    try {
        auto j = nlohmann::json::parse(json_str);
        if (!j.contains("action") || !j["action"].is_string()) {
            return false;
        }
        out_msg.action = j["action"].get<std::string>();
        out_msg.payload = j.value("payload", nlohmann::json::object());
        return true;
    } catch (...) {
        return false;
    }
}

std::vector<uint8_t> IPCBridge::DecodeBase64(const std::string& input) {
    std::vector<uint8_t> out;
    std::vector<int> T(256, -1);
    for (int i = 0; i < 64; i++) T[BASE64_CHARS[i]] = i;

    // Bỏ tiền tố Data URL nếu có (ví dụ "data:image/png;base64,")
    std::string s = input;
    size_t comma = s.find(',');
    if (comma != std::string::npos) {
        s = s.substr(comma + 1);
    }

    int val = 0, valb = -8;
    for (unsigned char c : s) {
        if (T[c] == -1) continue; // Bỏ qua ký tự không hợp lệ hoặc khoảng trắng
        val = (val << 6) + T[c];
        valb += 6;
        if (valb >= 0) {
            out.push_back(uint8_t((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    return out;
}

std::string IPCBridge::EncodeBase64(const std::vector<uint8_t>& bytes) {
    std::string out;
    int val = 0, valb = -6;
    for (uint8_t c : bytes) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            out.push_back(BASE64_CHARS[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6) out.push_back(BASE64_CHARS[((val << 8) >> (valb + 8)) & 0x3F]);
    while (out.size() % 4) out.push_back('=');
    return out;
}

