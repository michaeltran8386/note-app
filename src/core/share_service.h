#pragma once
#include <string>
#include <vector>
#include "json/json.hpp"

struct ShareImageAttachment {
    std::string local_path;
    std::string width;
    std::string mime_type{"image/png"};
};

struct ShareResult {
    bool success{false};
    std::string share_id;
    std::string public_url;
    std::string error_message;
};

class ShareService {
public:
    static ShareService& Instance();

    // Chuẩn bị payload snapshot JSON với đầy đủ text và ảnh
    nlohmann::json BuildSharePayload(const std::string& note_id,
                                     const std::string& title,
                                     const std::string& markdown,
                                     const std::vector<std::string>& image_rel_paths,
                                     const std::string& base_dir);

    // Xuất bản gói chia sẻ và sinh đường dẫn xem trực tiếp
    ShareResult PublishNote(const std::string& note_id,
                            const std::string& title,
                            const std::string& markdown,
                            const std::vector<std::string>& image_rel_paths,
                            const std::string& base_dir);

private:
    ShareService() = default;
};

