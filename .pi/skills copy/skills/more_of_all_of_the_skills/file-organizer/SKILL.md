---
name: file-organizer
description: Intelligently organizes your files and folders across your computer by understanding context, finding duplicates, suggesting better structures, and automating cleanup tasks. Also supports content-based file classification — reads file contents, summarizes them, and categorizes/tags them against a predefined taxonomy. Reduces cognitive load and keeps your digital workspace tidy without manual effort.
---

# File Organizer

This skill acts as your personal organization assistant, helping you maintain a clean, logical file structure across your computer without the mental overhead of constant manual organization. It supports two distinct modes: **Structural Organization** (folders, duplicates, renaming) and **Content Analysis** (reading file contents, summarizing, and classifying against a taxonomy).

## When to Use This Skill

- Your Downloads folder is a chaotic mess
- You can't find files because they're scattered everywhere
- You have duplicate files taking up space
- Your folder structure doesn't make sense anymore
- You want to establish better organization habits
- You're starting a new project and need a good structure
- You're cleaning up before archiving old projects
- You have a batch of files that need content-based classification against a taxonomy
- You need to tag, categorize, or inventory files by what they actually contain
- You're building a searchable metadata index of your documents
- You want to separate files by subject matter (not just file type)

## What This Skill Does

1. **Analyzes Current Structure**: Reviews your folders and files to understand what you have
2. **Finds Duplicates**: Identifies duplicate files across your system
3. **Suggests Organization**: Proposes logical folder structures based on your content
4. **Automates Cleanup**: Moves, renames, and organizes files with your approval
5. **Maintains Context**: Makes smart decisions based on file types, dates, and content
6. **Reduces Clutter**: Identifies old files you probably don't need anymore
7. **Classifies by Content**: Reads file contents, generates summaries, and assigns categories/tags from a predefined taxonomy

## How to Use

### From Your Home Directory

```
cd ~
```

Then run Hermes and ask for help:

```
Help me organize my Downloads folder
```

```
Find duplicate files in my Documents folder
```

```
Review my project directories and suggest improvements
```

### Specific Organization Tasks

```
Organize these downloads into proper folders based on what they are
```

```
Find duplicate files and help me decide which to keep
```

```
Clean up old files I haven't touched in 6+ months
```

```
Create a better folder structure for my [work/projects/photos/etc]
```

## Instructions

When a user requests file organization help:

1. **Understand the Scope**

   Ask clarifying questions:
   - Which directory needs organization? (Downloads, Documents, entire home folder?)
   - What's the main problem? (Can't find things, duplicates, too messy, no structure?)
   - Any files or folders to avoid? (Current projects, sensitive data?)
   - How aggressively to organize? (Conservative vs. comprehensive cleanup)

2. **Analyze Current State**

   Review the target directory:

   ```bash
   # Get overview of current structure
   ls -la [target_directory]
   
   # Check file types and sizes
   find [target_directory] -type f -exec file {} \; | head -20
   
   # Identify largest files
   du -sh [target_directory]/* | sort -rh | head -20
   
   # Count file types
   find [target_directory] -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn
   ```

   Summarize findings:
   - Total files and folders
   - File type breakdown
   - Size distribution
   - Date ranges
   - Obvious organization issues

3. **Identify Organization Patterns**

   Based on the files, determine logical groupings:

   **By Type**:
   - Documents (PDFs, DOCX, TXT)
   - Images (JPG, PNG, SVG)
   - Videos (MP4, MOV)
   - Archives (ZIP, TAR, DMG)
   - Code/Projects (directories with code)
   - Spreadsheets (XLSX, CSV)
   - Presentations (PPTX, KEY)

   **By Purpose**:
   - Work vs. Personal
   - Active vs. Archive
   - Project-specific
   - Reference materials
   - Temporary/scratch files

   **By Date**:
   - Current year/month
   - Previous years
   - Very old (archive candidates)

4. **Find Duplicates**

   When requested, search for duplicates:

   ```bash
   # Find exact duplicates by hash
   find [directory] -type f -exec md5 {} \; | sort | uniq -d
   
   # Find files with same name
   find [directory] -type f -printf '%f\n' | sort | uniq -d
   
   # Find similar-sized files
   find [directory] -type f -printf '%s %p\n' | sort -n
   ```

   For each set of duplicates:
   - Show all file paths
   - Display sizes and modification dates
   - Recommend which to keep (usually newest or best-named)
   - **Important**: Always ask for confirmation before deleting

