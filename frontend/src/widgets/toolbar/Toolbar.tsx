import { ArchiveDialog } from './components/ArchiveDialog'
import { DeleteDialogs } from './components/DeleteDialogs'
import { ExtractDialog } from './components/ExtractDialog'
import { NameDialog } from './components/NameDialog'
import { ToolbarBar } from './components/ToolbarBar'
import { useToolbarActions } from './hooks/useToolbarActions'

export const Toolbar = () => {
  const a = useToolbarActions()

  return (
    <>
      <ToolbarBar
        activePane={a.activePane}
        canBack={a.canBack}
        canForward={a.canForward}
        theme={a.theme}
        otherPaneLabel={a.otherPane(a.activePane)}
        onBack={() => a.goBack(a.activePane)}
        onForward={() => a.goForward(a.activePane)}
        onCopy={a.onCopy}
        onMove={a.onMove}
        onMkdir={a.onMkdir}
        onRename={a.onRename}
        onDelete={a.onDelete}
        onArchive={() => void a.openArchiveDialog()}
        onExtract={a.openExtractDialog}
        onBookmark={a.onBookmark}
        onRefresh={a.refreshAll}
        onCycleTheme={a.cycleTheme}
        onSettings={a.openSettings}
      />

      <NameDialog
        testId="dialog-mkdir"
        title="Create folder"
        label="Folder name"
        inputTestId="input-mkdir-name"
        confirmTestId="btn-mkdir-confirm"
        confirmLabel="Create"
        state={a.mkdir}
        dispatch={a.dispatchMkdir}
        onConfirm={a.confirmMkdir}
      />

      <NameDialog
        testId="dialog-rename"
        title="Rename"
        label="New name"
        inputTestId="input-rename-name"
        confirmTestId="btn-rename-confirm"
        confirmLabel="Rename"
        state={a.rename}
        dispatch={a.dispatchRename}
        onConfirm={a.confirmRename}
      />

      <DeleteDialogs
        del={a.del}
        dispatch={a.dispatchDelete}
        paths={a.realSelection}
        deleteBtnRef={a.deleteBtnRef}
        onConfirm={a.confirmDelete}
      />

      <ArchiveDialog
        archive={a.archive}
        dispatch={a.dispatchArchive}
        selectionCount={a.realSelection.length}
        activePath={a.activePath}
        onConfirm={() => void a.confirmArchive()}
      />

      <ExtractDialog
        extract={a.extract}
        dispatch={a.dispatchExtract}
        selectionCount={a.realSelection.length}
        onConfirm={() => void a.confirmExtract()}
      />
    </>
  )
}
