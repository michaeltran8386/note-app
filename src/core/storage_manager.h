#pragma once
#include <string>
#include <vector>
#include <utility>
#include <cstdint>

struct AppConfig {
    bool always_on_top{false};
    int window_x{100};
    int window_y{100};
    int window_w{480};
    int window_h{650};
    std::string active_tab_id;
    std::vector<std::pair<std::string, std::string>> tabs; // <id, title>
};

class StorageManager {
public:
    static bool SaveConfig(const std::string& path, const AppConfig& config);
    static bool LoadConfig(const std::string& path, AppConfig& out_config);

    static bool SaveNoteMarkdown(const std::string& notes_dir, const std::string& tab_id, const std::string& markdown_content);
    static std::string LoadNoteMarkdown(const std::string& notes_dir, const std::string& tab_id);

    static std::string SaveAssetImage(const std::string& assets_dir, const std::vector<uint8_t>& image_bytes, const std::string& ext = "png");
    static bool DeleteNote(const std::string& notes_dir, const std::string& tab_id);

    // Đảm bảo cấu hình luôn có ít nhất 1 tab hợp lệ
    static void EnsureValidTabs(AppConfig& config);
};
