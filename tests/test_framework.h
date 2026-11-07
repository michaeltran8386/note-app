#pragma once
#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>

inline int g_test_failures = 0;
inline int g_test_passes = 0;

#define ASSERT_TRUE(expr) \
    do { \
        if (!(expr)) { \
            std::cerr << "Assertion failed: " #expr " at " << __FILE__ << ":" << __LINE__ << std::endl; \
            g_test_failures++; \
        } else { \
            g_test_passes++; \
        } \
    } while (0)

#define ASSERT_FALSE(expr) ASSERT_TRUE(!(expr))

#define ASSERT_EQ(a, b) \
    do { \
        if ((a) != (b)) { \
            std::cerr << "Assertion failed: " #a " == " #b " (" << (a) << " != " << (b) << ") at " << __FILE__ << ":" << __LINE__ << std::endl; \
            g_test_failures++; \
        } else { \
            g_test_passes++; \
        } \
    } while (0)

#define ASSERT_STR_EQ(a, b) \
    do { \
        std::string _sa = (a ? a : ""); \
        std::string _sb = (b ? b : ""); \
        if (_sa != _sb) { \
            std::cerr << "Assertion failed: " #a " == " #b " (\"" << _sa << "\" != \"" << _sb << "\") at " << __FILE__ << ":" << __LINE__ << std::endl; \
            g_test_failures++; \
        } else { \
            g_test_passes++; \
        } \
    } while (0)

inline int test_framework_report() {
    std::cout << "\n================ Test Summary ================" << std::endl;
    std::cout << "Passed: " << g_test_passes << ", Failed: " << g_test_failures << std::endl;
    if (g_test_failures == 0) {
        std::cout << "ALL TESTS PASSED!\n" << std::endl;
        return 0;
    } else {
        std::cout << "SOME TESTS FAILED!\n" << std::endl;
        return 1;
    }
}
