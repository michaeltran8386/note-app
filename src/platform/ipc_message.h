#pragma once
#include <string>
#include "json/json.hpp"

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