5. **Propose Organization Plan**

   Present a clear plan before making changes:

   ```markdown
   # Organization Plan for [Directory]
   
   ## Current State
   - X files across Y folders
   - [Size] total
   - File types: [breakdown]
   - Issues: [list problems]
   
   ## Proposed Structure
   
   ```dart
   [Directory]/
   ├── Work/
   │   ├── Projects/
   │   ├── Documents/
   │   └── Archive/
   ├── Personal/
   │   ├── Photos/
   │   ├── Documents/
   │   └── Media/
   └── Downloads/
       ├── To-Sort/
       └── Archive/
   ```
   
   ## Changes I'll Make
   
   1. **Create new folders**: [list]
   2. **Move files**:
      - X PDFs → Work/Documents/
      - Y images → Personal/Photos/
      - Z old files → Archive/
   3. **Rename files**: [any renaming patterns]
   4. **Delete**: [duplicates or trash files]
   
   ## Files Needing Your Decision
   
   - [List any files you're unsure about]
   
   Ready to proceed? (yes/no/modify)
   ```

6. **Execute Organization**

   After approval, organize systematically:

   ```bash
   # Create folder structure
   mkdir -p "path/to/new/folders"
   
   # Move files with clear logging
   mv "old/path/file.pdf" "new/path/file.pdf"
   
   # Rename files with consistent patterns
   # Example: "YYYY-MM-DD - Description.ext"
   ```

   **Important Rules**:
   - Always confirm before deleting anything
   - Log all moves for potential undo
   - Preserve original modification dates
   - Handle filename conflicts gracefully
   - Stop and ask if you encounter unexpected situations

7. **Provide Summary and Maintenance Tips**

   After organizing:

   ```markdown
   # Organization Complete! ✨
   
   ## What Changed
   
   - Created [X] new folders
   - Organized [Y] files
   - Freed [Z] GB by removing duplicates
   - Archived [W] old files
   
   ## New Structure
   
   [Show the new folder tree]
   
   ## Maintenance Tips
   
   To keep this organized:
   
   1. **Weekly**: Sort new downloads
   2. **Monthly**: Review and archive completed projects
   3. **Quarterly**: Check for new duplicates
   4. **Yearly**: Archive old files
   
   ## Quick Commands for You
   
   ```bash
   # Find files modified this week
   find . -type f -mtime -7
   
   # Sort downloads by type
   [custom command for their setup]
   
   # Find duplicates
   [custom command]
   ```

   Want to organize another folder?
   ```

## Content Analysis Mode

When a user requests **content-based file classification** (tagging, categorizing, summarizing files by their contents), use this mode instead of the structural organization workflow above.

### Mode Detection

- The user asks to "classify", "tag", "categorize", "analyze contents", or "summarize" files
- The user provides or references a taxonomy/category list
- The user asks to "inventory" or "metadata-index" a set of files

### Required Inputs

1. **Target files/directory** — what to classify
2. **Taxonomy** — the predetermined set of categories/tags to apply (provided by the user)
3. **Classification scope** — per-file, per-directory, or bulk?

### Step-by-Step Content Classification

#### Step 1: Clarify the Taxonomy

Before starting, confirm with the user:

```markdown
## Taxonomy Confirmation

I'll classify against this taxonomy. Confirm or adjust:

**Categories**: [list from user]
**Tags**: [list from user]

**Classification rules**:
- Can a file have multiple categories? (default: yes)
- Should I assign tags in addition to a primary category?
- Any files or folders to skip?
- Generate a summary of each file? (default: yes)
- Output format: table, individual reports, or JSON metadata?
```

If the user hasn't provided the taxonomy yet, note that and wait for them.

#### Step 2: Discover Target Files

```bash
# List all files in the target directory (recursive)
find [target_directory] -type f | head -100

# Filter by relevant extensions if user specifies file types
find [target_directory] -type f \( -name "*.pdf" -o -name "*.md" -o -name "*.txt" \) | head -100

# Count files
find [target_directory] -type f | wc -l
```

**Considerations:**

