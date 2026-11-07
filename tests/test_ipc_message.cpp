#include "test_framework.h"
#include "platform/ipc_message.h"
#include <iostream>

void test_ipc_serialize_parse() {
    nlohmann::json payload;
    payload["always_on_top"] = true;
    std::string json_str = IPCBridge::Serialize("toggle_pin", payload);

    IPCMessage msg;
    ASSERT_TRUE(IPCBridge::Parse(json_str, msg));
    ASSERT_STR_EQ(msg.action.c_str(), "toggle_pin");
    ASSERT_TRUE(msg.payload["always_on_top"].get<bool>());
}

void test_ipc_base64_roundtrip() {
    std::vector<uint8_t> data = {0x89, 'P', 'N', 'G', 1, 2, 3, 4, 5, 255};
    std::string b64 = IPCBridge::EncodeBase64(data);
    ASSERT_FALSE(b64.empty());

    auto decoded = IPCBridge::DecodeBase64(b64);
    ASSERT_EQ(decoded.size(), data.size());
    for (size_t i = 0; i < data.size(); ++i) {
        ASSERT_EQ(decoded[i], data[i]);
    }

    // Test with Data URL prefix
    std::string data_url = "data:image/png;base64," + b64;
    auto decoded_from_url = IPCBridge::DecodeBase64(data_url);
    ASSERT_EQ(decoded_from_url.size(), data.size());
}

void test_ipc_malformed_json() {
    IPCMessage msg;
    ASSERT_FALSE(IPCBridge::Parse("{ malformed json ", msg));
    ASSERT_FALSE(IPCBridge::Parse("{\"no_action\": 123}", msg));
}

int main() {
    std::cout << "Running IPC Message Tests..." << std::endl;
    test_ipc_serialize_parse();
    test_ipc_base64_roundtrip();
    test_ipc_malformed_json();
    return test_framework_report();
}
