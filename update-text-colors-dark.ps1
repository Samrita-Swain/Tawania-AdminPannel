# Script to update light text colors to darker ones for better visibility

# Update text colors
Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $filePath = $_.FullName
    $content = Get-Content $filePath
    $modified = $false

    # Create a new array to hold the modified content
    $newContent = @()

    foreach ($line in $content) {
        # Replace text-gray-300 with text-gray-800
        if ($line -match "text-gray-300") {
            $line = $line -replace "text-gray-300", "text-gray-800"
            $modified = $true
        }

        # Replace text-gray-400 with text-gray-800
        if ($line -match "text-gray-400") {
            $line = $line -replace "text-gray-400", "text-gray-800"
            $modified = $true
        }

        # Replace text-gray-500 with text-gray-800
        if ($line -match "text-gray-500") {
            $line = $line -replace "text-gray-500", "text-gray-800"
            $modified = $true
        }

        # Replace text-gray-600 with text-gray-800
        if ($line -match "text-gray-600") {
            $line = $line -replace "text-gray-600", "text-gray-800"
            $modified = $true
        }

        # Replace text-gray-700 with text-gray-800
        if ($line -match "text-gray-700") {
            $line = $line -replace "text-gray-700", "text-gray-800"
            $modified = $true
        }

        # Replace text-slate-300 with text-slate-800
        if ($line -match "text-slate-300") {
            $line = $line -replace "text-slate-300", "text-slate-800"
            $modified = $true
        }

        # Replace text-slate-400 with text-slate-800
        if ($line -match "text-slate-400") {
            $line = $line -replace "text-slate-400", "text-slate-800"
            $modified = $true
        }

        # Replace text-slate-500 with text-slate-800
        if ($line -match "text-slate-500") {
            $line = $line -replace "text-slate-500", "text-slate-800"
            $modified = $true
        }

        # Replace text-slate-600 with text-slate-800
        if ($line -match "text-slate-600") {
            $line = $line -replace "text-slate-600", "text-slate-800"
            $modified = $true
        }

        # Replace text-slate-700 with text-slate-800
        if ($line -match "text-slate-700") {
            $line = $line -replace "text-slate-700", "text-slate-800"
            $modified = $true
        }

        # Replace text-muted-foreground with text-gray-800
        if ($line -match "text-muted-foreground") {
            $line = $line -replace "text-muted-foreground", "text-gray-800"
            $modified = $true
        }

        # Replace placeholder text colors
        if ($line -match "placeholder-gray-400") {
            $line = $line -replace "placeholder-gray-400", "placeholder-gray-600"
            $modified = $true
        }

        if ($line -match "placeholder-gray-300") {
            $line = $line -replace "placeholder-gray-300", "placeholder-gray-600"
            $modified = $true
        }

        if ($line -match "placeholder-gray-500") {
            $line = $line -replace "placeholder-gray-500", "placeholder-gray-600"
            $modified = $true
        }

        # Add the modified or original line to the new content
        $newContent += $line
    }

    # Only write to file if changes were made
    if ($modified) {
        Set-Content -Path $filePath -Value $newContent
        Write-Host "Updated: $filePath"
    }
}

Write-Host "Text color update completed!"
