/**
 * Copy text to clipboard with error handling
 */
export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}
