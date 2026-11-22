import Foundation
// Capacitor types (CAPPlugin / CAPPluginCall) are not Sendable yet; preconcurrency
// keeps Swift 6 from erroring on necessary Capacitor API use across hops.
@preconcurrency import Capacitor
import LineSDK
import UIKit

/// Capacitor bridge for LINE Login. Channel ID is supplied at runtime via `setup`.
///
/// Capacitor 8 invokes plugin methods on its background bridge queue (no per-plugin
/// `methodQueue` override exists — see `CapacitorBridge.dispatchQueue`). LINE SDK /
/// UIKit need the main actor, so we hop with `Task { @MainActor in … }` and pass
/// `nonisolated(unsafe)` references for non-Sendable `self` / `CAPPluginCall`
/// (same escape hatch Capacitor’s own types force under Swift 6).
@objc(LineLoginPlugin)
public class LineLoginPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LineLoginPlugin"
    public let jsName = "LineLogin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "login", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
    ]

    private static let defaultScopes = ["profile", "openid", "email"]
    /// Touched only from MainActor tasks below (via `nonisolated(unsafe)` plugin ref).
    private var setupCompleted = false

    public override func load() {
        // Intentionally quiet — avoid noisy logs in host apps.
    }

    @objc func setup(_ call: CAPPluginCall) {
        guard let channelId = call.getString("channelId")?.trimmingCharacters(in: .whitespacesAndNewlines),
              !channelId.isEmpty else {
            call.reject("Missing channelId", "LOGIN_FAILED")
            return
        }

        // Universal link URL is optional. Host apps that configure Associated Domains
        // and a LINE Developers Console universal link can call
        // `LineLoginURLHandler.setup(channelId:universalLinkURL:)` before or instead
        // of this method — or pass nil (default) for URL-scheme-only callbacks.
        let universalLinkURL: URL? = nil

        // CAPPlugin / CAPPluginCall are not Sendable. Capacitor owns this call for the
        // current invocation; we only touch plugin state / resolve on the main actor.
        nonisolated(unsafe) let plugin = self
        nonisolated(unsafe) let call = call

        Task { @MainActor in
            if LoginManager.shared.isSetupFinished {
                plugin.setupCompleted = true
                call.resolve()
                return
            }
            LoginManager.shared.setup(channelID: channelId, universalLinkURL: universalLinkURL)
            plugin.setupCompleted = true
            call.resolve()
        }
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        nonisolated(unsafe) let plugin = self
        nonisolated(unsafe) let call = call
        Task { @MainActor in
            let available = plugin.setupCompleted || LoginManager.shared.isSetupFinished
            call.resolve(["available": available])
        }
    }

    @objc func login(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce")?.trimmingCharacters(in: .whitespacesAndNewlines),
              !nonce.isEmpty else {
            call.reject("Missing nonce", "LOGIN_FAILED")
            return
        }

        let scopeNames = call.getArray("scopes", String.self) ?? Self.defaultScopes
        let permissions = Self.mapPermissions(scopeNames)
        guard !permissions.isEmpty else {
            call.reject("No valid scopes", "LOGIN_FAILED")
            return
        }

        nonisolated(unsafe) let plugin = self
        nonisolated(unsafe) let call = call

        Task { @MainActor in
            guard plugin.setupCompleted || LoginManager.shared.isSetupFinished else {
                call.reject("LineLogin.setup() has not been called", "NOT_SETUP")
                return
            }
            guard let viewController = plugin.bridge?.viewController else {
                call.reject("No view controller for LINE login", "LOGIN_FAILED")
                return
            }

            var parameters = LoginManager.Parameters()
            parameters.IDTokenNonce = nonce

            LoginManager.shared.login(
                permissions: permissions,
                in: viewController,
                parameters: parameters
            ) { result in
                // LINE SDK may deliver this off the main actor; hop back before
                // resolving the Capacitor call (call is already nonisolated(unsafe)).
                Task { @MainActor in
                    switch result {
                    case .success(let loginResult):
                        // Never log tokens.
                        guard let idToken = loginResult.accessToken.IDTokenRaw, !idToken.isEmpty else {
                            call.reject("LINE login succeeded but ID token missing", "LOGIN_FAILED")
                            return
                        }
                        let accessToken = loginResult.accessToken.value
                        guard !accessToken.isEmpty else {
                            call.reject("LINE login succeeded but access token missing", "LOGIN_FAILED")
                            return
                        }
                        call.resolve([
                            "idToken": idToken,
                            "accessToken": accessToken,
                        ])
                    case .failure(let error):
                        if error.isUserCancelled {
                            call.reject("LINE login cancelled", "CANCELLED")
                            return
                        }
                        call.reject(error.localizedDescription, "LOGIN_FAILED")
                    }
                }
            }
        }
    }

    private static func mapPermissions(_ names: [String]) -> Set<LoginPermission> {
        var set = Set<LoginPermission>()
        for raw in names {
            switch raw.lowercased() {
            case "profile":
                set.insert(.profile)
            case "openid":
                set.insert(.openID)
            case "email":
                set.insert(.email)
            default:
                break
            }
        }
        return set
    }
}
