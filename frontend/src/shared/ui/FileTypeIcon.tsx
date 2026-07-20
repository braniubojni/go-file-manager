import type { FC } from 'react'
import ArchiveIcon from '@mui/icons-material/Archive'
import AudioFileIcon from '@mui/icons-material/AudioFile'
import CodeIcon from '@mui/icons-material/Code'
import CssIcon from '@mui/icons-material/Css'
import DataObjectIcon from '@mui/icons-material/DataObject'
import DescriptionIcon from '@mui/icons-material/Description'
import FolderIcon from '@mui/icons-material/Folder'
import FolderZipIcon from '@mui/icons-material/FolderZip'
import HtmlIcon from '@mui/icons-material/Html'
import ImageIcon from '@mui/icons-material/Image'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import JavascriptIcon from '@mui/icons-material/Javascript'
import LinkIcon from '@mui/icons-material/Link'
import MovieIcon from '@mui/icons-material/Movie'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import TableChartIcon from '@mui/icons-material/TableChart'
import TextSnippetIcon from '@mui/icons-material/TextSnippet'
import VideoFileIcon from '@mui/icons-material/VideoFile'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import type { FileEntry } from '../../entities/file/types'

const size = 'small' as const

export const FileTypeIcon: FC<{ entry: FileEntry } & SvgIconProps> = ({ entry, ...iconProps }) => {
  const props = { fontSize: size, ...iconProps }

  if (entry.isDir) {
    return <FolderIcon {...props} color={iconProps.color ?? 'warning'} />
  }
  if (entry.isSymlink) {
    return <LinkIcon {...props} color={iconProps.color ?? 'info'} />
  }

  const ext = (entry.ext || entry.name.split('.').pop() || '').toLowerCase()

  switch (ext) {
    case 'pdf':
      return <PictureAsPdfIcon {...props} color={iconProps.color ?? 'error'} />
    case 'txt':
    case 'md':
    case 'markdown':
    case 'rtf':
    case 'log':
      return <TextSnippetIcon {...props} color={iconProps.color ?? 'action'} />
    case 'doc':
    case 'docx':
    case 'odt':
    case 'pages':
      return <DescriptionIcon {...props} color={iconProps.color ?? 'primary'} />
    case 'xls':
    case 'xlsx':
    case 'csv':
    case 'ods':
    case 'tsv':
      return <TableChartIcon {...props} color={iconProps.color ?? 'success'} />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'bmp':
    case 'svg':
    case 'ico':
    case 'heic':
    case 'avif':
      return <ImageIcon {...props} color={iconProps.color ?? 'secondary'} />
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'webm':
    case 'm4v':
      return <MovieIcon {...props} color={iconProps.color ?? 'secondary'} />
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
    case 'ogg':
    case 'm4a':
      return <MusicNoteIcon {...props} color={iconProps.color ?? 'secondary'} />
    case 'zip':
    case 'rar':
    case '7z':
    case 'gz':
    case 'tgz':
    case 'bz2':
    case 'xz':
    case 'tar':
      return <FolderZipIcon {...props} color={iconProps.color ?? 'warning'} />
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return <JavascriptIcon {...props} color={iconProps.color ?? 'warning'} />
    case 'ts':
    case 'tsx':
    case 'go':
    case 'rs':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
    case 'h':
    case 'hpp':
    case 'rb':
    case 'php':
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'swift':
    case 'kt':
      return <CodeIcon {...props} color={iconProps.color ?? 'info'} />
    case 'html':
    case 'htm':
      return <HtmlIcon {...props} color={iconProps.color ?? 'warning'} />
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <CssIcon {...props} color={iconProps.color ?? 'info'} />
    case 'json':
    case 'yaml':
    case 'yml':
    case 'toml':
    case 'xml':
      return <DataObjectIcon {...props} color={iconProps.color ?? 'action'} />
    case 'mpga':
    case 'wma':
      return <AudioFileIcon {...props} color={iconProps.color ?? 'secondary'} />
    case 'webm-video':
      return <VideoFileIcon {...props} color={iconProps.color ?? 'secondary'} />
    case 'dmg':
    case 'iso':
    case 'pkg':
    case 'deb':
    case 'rpm':
      return <ArchiveIcon {...props} color={iconProps.color ?? 'action'} />
    default:
      return <InsertDriveFileIcon {...props} color={iconProps.color ?? 'action'} />
  }
}
