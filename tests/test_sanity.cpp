#include "test_framework.h"

int main() {
    std::cout << "Running Sanity Test..." << std::endl;
    int win_ver = 11;
    ASSERT_EQ(win_ver, 11);
    ASSERT_TRUE(win_ver > 10);
    return test_framework_report();
}

