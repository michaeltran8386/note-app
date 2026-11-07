#include <iostream>
#include <cassert>
#include "core/share_service.h"

int main() {
    std::cout << "[TEST] Running Share Contract Unit Tests..." << std::endl;

    auto& share = ShareService::Instance();
    std::vector<std::string> images; // Empty image list for schema verification
    auto payload = share.BuildSharePayload("note_test", "Kế hoạch quý 4", "# Kế hoạch\n- [ ] Task 1", images, ".");

    assert(payload.contains("shareId"));
    assert(payload.contains("title"));
    assert(payload.contains("markdown"));
    assert(payload.contains("images"));
    assert(payload["title"] == "Kế hoạch quý 4");
    assert(payload["images"].is_array());

    std::cout << "  ✓ Test 1: Share payload contains all required fields: " 
              << payload["shareId"].get<std::string>() << std::endl;

    std::cout << "[SUCCESS] Share contract tests passed!\n";
    return 0;
}

