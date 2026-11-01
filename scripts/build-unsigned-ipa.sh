#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This compile step requires macOS with Xcode 26 or newer. Run the GitHub Actions workflow."
  exit 1
fi
xcodebuild -version
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath build/DerivedData \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY='' \
  build
app='build/DerivedData/Build/Products/Release-iphoneos/App.app'
test -d "$app"
executable=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$app/Info.plist")
file "$app/$executable" | grep -q 'Mach-O'
file "$app/$executable" | grep -q 'arm64'
# Never label source or an iOS simulator bundle as an installable device IPA.
test -f "$app/public/data.json"
stage=$(mktemp -d "$PWD/build/ipa-stage.XXXXXX")
mkdir -p "$stage/Payload"
ditto "$app" "$stage/Payload/App.app"
output="$PWD/build/ShanghaiMetro-unsigned.ipa"
# zip without an existing archive ensures obsolete bundle entries cannot persist.
temporary="$stage/ShanghaiMetro-unsigned.ipa"
(cd "$stage" && /usr/bin/zip -q -r -y "$temporary" Payload)
mv "$temporary" "$output"
echo "Built $output"
echo "Unsigned: re-sign using your own Apple account before installing on iPhone."
