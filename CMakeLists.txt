cmake_minimum_required(VERSION 3.20)

# Statically link C/C++ runtime library (/MT for Release, /MTd for Debug)
# Ensures NoteLocal.exe is completely self-contained with no dependency on VCRUNTIME140_1.dll / MSVCP140.dll
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

project(NoteLocal CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(APPLE)
    enable_language(OBJCXX)
    set(CMAKE_OBJCXX_STANDARD 17)
    set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "Build architectures for macOS")
elseif(MSVC)
    add_compile_options(/utf-8)
    add_compile_options($<$<CONFIG:Release>:/MT>)
    add_compile_options($<$<CONFIG:Debug>:/MTd>)
else()
    set(CMAKE_EXE_LINKER_FLAGS "-static -Wl,--strip-all")
endif()
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
include(CTest)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/tests
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party
)
if(NOT APPLE)
    include_directories(
        ${CMAKE_CURRENT_SOURCE_DIR}/third_party/webview2/build/native/include
    )
endif()

# Common Core Sources
set(CORE_SOURCES
    src/core/markdown_engine.cpp
    src/core/storage_manager.cpp
    src/core/reminder_manager.cpp
    src/core/share_service.cpp
    src/platform/ipc_message.cpp
)

# Test Runners
add_executable(test_markdown_engine tests/test_markdown_engine.cpp src/core/markdown_engine.cpp)
add_executable(test_storage_manager tests/test_storage_manager.cpp src/core/storage_manager.cpp)
add_executable(test_ipc_message tests/test_ipc_message.cpp src/platform/ipc_message.cpp)
add_executable(test_reminder_parser tests/unit/test_reminder_parser.cpp src/core/markdown_engine.cpp)
add_executable(test_reminder_manager tests/unit/test_reminder_manager.cpp src/core/reminder_manager.cpp src/core/markdown_engine.cpp)
add_executable(test_share_contract tests/unit/test_share_contract.cpp src/core/share_service.cpp src/platform/ipc_message.cpp)

if(WIN32)
    add_executable(test_window_controller tests/test_window_controller.cpp src/platform/window_controller.cpp)
    target_link_libraries(test_window_controller PRIVATE user32 dwmapi)
endif()

if(BUILD_TESTING)
    set(TEST_TARGETS markdown_engine storage_manager ipc_message reminder_parser reminder_manager share_contract)
    if(WIN32)
        list(APPEND TEST_TARGETS window_controller)
    endif()
    foreach(test_name ${TEST_TARGETS})
        add_test(NAME ${test_name} COMMAND test_${test_name})
    endforeach()
endif()

# Main Executable: NoteLocal
if(APPLE)
    add_executable(NoteLocal MACOSX_BUNDLE
        src/main_mac.mm
        src/platform/macos/window_controller_mac.mm
        src/platform/macos/webview_host_mac.mm
        src/platform/macos/platform_utils_mac.mm
        ${CORE_SOURCES}
    )

    target_link_libraries(NoteLocal PRIVATE
        "-framework Cocoa"
        "-framework WebKit"
        "-framework UserNotifications"
    )

    set_target_properties(NoteLocal PROPERTIES
        MACOSX_BUNDLE_BUNDLE_NAME "NoteLocal"
        MACOSX_BUNDLE_BUNDLE_VERSION "3.0.0"
        MACOSX_BUNDLE_SHORT_VERSION_STRING "3.0.0"
        MACOSX_BUNDLE_GUI_IDENTIFIER "com.michaelt.notelocal"
    )

    # Copy frontend assets directly into NoteLocal.app/Contents/Resources/assets
    add_custom_command(TARGET NoteLocal POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E make_directory "$<TARGET_BUNDLE_CONTENT_DIR:NoteLocal>/Resources/assets"
        COMMAND ${CMAKE_COMMAND} -E copy_directory "${CMAKE_CURRENT_SOURCE_DIR}/src/ui/assets" "$<TARGET_BUNDLE_CONTENT_DIR:NoteLocal>/Resources/assets"
    )
else()
    add_executable(NoteLocal WIN32
        src/main.cpp
        src/platform/window_controller.cpp
        src/platform/webview_host.cpp
        src/platform/notification_service.cpp
        resources/app.rc
        ${CORE_SOURCES}
    )

    set_source_files_properties(resources/app.rc PROPERTIES
        COMPILE_FLAGS "-I${CMAKE_CURRENT_SOURCE_DIR}/resources"
    )

    if(MSVC)
        target_link_libraries(NoteLocal PRIVATE
            user32
            dwmapi
            ole32
            shell32
            winhttp
            ${CMAKE_CURRENT_SOURCE_DIR}/third_party/webview2/build/native/x64/WebView2LoaderStatic.lib
        )
    else()
        target_link_libraries(NoteLocal PRIVATE
            user32
            dwmapi
            ole32
            shell32
            winhttp
            ${CMAKE_CURRENT_SOURCE_DIR}/third_party/webview2/build/native/x64/WebView2Loader.dll.lib
        )
    endif()

    # Copy WebView2Loader.dll next to NoteLocal.exe
    add_custom_command(TARGET NoteLocal POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${CMAKE_CURRENT_SOURCE_DIR}/third_party/webview2/build/native/x64/WebView2Loader.dll"
        "$<TARGET_FILE_DIR:NoteLocal>/WebView2Loader.dll"
    )
endif()
