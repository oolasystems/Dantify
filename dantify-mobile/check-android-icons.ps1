Write-Host "`nChecking Android launcher resources..." -ForegroundColor Cyan

Get-ChildItem .\android\app\src\main\res -Recurse -File |
Where-Object {
    $_.FullName -match "mipmap|drawable" -and
    $_.Name -match "ic_launcher|launcher"
} |
Select-Object FullName, Length |
Format-Table -AutoSize

Write-Host "`nChecking Android Manifest..." -ForegroundColor Cyan

Get-Content .\android\app\src\main\AndroidManifest.xml