#include "test_framework.h"
#include "core/storage_manager.h"
#include <filesystem>
#include <iostream>

void test_storage_config_and_utf8() {
    std::string cfg_path = "test_config.json";
    AppConfig cfg;
    cfg.always_on_top = true;
    cfg.window_w = 520;
    cfg.window_h = 700;
    cfg.active_tab_id = "tab_work";
    cfg.tabs.push_back({"tab_work", "Công việc hôm nay 📌"});
    cfg.tabs.push_back({"tab_todo", "Việc cần làm"});

    ASSERT_TRUE(StorageManager::SaveConfig(cfg_path, cfg));

    AppConfig loaded;
    ASSERT_TRUE(StorageManager::LoadConfig(cfg_path, loaded));
    ASSERT_TRUE(loaded.always_on_top);
    ASSERT_EQ(loaded.window_w, 520);
    ASSERT_EQ(loaded.window_h, 700);
    ASSERT_EQ(loaded.tabs.size(), 2);
    ASSERT_STR_EQ(loaded.tabs[0].second.c_str(), "Công việc hôm nay 📌");
    ASSERT_STR_EQ(loaded.tabs[1].second.c_str(), "Việc cần làm");

    std::filesystem::remove(cfg_path);
}

void test_storage_fallback_on_empty_tabs() {
    AppConfig empty_cfg;
    StorageManager::EnsureValidTabs(empty_cfg);
    ASSERT_EQ(empty_cfg.tabs.size(), 1);
    ASSERT_STR_EQ(empty_cfg.tabs[0].second.c_str(), "Ghi chú mới");
    ASSERT_STR_EQ(empty_cfg.active_tab_id.c_str(), "tab_default");
}

void test_save_and_load_markdown() {
    std::string notes_dir = "test_notes";
    std::string tab_id = "tab_test_01";
    std::string content = "# Ghi chú thử nghiệm\n- [ ] Task 1\n- [x] Task 2\nTiếng Việt có dấu.";

    ASSERT_TRUE(StorageManager::SaveNoteMarkdown(notes_dir, tab_id, content));

    std::string read_back = StorageManager::LoadNoteMarkdown(notes_dir, tab_id);
    ASSERT_STR_EQ(read_back.c_str(), content.c_str());

    ASSERT_TRUE(StorageManager::DeleteNote(notes_dir, tab_id));
    ASSERT_STR_EQ(StorageManager::LoadNoteMarkdown(notes_dir, tab_id).c_str(), "");

    std::filesystem::remove_all(notes_dir);
}

void test_save_asset_image() {
    std::string assets_dir = "test_assets";
    std::vector<uint8_t> dummy_png = {0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4};

    std::string saved_path = StorageManager::SaveAssetImage(assets_dir, dummy_png, "png");
    ASSERT_FALSE(saved_path.empty());
    ASSERT_TRUE(std::filesystem::exists(saved_path));

    std::filesystem::remove_all(assets_dir);
}

int main() {
    std::cout << "Running Storage Manager Tests..." << std::endl;
    test_storage_config_and_utf8();
    test_storage_fallback_on_empty_tabs();
    test_save_and_load_markdown();
    test_save_asset_image();
    return test_framework_report();
}

