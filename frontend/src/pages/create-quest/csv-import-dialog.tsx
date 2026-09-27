import { useState, type ChangeEvent, type DragEvent } from "react"
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatUsdc, cn } from "@/lib/utils"
import {
  parseCsvMilestones,
  downloadCsvTemplate,
  type CsvParseResult,
  type ParsedMilestone,
} from "./csv-parser"

interface CsvImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (milestones: ParsedMilestone[], mode: "append" | "replace") => void
}

export function CsvImportDialog({ isOpen, onClose, onImport }: CsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null)
  const [importMode, setImportMode] = useState<"append" | "replace">("append")
  const [isDragging, setIsDragging] = useState(false)

  if (!isOpen) return null

  const handleFileSelect = (selectedFile: File) => {
    const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null)
      setParseResult({
        milestones: [],
        errors: [
          {
            row: 0,
            field: "file",
            message: "File size must be 2 MB or smaller.",
          },
        ],
      })
      return
    }

    if (!selectedFile.name.endsWith(".csv")) {
      setFile(null)
      setParseResult({
        milestones: [],
        errors: [
          {
            row: 0,
            field: "file",
            message: "Only .csv files are supported.",
          },
        ],
      })
      return
    }

    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const result = parseCsvMilestones(text || "")
      setParseResult(result)
    }

    reader.readAsText(selectedFile)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleDownloadTemplate = () => {
    downloadCsvTemplate()
  }

  const handleConfirm = () => {
    if (parseResult && parseResult.milestones.length > 0) {
      onImport(parseResult.milestones, importMode)
      onClose()
    }
  }

  const totalReward = parseResult?.milestones.reduce((sum, m) => sum + m.rewardAmount, 0) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="border-border bg-background animate-scale-in w-full max-w-xl border shadow-2xl">
        {/* Header */}
        <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-wider uppercase">
              Import Milestones from CSV
            </span>
          </div>
          <button
            onClick={onClose}
            className="hover:text-destructive cursor-pointer transition-colors"
            aria-label="Close CSV import dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-border bg-muted/40 border-2 border-dashed p-6 text-center transition-colors",
              isDragging && "border-accent bg-accent/20"
            )}
          >
            <Upload className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
            <p className="mb-1 text-sm font-semibold">Drag and drop your milestone CSV file here</p>
            <p className="text-muted-foreground mb-4 text-xs">
              Columns required: <code>milestone_title</code>, <code>description</code>,{" "}
              <code>reward_amount</code>
            </p>
            <div className="flex items-center justify-center gap-3">
              <label className="border-border bg-background hover:bg-secondary cursor-pointer border px-4 py-2 text-xs font-semibold tracking-wider uppercase shadow-sm transition-colors">
                Browse Files
                <input type="file" accept=".csv" onChange={handleInputChange} className="hidden" />
              </label>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-xs font-bold transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                View Template
              </button>
            </div>
          </div>

          {/* Selected File & Parse Summary */}
          {file && (
            <div className="border-border bg-secondary flex items-center justify-between border p-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-muted-foreground h-4 w-4" />
                <span className="max-w-[240px] truncate text-xs font-semibold">{file.name}</span>
              </div>
              {parseResult && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{parseResult.milestones.length} Valid</Badge>
                  {parseResult.errors.length > 0 && (
                    <Badge variant="destructive">{parseResult.errors.length} Errors</Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Errors List */}
          {parseResult && parseResult.errors.length > 0 && (
            <div className="border-destructive/40 bg-destructive/10 space-y-2 border p-4">
              <div className="text-destructive flex items-center gap-2 text-xs font-semibold">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                CSV Parsing Errors ({parseResult.errors.length}):
              </div>
              <ul className="text-destructive max-h-32 list-inside list-disc space-y-1 overflow-y-auto text-xs font-medium">
                {parseResult.errors.map((err, idx) => (
                  <li key={idx}>
                    Row {err.row}: Field <code>{err.field}</code> — {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Valid Milestones Preview Table */}
          {parseResult && parseResult.milestones.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Valid Milestones Preview ({parseResult.milestones.length})
                </span>
                <span className="text-xs font-semibold">
                  Total Reward: {formatUsdc(totalReward)} USDC
                </span>
              </div>

              <div className="border-border divide-border bg-background max-h-48 divide-y overflow-y-auto border">
                {parseResult.milestones.map((m, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 p-3 text-xs">
                    <div>
                      <p className="font-semibold">{m.title}</p>
                      <p className="text-muted-foreground max-w-sm truncate">{m.description}</p>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0 tabular-nums">
                      {formatUsdc(m.rewardAmount)} USDC
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Import Mode Radio Options */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === "append"}
                    onChange={() => setImportMode("append")}
                    className="accent-foreground"
                  />
                  Append to existing milestones
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                    className="accent-foreground"
                  />
                  Replace current milestones
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-secondary border-border flex items-center justify-end gap-3 border-t p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!parseResult || parseResult.milestones.length === 0}
            className="shimmer-on-hover"
          >
            <CheckCircle2 className="h-4 w-4" />
            Import {parseResult?.milestones.length || 0} Milestones
          </Button>
        </div>
      </div>
    </div>
  )
}
