#include "share_service.h"
#include "platform/ipc_message.h"
#include <fstream>
#include <sstream>
#include <filesystem>
#include <ctime>
#include <iomanip>
#include <iostream>

namespace fs = std::filesystem;

ShareService& ShareService::Instance() {
    static ShareService instance;
    return instance;
}

static std::string GenerateShareId() {
    auto now = std::time(nullptr);
    std::ostringstream ss;
    ss << "nl_" << std::hex << now << "_" << (rand() % 0xFFFF);
    return ss.str();
}

static std::vector<uint8_t> ReadBinaryFile(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file) return {};
    return std::vector<uint8_t>((std::istreambuf_iterator<char>(file)),
                                std::istreambuf_iterator<char>());
}

nlohmann::json ShareService::BuildSharePayload(const std::string& note_id,
                                             const std::string& title,
                                             const std::string& markdown,
                                             const std::vector<std::string>& image_rel_paths,
                                             const std::string& base_dir) {
    nlohmann::json payload;
    std::string share_id = GenerateShareId();

    payload["version"] = "1.0";
    payload["shareId"] = share_id;
    payload["title"] = title.empty() ? "Ghi chú chia sẻ" : title;
    payload["markdown"] = markdown;
    payload["publishedAt"] = static_cast<int64_t>(std::time(nullptr));

    nlohmann::json images_json = nlohmann::json::array();
    for (const auto& rel_path : image_rel_paths) {
        fs::path full_path = fs::path(base_dir) / rel_path;
        if (fs::exists(full_path)) {
            auto bytes = ReadBinaryFile(full_path.string());
            if (!bytes.empty()) {
                std::string b64 = IPCBridge::EncodeBase64(bytes);
                nlohmann::json img_obj;
                img_obj["path"] = rel_path;
                img_obj["dataUrl"] = "data:image/png;base64," + b64;
                images_json.push_back(img_obj);
            }
        }
    }
    payload["images"] = images_json;

    return payload;
}

ShareResult ShareService::PublishNote(const std::string& note_id,
                                    const std::string& title,
                                    const std::string& markdown,
                                    const std::vector<std::string>& image_rel_paths,
                                    const std::string& base_dir) {
    ShareResult result;
    try {
        auto payload = BuildSharePayload(note_id, title, markdown, image_rel_paths, base_dir);
        std::string share_id = payload["shareId"].get<std::string>();

        // Lưu bản snapshot vào docs/viewer/shares/<share_id>.json (nếu có thể ghi)
        try {
            fs::path shares_dir = fs::path(base_dir) / "docs" / "viewer" / "shares";
            fs::create_directories(shares_dir);
            fs::path share_file = shares_dir / (share_id + ".json");
            std::ofstream out(share_file);
            if (out) {
                out << payload.dump(2);
                out.close();
            }
        } catch (...) {
            // Không làm gián đoạn chia sẻ nếu không ghi được snapshot đĩa local
        }

        result.success = true;
        result.share_id = share_id;
        
        // Link web công khai: GitHub Pages hoặc web viewer
        std::string service_url = "https://michaeltran8386.github.io/note-app/";
        result.public_url = service_url + "?share=" + share_id;

        return result;
    } catch (const std::exception& e) {
        result.success = false;
        result.error_message = e.what();
        return result;
    }
}

