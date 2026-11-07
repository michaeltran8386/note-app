#include "storage_manager.h"
#include "json/json.hpp"
#include <fstream>
#include <filesystem>
#include <chrono>
#include <random>

namespace fs = std::filesystem;
using json = nlohmann::json;

void StorageManager::EnsureValidTabs(AppConfig& config) {
    if (config.tabs.empty()) {
        config.tabs.push_back({"tab_default", "Ghi chú mới"});
        config.active_tab_id = "tab_default";
    }
    if (config.active_tab_id.empty() && !config.tabs.empty()) {
        config.active_tab_id = config.tabs[0].first;
    }
}

bool StorageManager::SaveConfig(const std::string& path, const AppConfig& config) {
    try {
        json j;
        j["always_on_top"] = config.always_on_top;
        j["window_x"] = config.window_x;
        j["window_y"] = config.window_y;
        j["window_w"] = config.window_w;
        j["window_h"] = config.window_h;
        j["active_tab_id"] = config.active_tab_id;

        json tabs_arr = json::array();
        for (const auto& tab : config.tabs) {
            tabs_arr.push_back({
                {"id", tab.first},
                {"title", tab.second}
            });
        }
        j["tabs"] = tabs_arr;

        std::ofstream file(path, std::ios::binary);
        if (!file.is_open()) return false;
        file << j.dump(2);
        return true;
    } catch (...) {
        return false;
    }
}

bool StorageManager::LoadConfig(const std::string& path, AppConfig& out_config) {
    try {
        if (!fs::exists(path)) {
            EnsureValidTabs(out_config);
            return false;
        }

        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) return false;
        
        json j;
        file >> j;

        out_config.always_on_top = j.value("always_on_top", false);
        out_config.window_x = j.value("window_x", 100);
        out_config.window_y = j.value("window_y", 100);
        out_config.window_w = j.value("window_w", 480);
        out_config.window_h = j.value("window_h", 650);
        out_config.active_tab_id = j.value("active_tab_id", "");

        out_config.tabs.clear();
        if (j.contains("tabs") && j["tabs"].is_array()) {
            for (const auto& item : j["tabs"]) {
                std::string id = item.value("id", "");
                std::string title = item.value("title", "Ghi chú");
                if (!id.empty()) {
                    out_config.tabs.push_back({id, title});
                }
            }
        }

        EnsureValidTabs(out_config);
        return true;
    } catch (...) {
        EnsureValidTabs(out_config);
        return false;
    }
}

bool StorageManager::SaveNoteMarkdown(const std::string& notes_dir, const std::string& tab_id, const std::string& markdown_content) {
    try {
        if (!fs::exists(notes_dir)) {
            fs::create_directories(notes_dir);
        }
        std::string file_path = notes_dir + "/" + tab_id + ".md";
        std::ofstream file(file_path, std::ios::binary);
        if (!file.is_open()) return false;
        file.write(markdown_content.data(), markdown_content.size());
        return true;
    } catch (...) {
        return false;
    }
}

std::string StorageManager::LoadNoteMarkdown(const std::string& notes_dir, const std::string& tab_id) {
    try {
        std::string file_path = notes_dir + "/" + tab_id + ".md";
        if (!fs::exists(file_path)) return "";
        std::ifstream file(file_path, std::ios::binary);
        if (!file.is_open()) return "";
        return std::string((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    } catch (...) {
        return "";
    }
}

std::string StorageManager::SaveAssetImage(const std::string& assets_dir, const std::vector<uint8_t>& image_bytes, const std::string& ext) {
    try {
        if (!fs::exists(assets_dir)) {
            fs::create_directories(assets_dir);
        }
        auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        
        static std::mt19937 rng(std::random_device{}());
        std::uniform_int_distribution<int> dist(1000, 9999);
        std::string filename = "img_" + std::to_string(now) + "_" + std::to_string(dist(rng)) + "." + ext;
        std::string full_path = assets_dir + "/" + filename;

        std::ofstream file(full_path, std::ios::binary);
        if (!file.is_open()) return "";
        file.write(reinterpret_cast<const char*>(image_bytes.data()), image_bytes.size());
        
        return full_path;
    } catch (...) {
        return "";
    }
}

bool StorageManager::DeleteNote(const std::string& notes_dir, const std::string& tab_id) {
    try {
        std::string file_path = notes_dir + "/" + tab_id + ".md";
        if (fs::exists(file_path)) {
            return fs::remove(file_path);
        }
        return true;
    } catch (...) {
        return false;
    }
}
