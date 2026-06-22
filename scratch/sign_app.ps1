# Generate self-signed code-signing certificate
$cert = New-SelfSignedCertificate -Type CodeSigning -Subject "CN=TypeMaster Local Dev" -FriendlyName "TypeMaster Development Certificate" -CertStoreLocation "Cert:\CurrentUser\My"

# Create scratch directory if not exists
if (!(Test-Path "scratch")) {
    New-Item -ItemType Directory -Force -Path "scratch"
}

# Export certificate to a local file
Export-Certificate -Cert $cert -FilePath "scratch\typeMasterDev.cer"

# Trust the certificate for current user (suppresses admin requirement)
Write-Host "Adding certificate to Trusted Root..."
certutil -user -addstore Root "scratch\typeMasterDev.cer"

Write-Host "Adding certificate to Trusted Publishers..."
certutil -user -addstore TrustedPublisher "scratch\typeMasterDev.cer"

# Sign the installer exe
Write-Host "Signing Installer..."
Set-AuthenticodeSignature -FilePath "dist-electron-v10\Master Typing Pro Setup 1.1.10.exe" -Certificate $cert

# Sign the unpacked exe
Write-Host "Signing Unpacked Executable..."
Set-AuthenticodeSignature -FilePath "dist-electron-v10\win-unpacked\Master Typing Pro.exe" -Certificate $cert

# Verify signature status
Write-Host "`nVerification Status:"
Get-AuthenticodeSignature "dist-electron-v10\Master Typing Pro Setup 1.1.10.exe"
