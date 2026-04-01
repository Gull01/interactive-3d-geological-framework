param(
    [Parameter(Mandatory = $false)]
    [string]$RepoName = "interactive-3d-geological-framework",

    [Parameter(Mandatory = $false)]
    [string]$GitHubOwner = ""
)

$ErrorActionPreference = 'Stop'

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is not installed or not on PATH. Install it first, then re-run this script."
    }
}

Assert-Command git
Assert-Command gh

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

if (-not (Test-Path ".git")) {
    git init
}

$gitStatus = git status --porcelain
if ($gitStatus) {
    git add -A
    git commit -m "Initial private publish"
}

try {
    gh auth status | Out-Null
} catch {
    throw "GitHub CLI is not authenticated. Run 'gh auth login' first."
}

if ([string]::IsNullOrWhiteSpace($GitHubOwner)) {
    $GitHubOwner = (gh api user --jq .login).Trim()
}

$fullRepoName = "$GitHubOwner/$RepoName"

if (-not (git remote | Select-String '^origin$')) {
    gh repo create $fullRepoName --private --source . --remote origin --push
} else {
    git remote set-url origin (gh repo view $fullRepoName --json url --jq .url)
    git push -u origin HEAD
}

Write-Host "Published to private repo: https://github.com/$fullRepoName"