- For binary formats (PDF, DOCX, images, audio), note that only text-extractable content can be analyzed
- For very large batches (>50 files), batch the work or offer to prioritize
- Skip hidden files, cache directories, and binary media files by default

#### Step 3: Read and Summarize Each File

For each text-readable file, read its contents and generate a concise summary:

```bash
# Read text files
cat "file.txt"

# Extract text from PDFs
python3 -c "import pypdf; reader = pypdf.PdfReader('file.pdf'); print('\n'.join(page.extract_text() for page in reader.pages))"

# Extract text from markdown
cat "file.md"
```

**For each file, produce a classification record:**

```markdown
### File: path/to/file.ext
**Summary**: [1-3 sentence summary of the file's content and purpose]
**Category**: [primary category from taxonomy]
**Tags**: [tag1, tag2, tag3 from taxonomy]
**Confidence**: High / Medium / Low
**Notes**: [any edge cases, mixed content, or special handling]
```

#### Step 4: Batch Classification (Efficient Mode)

For large batches (10+ files), process them efficiently:

1. **Scan first** — use `file` and extension to filter out non-text files
2. **Read 3-5 files** as a pilot batch to validate category assignments
3. **Show the user a sample** — confirm the taxonomy is working before processing the rest
4. **Process remaining files** in batches of 5-10
5. **Consolidate** into a final classification report

**Small batch (under 10 files):** Classify each one individually with a full record.

**Large batch (10-50 files):** Process in rounds, showing a summary table between rounds.

**Very large batch (50+ files):** Offer to create a script that generates a CSV/JSON index, then classify programmatically.

#### Step 5: Deliver the Classification Report

Present results in a consistent format:

```markdown
# Content Classification Report

**Target**: [directory or file list]
**Taxonomy**: [name/source of categories]
**Date**: [YYYY-MM-DD]
**Files Classified**: [X total]

## Summary by Category

| Category | Count | Files |
|----------|-------|-------|
| Category A | X | file1, file2, ... |
| Category B | Y | file3, file4, ... |
| Unclassified | Z | file5, file6, ... |

## Per-File Classification

### 1. file1.ext
- **Summary**: [summary text]
- **Category**: [category]
- **Tags**: [tag1, tag2]
- **Confidence**: High

### 2. file2.ext
- **Summary**: [summary text]
- **Category**: [category]
- **Tags**: [tag1, tag3]
- **Confidence**: Medium
- **Notes**: Content spans multiple categories

[...]

## Suggested Actions
- Files classified [category] could be moved to [folder]
- Files with Low confidence need manual review
- [Any patterns or insights noticed]
```

#### Step 6: Optional Follow-Up

After classification, offer:

1. **Move files** into category-named folders
2. **Generate a metadata index** (CSV/JSON with paths, summaries, categories, tags)
3. **Rename files** to include category prefix (e.g., `cat_originalname.ext`)
4. **Create symlinks** for multi-tagged files
5. **Export tag data** for use with note-taking apps (Obsidian tags, etc.)

```bash
# Example: generate a CSV index
echo "path,summary,category,tags" > index.csv
# (populated per file)
```

### Content Analysis Examples

#### Example A: Taxonomy from User

```bash
$ Classify everything in ~/Research/ using these categories: 
  "Networking", "Security", "AI/ML", "Systems", "Business"
  Tags: "paper", "notes", "draft", "reference"
```

**Workflow:**

1. Confirm taxonomy and classification rules
2. Scan `~/Research/` — count files, identify file types
3. Process pilot batch (3 files), show user for confirmation
4. Process remaining ~20 files
5. Deliver classification report with summary table and per-file records
6. Offer to generate a CSV index or move files into category folders

#### Example B: Cleanup with Classification

```
$ I have 200 files in Downloads. Categorize them by content type:
  "Invoice", "Receipt", "Contract", "Report", "Meeting Notes", "Other"
```

**Workflow:**

1. Warn about batch size — offer pilot of 10 files first
2. Run pilot, show distribution, get confirmation
3. Process remainder in batches
4. Deliver report organized by category with actionable next steps
5. Offer to move each category to corresponding subfolder

## Examples

### Example 1: Organizing Downloads (From Justin Dielmann)

**User**: "My Downloads folder is a mess with 500+ files. Help me organize it."

**Process**:

