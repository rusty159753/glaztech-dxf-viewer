// Glaz-Tech-specific behavior layered on top of the upstream MlCadViewer.
// These hooks attach to the AcApDocManager singleton after the viewer is
// created (App.vue @create) and are safe to call again on every mount.
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

const INSTALL_FLAG = '__gtiCustomizationsInstalled'
const WHITE = 0xffffff

// Vector exports paint the page background to match the on-screen view color
// (AcApPdfConvertor/AcSvgRenderer read view.backgroundColor). In dark theme
// that is black, producing ink-heavy black pages. These are the export
// commands that should print on white paper with black lines.
const EXPORT_COMMANDS = new Set(['cpdf', 'csvg'])

/**
 * Force a white page background during PDF/SVG export, then restore the
 * viewer's real (dark) background. Keeps dark-mode viewing intact while
 * producing white-page / black-line printouts.
 */
function installExportBackgroundFix(dm: AcApDocManager): void {
  let savedBackground: number | null = null

  dm.editor.events.commandWillStart.addEventListener(({ command }) => {
    if (EXPORT_COMMANDS.has(command.globalName.toLowerCase())) {
      savedBackground = dm.curView.backgroundColor
      dm.curView.backgroundColor = WHITE
    }
  })

  dm.editor.events.commandEnded.addEventListener(({ command }) => {
    if (
      EXPORT_COMMANDS.has(command.globalName.toLowerCase()) &&
      savedBackground !== null
    ) {
      dm.curView.backgroundColor = savedBackground
      savedBackground = null
    }
  })
}

/**
 * Intercept "New Drawing", which loads a blank ISO template via
 * openUrl(...'templates/acadiso.dxf'). A blank sheet is not part of the
 * Glaz-Tech workflow and also leaves the previous file's name in the header,
 * so instead we return the user to the branded file picker.
 */
function installNewDrawingRedirect(
  dm: AcApDocManager,
  onNewDrawing: () => void
): void {
  const originalOpenUrl = dm.openUrl.bind(dm)
  const wrapped = (
    url: string,
    options?: Parameters<typeof originalOpenUrl>[1]
  ): Promise<boolean> => {
    if (typeof url === 'string' && url.includes('templates/acadiso.dxf')) {
      // Defer so the triggering command can unwind before we unmount the viewer.
      queueMicrotask(onNewDrawing)
      return Promise.resolve(true)
    }
    return originalOpenUrl(url, options)
  }
  ;(dm as unknown as { openUrl: typeof wrapped }).openUrl = wrapped
}

/**
 * Apply all Glaz-Tech viewer customizations. Idempotent per document-manager
 * instance, so calling it on every viewer mount is safe.
 *
 * @param onNewDrawing - called when the user picks "New Drawing"
 */
export function applyGlaztechCustomizations(onNewDrawing: () => void): void {
  const dm = AcApDocManager.instance
  const flagged = dm as unknown as Record<string, boolean>
  if (flagged[INSTALL_FLAG]) return
  flagged[INSTALL_FLAG] = true

  installExportBackgroundFix(dm)
  installNewDrawingRedirect(dm, onNewDrawing)
}
