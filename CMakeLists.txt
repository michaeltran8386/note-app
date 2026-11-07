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
