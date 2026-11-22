// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SaharatOngCapacitorLineLogin",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "SaharatOngCapacitorLineLogin",
            targets: ["LineLoginPlugin"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/line/line-sdk-ios-swift.git", from: "5.11.0"),
    ],
    targets: [
        .target(
            name: "LineLoginPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "LineSDK", package: "line-sdk-ios-swift"),
            ],
            path: "ios/Sources/LineLoginPlugin",
            swiftSettings: [
                .swiftLanguageMode(.v6)
            ]
        )
    ]
)
