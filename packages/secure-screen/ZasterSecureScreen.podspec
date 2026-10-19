require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'ZasterSecureScreen'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = 'https://zaster.de'
  s.license      = { :type => 'UNLICENSED' }
  s.author       = 'Zaster'
  s.source       = { :path => '.' }
  s.platforms    = { :ios => min_ios_version_supported }
  # Swift does the work; the .mm file is the thin ObjC++ shim the generated TurboModule protocol needs.
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  install_modules_dependencies(s)
end
