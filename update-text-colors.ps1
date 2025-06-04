# Script to update light text colors to darker ones for better visibility

# Update table headers
Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    
    # Update table headers from text-gray-500 to text-gray-700
    $updatedContent = $content -replace 'bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500', 'bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-700'
    
    # Update text-gray-300 to text-gray-600
    $updatedContent = $updatedContent -replace 'text-gray-300', 'text-gray-600'
    
    # Update text-gray-400 to text-gray-600
    $updatedContent = $updatedContent -replace 'text-gray-400', 'text-gray-600'
    
    # Update text-slate-300 to text-slate-600
    $updatedContent = $updatedContent -replace 'text-slate-300', 'text-slate-600'
    
    # Update text-slate-400 to text-slate-600
    $updatedContent = $updatedContent -replace 'text-slate-400', 'text-slate-600'
    
    # Update placeholder text colors
    $updatedContent = $updatedContent -replace 'placeholder-gray-400', 'placeholder-gray-600'
    $updatedContent = $updatedContent -replace 'placeholder-gray-300', 'placeholder-gray-600'
    
    # Only write to file if changes were made
    if ($content -ne $updatedContent) {
        Set-Content -Path $_.FullName -Value $updatedContent
        Write-Host "Updated: $($_.FullName)"
    }
}

Write-Host "Text color update completed!"
