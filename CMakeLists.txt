cmake_minimum_required(VERSION 3.20)
project(NoteLocal CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/tests
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party
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
