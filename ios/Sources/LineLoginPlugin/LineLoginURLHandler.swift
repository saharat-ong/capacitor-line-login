import Foundation
import UIKit
import LineSDK

/// App-side helpers for URL / universal-link forwarding.
/// Call these from your `AppDelegate` / `SceneDelegate` so LINE Login can complete.
///
/// Marked `@MainActor` because LINE SDK's `LoginManager.application(_:open:)` is
/// main-actor-isolated, and UIKit URL / scene callbacks already run on the main actor.
@MainActor
@objc public final class LineLoginURLHandler: NSObject {
    /// Forward an open-URL callback to the LINE SDK.
    /// - Returns: `true` if the LINE SDK handled the URL.
    @objc public static func handleOpen(_ app: UIApplication, url: URL?) -> Bool {
        guard let url else { return false }
        guard LoginManager.shared.isSetupFinished else { return false }
        return LoginManager.shared.application(app, open: url)
    }

    /// Forward a universal-link / browsing-web user activity to the LINE SDK.
    /// - Returns: `true` if the LINE SDK handled the URL.
    @objc public static func handleContinue(_ userActivity: NSUserActivity) -> Bool {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let url = userActivity.webpageURL else {
            return false
        }
        guard LoginManager.shared.isSetupFinished else { return false }
        return LoginManager.shared.application(.shared, open: url)
    }

    /// Optional: set up LoginManager with a universal link URL from native code
    /// (e.g. before the JS bridge calls `setup`). Prefer JS `setup({ channelId })`
    /// when the channel ID comes from your backend at runtime.
    @objc public static func setup(channelId: String, universalLinkURL: URL?) {
        guard !LoginManager.shared.isSetupFinished else { return }
        LoginManager.shared.setup(channelID: channelId, universalLinkURL: universalLinkURL)
    }
}
