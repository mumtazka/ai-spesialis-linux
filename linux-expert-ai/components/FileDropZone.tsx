'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileText, Image as ImageIcon, FileCode, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface FileUpload {
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

interface FileDropZoneProps {
  onFilesSelected?: (files: File[]) => void
  onFileRemove?: (file: FileUpload) => void
  maxFiles?: number
  acceptedTypes?: string[]
}

const ACCEPTED_TYPES = [
  'image/*',
  '.txt',
  '.log',
  '.conf',
  '.json',
  '.yaml',
  '.yml',
  '.sh',
  '.py',
  '.js',
  '.ts',
  '.md',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return ImageIcon
  if (type.includes('json') || type.includes('yaml') || type.includes('yml')) return FileCode
  return FileText
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileDropZone({
  onFilesSelected,
  onFileRemove,
  maxFiles = 5,
  acceptedTypes = ACCEPTED_TYPES,
}: FileDropZoneProps) {
  const [files, setFiles] = useState<FileUpload[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB limit'
    }
    
    const isAccepted = acceptedTypes.some((type) => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('/*', ''))
      }
      return file.name.toLowerCase().endsWith(type.toLowerCase())
    })
    
    if (!isAccepted) {
      return 'File type not supported'
    }
    
    return null
  }

  const createPreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(undefined)
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList) return
    
    const newFiles: FileUpload[] = []
    const remainingSlots = maxFiles - files.length
    
    for (let i = 0; i < Math.min(fileList.length, remainingSlots); i++) {
      const file = fileList[i]
      const error = validateFile(file)
      
      if (error) {
        newFiles.push({
          file,
          progress: 0,
          status: 'error',
          error,
        })
        continue
      }
      
      const preview = await createPreview(file)
      newFiles.push({
        file,
        preview,
        progress: 0,
        status: 'pending',
      })
    }
    
    setFiles((prev) => [...prev, ...newFiles])
    
    // Simulate upload progress
    newFiles.forEach((fileUpload, index) => {
      if (fileUpload.status === 'error') return
      
      simulateUpload(fileUpload, index)
    })
    
    onFilesSelected?.(newFiles.map((f) => f.file))
  }

  const simulateUpload = (fileUpload: FileUpload, index: number) => {
    setFiles((prev) => {
      const updated = [...prev]
      const idx = updated.findIndex((f) => f.file === fileUpload.file)
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], status: 'uploading' }
      }
      return updated
    })
    
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 30
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        
        setFiles((prev) => {
          const updated = [...prev]
          const idx = updated.findIndex((f) => f.file === fileUpload.file)
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], progress: 100, status: 'completed' }
          }
          return updated
        })
      } else {
        setFiles((prev) => {
          const updated = [...prev]
          const idx = updated.findIndex((f) => f.file === fileUpload.file)
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], progress }
          }
          return updated
        })
      }
    }, 200)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    processFiles(e.dataTransfer.files)
  }, [files.length, maxFiles])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files)
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleRemove = (fileUpload: FileUpload) => {
    setFiles((prev) => prev.filter((f) => f.file !== fileUpload.file))
    onFileRemove?.(fileUpload)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-sm p-6 cursor-pointer transition-all duration-200',
          'flex flex-col items-center justify-center gap-2',
          isDragging
            ? 'border-terminal-green bg-terminal-green/5'
            : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900',
          files.length >= maxFiles && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={files.length >= maxFiles}
        />
        
        <Upload
          className={cn(
            'h-6 w-6 transition-colors',
            isDragging ? 'text-terminal-green' : 'text-slate-500'
          )}
        />
        <div className="text-center">
          <p className="text-sm text-slate-300">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Images, .txt, .log, .conf, .json, .yaml (max 10MB)
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileUpload, index) => {
            const Icon = getFileIcon(fileUpload.file.type)
            const isImage = fileUpload.file.type.startsWith('image/')
            
            return (
              <div
                key={`${fileUpload.file.name}-${index}`}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-sm border',
                  fileUpload.status === 'error'
                    ? 'bg-terminal-red/5 border-terminal-red/30'
                    : 'bg-slate-900 border-slate-700'
                )}
              >
                {/* Preview/Icon */}
                <div className="flex-shrink-0">
                  {isImage && fileUpload.preview ? (
                    <img
                      src={fileUpload.preview}
                      alt={fileUpload.file.name}
                      className="h-10 w-10 object-cover rounded-sm"
                    />
                  ) : (
                    <div className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-sm">
                      <Icon className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {fileUpload.file.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatFileSize(fileUpload.file.size)}
                  </p>
                  
                  {/* Progress Bar */}
                  {fileUpload.status === 'uploading' && (
                    <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-terminal-green transition-all duration-200"
                        style={{ width: `${fileUpload.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {fileUpload.status === 'error' && fileUpload.error && (
                    <p className="text-[10px] text-terminal-red mt-0.5">
                      {fileUpload.error}
                    </p>
                  )}
                </div>

                {/* Status/Remove */}
                <div className="flex-shrink-0">
                  {fileUpload.status === 'uploading' ? (
                    <Loader2 className="h-4 w-4 text-terminal-green animate-spin" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemove(fileUpload)}
                      className="h-6 w-6 text-slate-500 hover:text-terminal-red"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
