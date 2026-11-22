#!/usr/bin/env node
/**
 * ponytail: assert standalone plugin package stays aligned.
 * Run: npm run check
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

let failed = 0
const fail = (msg) => {
  console.error(msg)
  failed++
}
const read = (p) => readFileSync(p, 'utf8')

const pkg = JSON.parse(read(join(pkgRoot, 'package.json')))
if (pkg.name !== '@saharat-ong/capacitor-line-login') {
  fail('package name must be @saharat-ong/capacitor-line-login')
}
if (pkg.private !== true) {
  fail('package must stay private until intentionally published')
}
if (!pkg.peerDependencies?.['@capacitor/core']?.includes('8')) {
  fail('peerDependencies.@capacitor/core must target Capacitor 8')
}
if (!String(pkg.repository?.url || '').includes('saharat-ong/capacitor-line-login')) {
  fail('repository.url must point at saharat-ong/capacitor-line-login')
}

const defs = read(join(pkgRoot, 'src/definitions.ts'))
const web = read(join(pkgRoot, 'src/web.ts'))
const index = read(join(pkgRoot, 'src/index.ts'))
const swift = read(join(pkgRoot, 'ios/Sources/LineLoginPlugin/LineLoginPlugin.swift'))
const urlHandler = read(join(pkgRoot, 'ios/Sources/LineLoginPlugin/LineLoginURLHandler.swift'))
const java = read(
  join(pkgRoot, 'android/src/main/java/com/rinary/plugins/linelogin/LineLoginPlugin.java'),
)

if (!index.includes("registerPlugin<LineLoginPlugin>('LineLogin'")) {
  fail("src/index.ts must register LineLogin")
}
if (!web.includes('unavailable(')) {
  fail('web stub must use WebPlugin.unavailable (UNAVAILABLE)')
}
if (!urlHandler.includes('@MainActor')) {
  fail('LineLoginURLHandler must be @MainActor for Swift 6 / LINE SDK isolation')
}
if (!swift.includes('@preconcurrency import Capacitor')) {
  fail('LineLoginPlugin must @preconcurrency import Capacitor')
}
if (!swift.includes('Task { @MainActor')) {
  fail('LineLoginPlugin must hop to MainActor via Task')
}
if (!swift.includes('nonisolated(unsafe) let plugin = self')) {
  fail('LineLoginPlugin must use nonisolated(unsafe) let plugin = self')
}
if (!swift.includes('nonisolated(unsafe) let call')) {
  fail('LineLoginPlugin must use nonisolated(unsafe) for CAPPluginCall across hops')
}
if (/Task \{ @MainActor[^\n]*\n(?:.*\n)*?.*\bself\./.test(swift)) {
  fail('LineLoginPlugin MainActor tasks must not capture/use self. — use plugin ref')
}

for (const name of ['setup', 'login', 'isAvailable']) {
  if (!defs.includes(name)) fail(`definitions missing ${name}`)
  if (!swift.includes(`name: "${name}"`) && !swift.includes(`func ${name}(`)) {
    fail(`swift missing method: ${name}`)
  }
  if (!java.includes(`public void ${name}(`)) fail(`java missing method: ${name}`)
}

for (const code of ['CANCELLED', 'NOT_SETUP', 'LOGIN_FAILED']) {
  if (!swift.includes(`"${code}"`)) fail(`swift must reject with ${code}`)
  if (!java.includes(`"${code}"`)) fail(`java must reject with ${code}`)
}

if (!swift.includes('IDTokenNonce')) fail('swift must pass IDTokenNonce')
if (!java.includes('.nonce(')) fail('java must pass nonce')

const pluginBlob = [defs, web, index, swift, java, read(join(pkgRoot, 'README.md'))].join('\n')
for (const ban of ['com.rinary.kbusmart', 'kbusmart://', 'KBU Smart', 'my.kbu.cloud']) {
  if (pluginBlob.includes(ban)) {
    fail(`plugin package must not contain app-specific string: ${ban}`)
  }
}

for (const f of [
  'NOTICE',
  'README.md',
  'LICENSE.TODO',
  'SaharatOngCapacitorLineLogin.podspec',
  'Package.swift',
  '.gitignore',
]) {
  if (!existsSync(join(pkgRoot, f))) fail(`missing ${f}`)
}
if (existsSync(join(pkgRoot, 'LICENSE'))) {
  fail('do not ship LICENSE until an SPDX license is chosen (see LICENSE.TODO)')
}
if (!read(join(pkgRoot, 'NOTICE')).includes('Apache')) {
  fail('NOTICE must credit LINE SDKs (Apache-2.0)')
}
if (!read(join(pkgRoot, 'SaharatOngCapacitorLineLogin.podspec')).includes('LineSDKSwift')) {
  fail('podspec must depend on LineSDKSwift')
}
if (!read(join(pkgRoot, 'SaharatOngCapacitorLineLogin.podspec')).includes("swift_version = '6.0'")) {
  fail("podspec must set swift_version 6.0")
}
if (!read(join(pkgRoot, 'Package.swift')).includes('swiftLanguageMode(.v6)')) {
  fail('Package.swift must enable Swift 6 language mode')
}
if (!read(join(pkgRoot, 'android/build.gradle')).includes('com.linecorp.linesdk:linesdk')) {
  fail('android/build.gradle must depend on linesdk')
}

if (failed > 0) {
  console.error(`selfcheck: ${failed} failure(s)`)
  process.exit(1)
}
console.log('selfcheck: ok')
