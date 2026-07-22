const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  search: q=>ipcRenderer.invoke('search',q), cancelSearch:()=>ipcRenderer.invoke('cancel-search'),
  save:d=>ipcRenderer.invoke('save-project',d), load:()=>ipcRenderer.invoke('load-project'),
  export:x=>ipcRenderer.invoke('export',x), open:u=>ipcRenderer.invoke('open',u),
  importLocal:()=>ipcRenderer.invoke('import-local'), searchLocal:q=>ipcRenderer.invoke('search-local',q),
  saveSettings:s=>ipcRenderer.invoke('save-settings',s), loadSettings:()=>ipcRenderer.invoke('load-settings'),
  analyzeReaction:r=>ipcRenderer.invoke('analyze-reaction',r), retrosynthesis:x=>ipcRenderer.invoke('retrosynthesis',x),
  runCustomConnector:x=>ipcRenderer.invoke('run-custom-connector',x), saveNotebook:x=>ipcRenderer.invoke('save-notebook',x)
});
