import { useEffect, useState, type KeyboardEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  FileSpreadsheet,
  Plus,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImportQuestDialog } from "@/components/import-quest-dialog"
import { MAX_MILESTONES } from "@/lib/contract-types"
import { cn } from "@/lib/utils"
import { step1Schema, type Step1Values, FieldError, FormLabel } from "./types"
import { useQuestCreation } from "./context"
import { CsvImportDialog } from "./csv-import-dialog"
import { downloadCsvTemplate, type ParsedMilestone } from "./csv-parser"

/**
 * A milestone row is a placeholder when every field is blank — step 2 seeds the
 * list with one so the form is never empty. Placeholders must not survive an
 * append, or step 2 would fail validation on an empty row.
 */
function isPlaceholder(m: ParsedMilestone): boolean {
  return m.title.trim() === "" && m.description.trim() === ""
}

interface PendingImport {
  milestones: ParsedMilestone[]
  mode: "append" | "replace"
  droppedForLimit: number
}

export function Step1Form() {
  const { step1Data, setStep1Data, step2Data, setStep2Data, goToNext } = useQuestCreation()
  const [tagInput, setTagInput] = useState("")
  const [tagError, setTagError] = useState<string | null>(null)
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [importNotice, setImportNotice] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<Step1Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(step1Schema as any),
    defaultValues: {
      name: step1Data.name || "",
      description: step1Data.description || "",
      category: step1Data.category || "",
      tags: step1Data.tags || [],
    },
    mode: "onChange",
  })

  const nameValue = watch("name", "")
  const descValue = watch("description", "")
  const categoryValue = watch("category", "")
  const tagsValue = watch("tags", [])

  // Keep incomplete input in the creation context so "Save draft" works before a step is valid.
  useEffect(() => {
    const subscription = watch(value => setStep1Data({
      name: value.name ?? "", description: value.description ?? "", category: value.category ?? "", tags: value.tags ?? [],
    }))
    return () => subscription.unsubscribe()
  }, [setStep1Data, watch])

  const handleAddTag = () => {
    setTagError(null)
    const trimmed = tagInput.trim()
    if (!trimmed) {
      setTagError("Tag cannot be empty")
      return
    }
    if (trimmed.length > 32) {
      setTagError("Tag max 32 characters")
      return
    }
    if (tagsValue.length >= 5) {
      setTagError("Maximum 5 tags allowed")
      return
    }
    if (tagsValue.includes(trimmed)) {
      setTagError("Tag already added")
      return
    }

    const updated = [...tagsValue, trimmed]
    setValue("tags", updated, { shouldValidate: true, shouldDirty: true })
    setTagInput("")
  }

  const handleRemoveTag = (indexToRemove: number) => {
    const updated = tagsValue.filter((_, idx) => idx !== indexToRemove)
    setValue("tags", updated, { shouldValidate: true, shouldDirty: true })
    setTagError(null)
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleDownloadTemplate = () => {
    downloadCsvTemplate()
  }

  const handleCsvParsed = (milestones: ParsedMilestone[], mode: "append" | "replace") => {
    setIsCsvDialogOpen(false)

    const existing = step2Data.milestones.filter(m => !isPlaceholder(m))
    const headroom = Math.max(0, MAX_MILESTONES - (mode === "replace" ? 0 : existing.length))
    const accepted = milestones.slice(0, headroom)
    const droppedForLimit = milestones.length - accepted.length

    setPendingImport({ milestones: accepted, mode, droppedForLimit })
    setIsReviewOpen(true)
  }

  const handleConfirmImport = () => {
    if (!pendingImport) return

    const existing = step2Data.milestones.filter(m => !isPlaceholder(m))
    const merged =
      pendingImport.mode === "replace"
        ? pendingImport.milestones
        : [...existing, ...pendingImport.milestones]

    setStep2Data({ milestones: merged })
    setIsReviewOpen(false)
    setPendingImport(null)
    setImportNotice(
      `Imported ${pendingImport.milestones.length} milestone${pendingImport.milestones.length === 1 ? "" : "s"} — ${
        pendingImport.mode === "replace" ? "step 2 now shows only these" : "added to step 2"
      }.` +
        (pendingImport.droppedForLimit > 0
          ? ` ${pendingImport.droppedForLimit} extra row${
              pendingImport.droppedForLimit === 1 ? " was" : "s were"
            } dropped: the contract allows at most ${MAX_MILESTONES} milestones per quest.`
          : "")
    )
  }

  const handleCancelImport = () => {
    setIsReviewOpen(false)
    setPendingImport(null)
  }

  const onSubmit = (data: Step1Values) => {
    setStep1Data(data)
    goToNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <div className="bg-accent border-border border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-wider uppercase">
              Step 1 — Quest Basics
            </span>
          </div>
        </div>
        <div className="border-border bg-background space-y-5 border border-t-0 p-6 shadow-md">
          {/* Name */}
          <div>
            <FormLabel htmlFor="quest-name-input" required>
              Quest Name
            </FormLabel>
            <input
              id="quest-name-input"
              {...register("name")}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "quest-name-error" : undefined}
              placeholder="e.g. Learn to Code with Alex"
              className={cn(
                "border-border bg-background w-full border px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
                errors.name && "border-destructive focus:ring-1 focus:ring-destructive"
              )}
              maxLength={64}
            />
            <div className="mt-1 flex items-center justify-between">
              <FieldError id="quest-name-error" message={errors.name?.message} />
              <span
                className={cn(
                  "ml-auto text-xs font-bold",
                  nameValue.length > 56 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {nameValue.length}/64
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <FormLabel htmlFor="quest-description-input" required>
              Description
            </FormLabel>
            <textarea
              id="quest-description-input"
              {...register("description")}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "quest-description-error" : undefined}
              rows={5}
              placeholder="Describe what learners will accomplish..."
              className={cn(
                "border-border bg-background w-full resize-none border px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
                errors.description && "border-destructive focus:ring-1 focus:ring-destructive"
              )}
              maxLength={2000}
            />
            <div className="mt-1 flex items-center justify-between">
              <FieldError id="quest-description-error" message={errors.description?.message} />
              <span
                className={cn(
                  "ml-auto text-xs font-bold",
                  descValue.length > 1800 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {descValue.length}/2000
              </span>
            </div>
          </div>

          {/* Category */}
          <div>
            <FormLabel htmlFor="quest-category-input" required>
              Category
            </FormLabel>
            <input
              id="quest-category-input"
              {...register("category")}
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? "quest-category-error" : undefined}
              placeholder="e.g. Programming, Web3, Design"
              className={cn(
                "border-border bg-background w-full border px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
                errors.category && "border-destructive focus:ring-1 focus:ring-destructive"
              )}
              maxLength={32}
            />
            <div className="mt-1 flex items-center justify-between">
              <FieldError id="quest-category-error" message={errors.category?.message} />
              <span
                className={cn(
                  "ml-auto text-xs font-bold",
                  categoryValue.length > 28 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {categoryValue.length}/32
              </span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <FormLabel htmlFor="quest-tag-input">Tags (Optional, Max 5)</FormLabel>
            <div className="flex gap-2">
              <input
                id="quest-tag-input"
                type="text"
                value={tagInput}
                onChange={e => {
                  setTagInput(e.target.value)
                  if (tagError) setTagError(null)
                }}
                onKeyDown={handleTagKeyDown}
                placeholder="e.g. soroban, rust"
                disabled={tagsValue.length >= 5}
                aria-invalid={!!tagError || !!errors.tags}
                aria-describedby={tagError ? "quest-tag-error" : undefined}
                className={cn(
                  "border-border bg-background flex-1 border px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none disabled:opacity-50",
                  (tagError || errors.tags) && "border-destructive"
                )}
                maxLength={32}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={tagsValue.length >= 5 || !tagInput.trim()}
                className="neo-press border-border border"
              >
                <Plus className="h-4 w-4" />
                Add Tag
              </Button>
            </div>
            <div className="mt-1">
              <FieldError
                id="quest-tag-error"
                message={tagError || (errors.tags?.message as string)}
              />
            </div>

            {/* Tag Pills */}
            {tagsValue.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tagsValue.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-accent border-border text-foreground flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(idx)}
                      aria-label={`Remove tag ${tag}`}
                      className="hover:text-destructive cursor-pointer transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Milestone CSV import — pre-populates step 2 */}
      <div className="border-border bg-background border shadow-md">
        <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-wider uppercase">
              Import Milestones
            </span>
          </div>
        </div>
        <div className="space-y-3 p-6">
          <p className="text-muted-foreground text-sm">
            Already have your milestones in a spreadsheet? Import them from a CSV to fill in step 2
            automatically. Each row needs a <code className="text-foreground">milestone_title</code>
            , <code className="text-foreground">description</code>, and{" "}
            <code className="text-foreground">reward_amount</code> (up to {MAX_MILESTONES}{" "}
            milestones).
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCsvDialogOpen(true)}
              className="neo-press border-border border"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import Milestones from CSV
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleDownloadTemplate}
              className="text-muted-foreground hover:text-foreground"
            >
              <Download className="h-4 w-4" />
              Download Sample CSV
            </Button>
          </div>

          {importNotice && (
            <p
              role="status"
              className="border-success/40 bg-success/10 text-success flex items-start gap-2 border p-3 text-xs font-semibold"
            >
              <CheckCircle2 className="mt-px h-3.5 w-3.5 flex-shrink-0" />
              {importNotice}
            </p>
          )}
        </div>
      </div>

      <CsvImportDialog
        isOpen={isCsvDialogOpen}
        onClose={() => setIsCsvDialogOpen(false)}
        onImport={handleCsvParsed}
      />

      <ImportQuestDialog
        isOpen={isReviewOpen}
        onClose={handleCancelImport}
        onConfirm={handleConfirmImport}
        milestones={pendingImport?.milestones ?? []}
        mode={pendingImport?.mode ?? "append"}
        existingCount={step2Data.milestones.filter(m => !isPlaceholder(m)).length}
        questName={nameValue}
      />

      <div className="flex justify-end">
        <Button type="submit" className="shimmer-on-hover" disabled={!isValid}>
          Next: Add Milestones
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
