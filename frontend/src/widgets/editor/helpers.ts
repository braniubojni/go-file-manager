import { cpp } from '@codemirror/lang-cpp'
import { css } from '@codemirror/lang-css'
import { go } from '@codemirror/lang-go'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { sql } from '@codemirror/lang-sql'
import { yaml } from '@codemirror/lang-yaml'
import type { Extension } from '@codemirror/state'

export const basename = (path: string): string => path.split(/[/\\]/).pop() || path

const extFromPath = (path: string): string => {
  const base = path.split(/[/\\]/).pop() || ''
  const i = base.lastIndexOf('.')
  return i >= 0 ? base.slice(i + 1).toLowerCase() : ''
}

/** CodeMirror language extension for a file path (empty = plain text). */
export const languageExtensionForPath = (path: string | null): Extension[] => {
  if (!path) return []
  const ext = extFromPath(path)
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'mts':
    case 'cts':
      return [javascript({ typescript: true, jsx: true })]
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return [javascript({ jsx: true })]
    case 'json':
    case 'jsonc':
      return [json()]
    case 'go':
      return [go()]
    case 'md':
    case 'mdx':
      return [markdown()]
    case 'css':
    case 'scss':
    case 'less':
      return [css()]
    case 'html':
    case 'htm':
    case 'xml':
    case 'svg':
      return [html()]
    case 'py':
      return [python()]
    case 'rs':
      return [rust()]
    case 'c':
    case 'h':
    case 'cpp':
    case 'cc':
    case 'hpp':
    case 'cxx':
      return [cpp()]
    case 'sql':
      return [sql()]
    case 'yaml':
    case 'yml':
      return [yaml()]
    default:
      return []
  }
}
