// Version utility for Better Habits app
import packageJson from '../../package.json'

/**
 * Get the current app version from package.json
 * @returns {string} The current version (e.g., "1.0.0")
 */
export function getAppVersion() {
  return packageJson.version
}

/**
 * Get the app name from package.json
 * @returns {string} The app name
 */
export function getAppName() {
  return packageJson.name
}

/**
 * Get formatted version information
 * @returns {object} Object containing version info
 */
export function getVersionInfo() {
  return {
    name: getAppName(),
    version: getAppVersion(),
    displayName: 'Better Habits',
    fullVersion: `v${getAppVersion()}`
  }
}