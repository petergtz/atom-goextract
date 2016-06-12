'use babel'

import path from 'path'
import {CompositeDisposable, Point} from 'atom'
import {ExtractDialog} from './extract-dialog'


import {BufferedProcess} from 'atom'


class Goextract {
  constructor (goconfigFunc, gogetFunc) {
    console.log("in Goextract constructor")
    this.goconfig = goconfigFunc
    this.goget = gogetFunc
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add('atom-text-editor', 'goextract:toggle', () => {
      this.commandInvoked()
    }))
  }

  commandInvoked () {
    console.log("in commandInvoked")

    let editor = atom.workspace.getActiveTextEditor()
    if (!this.isValidEditor(editor)) {
      return
    }
    this.checkForTool(editor).then((cmd) => {
      console.log("Checked for toool: " + cmd)

      if (!cmd) {
        // TODO: Show a notification?
        return
      }
      console.log('YES')

      // let info = this.wordAndOffset(editor)
      let selectionRange = editor.getLastSelection().getBufferRange()
      // let cursor = editor.getCursorBufferPosition()

      let dialog = new ExtractDialog((funcName) => {
        this.saveAllEditors()
        let file = editor.getBuffer().getPath()
        // let cwd = path.dirname(file)

        // restore cursor position after goextract completes and the buffer is reloaded
        // if (cursor) {
        //   let disp = editor.getBuffer().onDidReload(() => {
        //     editor.setCursorBufferPosition(cursor, {autoscroll: false})
        //     let element = atom.views.getView(editor)
        //     if (element) {
        //       element.focus()
        //     }
        //     disp.dispose()
        //   })
        // }
        console.log("Running go extract")
        this.runGoextract(file, selectionRange, funcName, cmd)
      })
      dialog.onCancelled(() => {
        editor.setCursorBufferPosition(cursor, {autoscroll: false})
        let element = atom.views.getView(editor)
        if (element) {
          element.focus()
        }
      })
      dialog.attach()
      return
    }).catch((e) => {
      if (e.handle) {
        e.handle()
      }
      console.log(e)
    })
  }

  saveAllEditors () {
    for (let editor of atom.workspace.getTextEditors()) {
      if (editor.isModified() && this.isValidEditor(editor)) {
        editor.save()
      }
    }
  }

  isValidEditor (editor) {
    if (!editor || !editor.getGrammar()) {
      return false
    }

    return (editor.getGrammar().scopeName === 'source.go')
  }

  runGoextract (file, selectionRange, funcName, cmd) {
    let config = this.goconfig()
    if (!config || !config.executor) {
      return {success: false, result: null}
    }

    let args = ['--selection', `${selectionRange.start.row+1}:${selectionRange.start.column+1}-${selectionRange.end.row+1}:${selectionRange.end.column+1}`, '--function', funcName, '--output', file, file]
    console.log(`${args}`)

    return config.executor.exec(cmd, args, null).then((r) => {
      if (r.error) {
        if (r.error.code === 'ENOENT') {
          atom.notifications.addError('Missing goextract Tool', {
            detail: 'The goextract tool is required to perform an extraction. Please run go get -u github.com/petergtz/goextract to get it.',
            dismissable: true
          })
        } else {
          atom.notifications.addError('Extract Error', {
            detail: r.error.message,
            dismissable: true
          })
        }
        return {success: false, result: r}
      }

      if (r.exitcode !== 0 || r.stderr && r.stderr.trim() !== '') {
        let message = r.stdout.trim()
        atom.notifications.addWarning('Extraction error', {
          detail: message.trim(),
          dismissable: true
        })
        return {success: false, result: r}
      } else {
        atom.notifications.addSuccess("Successful extracted function")
        return {success: true, result: r}
      }
    })
  }

  checkForTool (editor) {
    if (!this.goconfig || !this.goconfig()) {
      return Promise.resolve(false)
    }

    let config = this.goconfig()
    let options = {}
    if (editor && editor.getPath()) {
      options.file = editor.getPath()
      options.directory = path.dirname(options.file)
    }

    if (!options.directory && atom.project.getPaths().length > 0) {
      options.directory = atom.project.getPaths()[0]
    }

    return config.locator.findTool('goextract', options).then((cmd) => {
      if (cmd) {
        return cmd
      }

      if (!this.goget || !this.goget()) {
        return false
      }

      let get = this.goget()
      if (this.toolCheckComplete) {
        return false
      }

      this.toolCheckComplete = true
      return get.get({
        name: 'goextract',
        packageName: 'goextract',
        packagePath: 'github.com/petergtz/goextract',
        type: 'missing'
      }).then((r) => {
        if (r.success) {
          return config.locator.findTool('goextract', options)
        }

        console.log('goextract is not available and could not be installed via "go get -u golang.org/x/tools/cmd/goextract"; please manually install it to enable goextract behavior.')
        return false
      }).catch((e) => {
        console.log(e)
        return false
      })
    })
  }

  dispose () {
    this.subscriptions.dispose()
    this.subscriptions = null
    this.goconfig = null
  }
}

export {Goextract}
