cmake_minimum_required(VERSION 3.20)
project(NoteLocal CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_EXE_LINKER_FLAGS "-static")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/tests
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party/webview2/build/native/include
)

# Test Runner: Markdown Engine
add_executable(test_markdown_engine
    tests/test_markdown_engine.cpp
    src/core/markdown_engine.cpp
)

# Test Runner: Storage Manager
add_executable(test_storage_manager
    tests/test_storage_manager.cpp
    src/core/storage_manager.cpp
)

# Test Runner: Window Controller
add_executable(test_window_controller
    tests/test_window_controller.cpp
    src/platform/window_controller.cpp
)
target_link_libraries(test_window_controller PRIVATE user32 dwmapi)

# Test Runner: IPC Message
add_executable(test_ipc_message
    tests/test_ipc_message.cpp
    src/platform/ipc_message.cpp
)

# Test Runner: Reminder Parser Unit Test
add_executable(test_reminder_parser
    tests/unit/test_reminder_parser.cpp
    src/core/markdown_engine.cpp
)

# Test Runner: Reminder Manager Unit Test
add_executable(test_reminder_manager
    tests/unit/test_reminder_manager.cpp
    src/core/reminder_manager.cpp
    src/core/markdown_engine.cpp
)

# Test Runner: Share Contract Unit Test
add_executable(test_share_contract
    tests/unit/test_share_contract.cpp
    src/core/share_service.cpp
    src/platform/ipc_message.cpp
)

# Main Executable: NoteLocal
add_executable(NoteLocal WIN32
    src/main.cpp
    src/core/markdown_engine.cpp
    src/core/storage_manager.cpp
    src/core/reminder_manager.cpp
    src/core/share_service.cpp
    src/platform/window_controller.cpp
    src/platform/webview_host.cpp
    src/platform/ipc_message.cpp
    src/platform/notification_service.cpp
    resources/app.rc
)

set_source_files_properties(resources/app.rc PROPERTIES
    COMPILE_FLAGS "-I${CMAKE_CURRENT_SOURCE_DIR}/resources"
)

target_link_libraries(NoteLocal PRIVATE
    user32
    dwmapi
    ole32
    shell32
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party/webview2/build/native/x64/WebView2Loader.dll.lib
)

# Copy WebView2Loader.dll next to NoteLocal.exe
add_custom_command(TARGET NoteLocal POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "${CMAKE_CURRENT_SOURCE_DIR}/third_party/webview2/build/native/x64/WebView2Loader.dll"
    "${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/WebView2Loader.dll"
)