1. Analyzes Downloads folder
2. Finds patterns: work docs, personal photos, installers, random PDFs
3. Proposes structure:
   - Downloads/
     - Work/
     - Personal/
     - Installers/ (DMG, PKG files)
     - Archive/
     - ToSort/ (things needing decisions)
4. Asks for confirmation
5. Moves files intelligently based on content and names
6. Results: 500 files → 5 organized folders

### Example 2: Finding and Removing Duplicates

**User**: "Find duplicate files in my Documents and help me decide which to keep."

**Output**:

```markdown
# Found 23 Sets of Duplicates (156 MB total)

## Duplicate Set 1: "proposal.pdf"
- `/Documents/proposal.pdf` (2.3 MB, modified: 2024-03-15)
- `/Documents/old/proposal.pdf` (2.3 MB, modified: 2024-03-15)
- `/Desktop/proposal.pdf` (2.3 MB, modified: 2024-03-10)

**Recommendation**: Keep `/Documents/proposal.pdf` (most recent in correct location)
Delete the other 2 copies?

[Continue for all duplicates...]
```

### Example 3: Restructuring Projects Folder

**User**: "Review my ~/Projects directory and suggest improvements."

**Output**:

```markdown
# Analysis of ~/Projects

## Current Structure Issues
- Mix of active and archived projects (3+ years old)
- No consistent naming convention
- Some projects at root, others in random subfolders
- Duplicate folders (project-name, project-name-old, project-name-v2)

## Proposed Structure

```

Projects/
├── Active/
│   ├── client-work/
│   ├── side-projects/
│   └── learning/
├── Archive/
│   ├── 2022/
│   ├── 2023/
│   └── 2024/
└── Templates/

```

## Specific Changes
1. Move 12 projects not touched since 2022 → Archive/
2. Consolidate 4 duplicate project folders
3. Rename projects to consistent format: "client-name-project-name"
4. Create Archive for old work

Want me to implement this?
```

### Example 4: Organizing Photos by Date

**User**: "Organize my photo folders by year and month."

**Output**: Creates structure like:

```
Photos/
├── 2023/
│   ├── 01-January/
│   ├── 02-February/
│   └── ...
├── 2024/
│   ├── 01-January/
│   └── ...
└── Unsorted/
```

Then moves photos based on EXIF data or file modification dates.

## Common Organization Tasks

### Downloads Cleanup

```
Organize my Downloads folder - move documents to Documents, 
images to Pictures, keep installers separate, and archive files 
older than 3 months.
```

### Project Organization

```
Review my Projects folder structure and help me separate active 
projects from old ones I should archive.
```

### Duplicate Removal

```
Find all duplicate files in my Documents folder and help me 
decide which ones to keep.
```

### Desktop Cleanup

```
My Desktop is covered in files. Help me organize everything into 
my Documents folder properly.
```

### Photo Organization

```
Organize all photos in this folder by date (year/month) based 
on when they were taken.
```

### Work/Personal Separation

```
Help me separate my work files from personal files across my 
Documents folder.
```

## Pro Tips

1. **Start Small**: Begin with one messy folder (like Downloads) to build trust
2. **Regular Maintenance**: Run weekly cleanup on Downloads
3. **Consistent Naming**: Use "YYYY-MM-DD - Description" format for important files
4. **Archive Aggressively**: Move old projects to Archive instead of deleting
5. **Keep Active Separate**: Maintain clear boundaries between active and archived work
6. **Trust the Process**: Let Claude handle the cognitive load of where things go

## Best Practices

### Folder Naming

- Use clear, descriptive names
- Avoid spaces (use hyphens or underscores)
- Be specific: "client-proposals" not "docs"
- Use prefixes for ordering: "01-current", "02-archive"

### File Naming

- Include dates: "2024-10-17-meeting-notes.md"
- Be descriptive: "q3-financial-report.xlsx"
- Avoid version numbers in names (use version control instead)
- Remove download artifacts: "document-final-v2 (1).pdf" → "document.pdf"

### When to Archive

- Projects not touched in 6+ months
- Completed work that might be referenced later
- Old versions after migration to new systems
- Files you're hesitant to delete (archive first)

## Related Use Cases

- Setting up organization for a new computer
- Preparing files for backup/archiving
- Cleaning up before storage cleanup
- Organizing shared team folders
- Structuring new project directories
