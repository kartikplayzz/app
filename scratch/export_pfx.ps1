# Find existing development certificate or create a new one
$cert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Subject -match "CN=TypeMaster Local Dev" } | Select-Object -First 1

if ($cert -eq $null) {
    Write-Host "Creating new certificate..."
    $cert = New-SelfSignedCertificate -Type CodeSigning -Subject "CN=TypeMaster Local Dev" -FriendlyName "TypeMaster Development Certificate" -CertStoreLocation "Cert:\CurrentUser\My"
} else {
    Write-Host "Found existing certificate: $($cert.Thumbprint)"
}

# Ensure scratch directory exists
if (!(Test-Path "scratch")) {
    New-Item -ItemType Directory -Force -Path "scratch"
}

# Export certificate to CER (for trusted root installation)
Export-Certificate -Cert $cert -FilePath "scratch\typeMasterDev.cer"

# Trust the certificate for current user (suppresses admin requirement)
Write-Host "Adding certificate to Trusted Root..."
certutil -user -addstore Root "scratch\typeMasterDev.cer"

Write-Host "Adding certificate to Trusted Publishers..."
certutil -user -addstore TrustedPublisher "scratch\typeMasterDev.cer"

# Export certificate to PFX with password for silent electron-builder signing
$pfxPassword = ConvertTo-SecureString "TypeMaster123" -AsPlainText -Force
$pfxPath = "scratch\typeMasterDev.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pfxPassword

Write-Host "PFX Certificate successfully exported to: $pfxPath"
