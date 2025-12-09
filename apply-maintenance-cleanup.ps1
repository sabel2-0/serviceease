# Apply Maintenance Services Table Cleanup Migration
# This script safely applies the database migration to clean up redundant columns

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Maintenance Services Table Cleanup Migration" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "cleanup_maintenance_services_table.sql")) {
    Write-Host "ERROR: Migration file not found!" -ForegroundColor Red
    Write-Host "Please run this script from the SE directory" -ForegroundColor Red
    exit 1
}

# Load environment variables
if (Test-Path "server\.env") {
    Write-Host "[1/6] Loading database configuration..." -ForegroundColor Yellow
    Get-Content "server\.env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
    Write-Host "      Database: $DB_NAME" -ForegroundColor Green
} else {
    Write-Host "ERROR: .env file not found in server directory!" -ForegroundColor Red
    exit 1
}

# Prompt for confirmation
Write-Host ""
Write-Host "[2/6] Pre-Migration Checklist:" -ForegroundColor Yellow
Write-Host "      [ ] Server is stopped (Ctrl+C in server terminal)" -ForegroundColor White
Write-Host "      [ ] Database backup exists" -ForegroundColor White
Write-Host "      [ ] You've reviewed the migration guide" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Continue with migration? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host ""
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

# Check if MySQL is accessible
Write-Host ""
Write-Host "[3/6] Checking MySQL connection..." -ForegroundColor Yellow
$mysqlTest = mysql -u $DB_USER -p$DB_PASSWORD -e "SELECT 1" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cannot connect to MySQL!" -ForegroundColor Red
    Write-Host "Please check your credentials in server\.env" -ForegroundColor Red
    exit 1
}
Write-Host "      MySQL connection successful" -ForegroundColor Green

# Create full database backup before migration
Write-Host ""
Write-Host "[4/6] Creating database backup..." -ForegroundColor Yellow
$backupFile = "serviceease_backup_before_cleanup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $backupFile
if ($LASTEXITCODE -eq 0) {
    Write-Host "      Backup saved: $backupFile" -ForegroundColor Green
} else {
    Write-Host "ERROR: Backup failed!" -ForegroundColor Red
    exit 1
}

# Apply the migration
Write-Host ""
Write-Host "[5/6] Applying migration..." -ForegroundColor Yellow
Write-Host "      This will:" -ForegroundColor White
Write-Host "      - Remove requester_id and related columns" -ForegroundColor White
Write-Host "      - Rename coordinator columns to institution_admin" -ForegroundColor White
Write-Host "      - Simplify status enum values" -ForegroundColor White
Write-Host "      - Add completion_photo column" -ForegroundColor White
Write-Host ""

Get-Content "cleanup_maintenance_services_table.sql" | mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME 2>&1 | Out-Host

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "      Migration applied successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "ERROR: Migration failed!" -ForegroundColor Red
    Write-Host "To rollback, run: mysql -u $DB_USER -p < $backupFile" -ForegroundColor Yellow
    exit 1
}

# Verify the changes
Write-Host ""
Write-Host "[6/6] Verifying migration..." -ForegroundColor Yellow
Write-Host ""
Write-Host "      Current table structure:" -ForegroundColor Cyan
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW COLUMNS FROM voluntary_services;" -t

Write-Host ""
Write-Host "      Data verification:" -ForegroundColor Cyan
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
SELECT 
    COUNT(*) as total_records,
    COUNT(approved_by_institution_admin) as with_approval,
    SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved,
    SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected
FROM voluntary_services;
" -t

# Success message
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Migration Completed Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review the verification results above" -ForegroundColor White
Write-Host "2. Update backend code (maintenance-services.js)" -ForegroundColor White
Write-Host "3. Update frontend code (if needed)" -ForegroundColor White
Write-Host "4. Test the maintenance services functionality" -ForegroundColor White
Write-Host "5. Start the server: cd server; node index.js" -ForegroundColor White
Write-Host ""
Write-Host "Backup saved at: $backupFile" -ForegroundColor Cyan
Write-Host "Read MAINTENANCE_SERVICES_CLEANUP_GUIDE.md for code update instructions" -ForegroundColor Cyan
Write-Host ""
