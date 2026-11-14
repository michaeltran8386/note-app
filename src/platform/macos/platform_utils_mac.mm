#import "platform_utils_mac.h"
#import <Cocoa/Cocoa.h>

namespace PlatformUtilsMac {

std::string GetApplicationSupportPath() {
    @autoreleasepool {
        NSArray* paths = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES);
        NSString* appSupport = [paths firstObject];
        NSString* noteLocalPath = [appSupport stringByAppendingPathComponent:@"NoteLocal"];
        [[NSFileManager defaultManager] createDirectoryAtPath:noteLocalPath withIntermediateDirectories:YES attributes:nil error:nil];
        return [noteLocalPath UTF8String];
    }
}

std::string GetBundleResourcePath() {
    @autoreleasepool {
        NSString* resPath = [[NSBundle mainBundle] resourcePath];
        if (!resPath) return "";
        return [resPath UTF8String];
    }
}

void CopyToClipboard(const std::string& text) {
    @autoreleasepool {
        NSPasteboard* pb = [NSPasteboard generalPasteboard];
        [pb clearContents];
        NSString* nsText = [NSString stringWithUTF8String:text.c_str()];
        if (nsText) {
            [pb setString:nsText forType:NSPasteboardTypeString];
        }
    }
}

void OpenURLInBrowser(const std::string& url) {
    @autoreleasepool {
        NSString* nsUrl = [NSString stringWithUTF8String:url.c_str()];
        if (nsUrl) {
            NSURL* target = [NSURL URLWithString:nsUrl];
            if (target) {
                [[NSWorkspace sharedWorkspace] openURL:target];
            }
        }
    }
}

void ShowNotification(const std::string& title, const std::string& message) {
    @autoreleasepool {
        NSUserNotification* notif = [[NSUserNotification alloc] init];
        notif.title = [NSString stringWithUTF8String:title.c_str()];
        notif.informativeText = [NSString stringWithUTF8String:message.c_str()];
        notif.soundName = NSUserNotificationDefaultSoundName;
        [[NSUserNotificationCenter defaultUserNotificationCenter] deliverNotification:notif];
    }
}

std::string ShortenUrlWithTinyUrl(const std::string& long_url) {
    @autoreleasepool {
        if (long_url.length() > 2000) return long_url;

        NSString* rawUrl = [NSString stringWithUTF8String:long_url.c_str()];
        NSString* escaped = [rawUrl stringByAddingPercentEncodingWithAllowedCharacters:[NSCharacterSet URLQueryAllowedCharacterSet]];
        NSString* apiStr = [NSString stringWithFormat:@"https://tinyurl.com/api-create.php?url=%@", escaped];
        
        NSURL* targetUrl = [NSURL URLWithString:apiStr];
        if (!targetUrl) return long_url;

        NSMutableURLRequest* request = [NSMutableURLRequest requestWithURL:targetUrl];
        request.timeoutInterval = 4.0;
        
        dispatch_semaphore_t sem = dispatch_semaphore_create(0);
        __block NSString* resultStr = nil;

        NSURLSessionDataTask* task = [[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            if (!error && data) {
                resultStr = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
            }
            dispatch_semaphore_signal(sem);
        }];
        [task resume];

        dispatch_semaphore_wait(sem, dispatch_time(DISPATCH_TIME_NOW, 4 * NSEC_PER_SEC));
        if (resultStr && resultStr.length > 0) {
            return [resultStr UTF8String];
        }
        return long_url;
    }
}

} // namespace PlatformUtilsMac
