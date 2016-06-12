'use babel'

import {CompositeDisposable} from 'atom'
import {Goextract} from './goextract'

export default {
  golangconfig: null,
  subscriptions: null,
  dependenciesInstalled: null,

  activate () {
    console.log("activating goextract")
    this.goextract = new Goextract(
      () => { return this.getGoconfig() },
      () => { return this.getGoget() }
    )
    this.subscriptions = new CompositeDisposable()
    require('atom-package-deps').install('goextract').then(() => {
      this.dependenciesInstalled = true
    }).catch((e) => {
      console.log(e)
    })
  },

  deactivate () {
    console.log("deactivating goextract")
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.goconfig = null
    this.dependenciesInstalled = null
  },

  getGoconfig () {
    while (!this.goconfig) {}
    if (this.goconfig) {
      return this.goconfig
    }
    return false
  },

  consumeGoconfig (service) {
    console.log("consumeGoConfig")
    this.goconfig = service
  },

  getGoget () {
    if (this.goget) {
      return this.goget
    }
    return false
  },

  consumeGoget (service) {
    this.goget = service
  }
}
