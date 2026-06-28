const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

/**
 * Debug builds only: trust user-installed CAs so testers can inspect HTTPS
 * (Charles, Proxyman, mitmproxy) on api.mewego.ru and other hosts.
 *
 * Release variant is unchanged (no user CA trust from this plugin).
 */
module.exports = function withAndroidDebugProxyTrust(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const androidRoot = path.join(cfg.modRequest.projectRoot, 'android');
      const debugResXml = path.join(androidRoot, 'app', 'src', 'debug', 'res', 'xml');
      const debugManifest = path.join(androidRoot, 'app', 'src', 'debug', 'AndroidManifest.xml');

      const networkXml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <debug-overrides>
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </debug-overrides>
</network-security-config>
`;

      const manifestXml = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:networkSecurityConfig="@xml/network_security_config" />
</manifest>
`;

      await fs.promises.mkdir(debugResXml, { recursive: true });
      await fs.promises.writeFile(path.join(debugResXml, 'network_security_config.xml'), networkXml, 'utf8');
      await fs.promises.mkdir(path.dirname(debugManifest), { recursive: true });
      await fs.promises.writeFile(debugManifest, manifestXml, 'utf8');

      return cfg;
    },
  ]);
};
