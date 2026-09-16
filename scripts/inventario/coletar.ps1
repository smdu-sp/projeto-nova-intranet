<#
.SYNOPSIS
  Coletor de inventário de TI (agentless). Descobre máquinas e coleta hardware/
  software via CIM/WinRM, enviando para a rota de ingestão do sistema.

.DESCRIPTION
  Fluxo:
    1. Monta a lista de alvos (-ComputerName, -FromAD ou -Local).
    2. Para cada host, abre uma CIM session (WinRM) e coleta os dados.
    3. Monta o payload JSON e faz POST em /api/inventario/coleta (header X-Api-Key).

  Use -Local para inventariar a PRÓPRIA máquina sem WinRM — ideal para testar o
  pipeline de ponta a ponta antes de liberar o remoting no parque.

.PARAMETER ApiUrl
  URL da rota de ingestão. Ex.: http://servidor-next:3000/api/inventario/coleta

.PARAMETER ApiKey
  Chave enviada no header X-Api-Key (== INV_COLETA_API_KEY no .env do servidor).

.PARAMETER ComputerName
  Lista explícita de hosts a coletar.

.PARAMETER FromAD
  Descobre os computadores via Active Directory (Get-ADComputer). Requer o
  módulo ActiveDirectory (RSAT).

.PARAMETER ADFilter
  Filtro do Get-ADComputer. Padrão: 'Enabled -eq $true'.

.PARAMETER Local
  Inventaria apenas a máquina local (sem WinRM).

.PARAMETER IncludeSoftware
  Também coleta a lista de softwares instalados (via registro). Mais lento.

.PARAMETER Credential
  Credencial para o WinRM remoto (conta de serviço com admin nas estações).

.EXAMPLE
  # Teste imediato: inventaria esta máquina e envia
  .\coletar.ps1 -ApiUrl http://localhost:3000/api/inventario/coleta -ApiKey "SUA_CHAVE" -Local -IncludeSoftware

.EXAMPLE
  # Coleta hosts específicos
  .\coletar.ps1 -ApiUrl http://srv:3000/api/inventario/coleta -ApiKey "X" -ComputerName PC-01,PC-02

.EXAMPLE
  # Descobre tudo do AD e coleta
  .\coletar.ps1 -ApiUrl http://srv:3000/api/inventario/coleta -ApiKey "X" -FromAD -IncludeSoftware
#>
[CmdletBinding(DefaultParameterSetName = 'Explicit')]
param(
  [Parameter(Mandatory = $true)] [string] $ApiUrl,
  [Parameter(Mandatory = $true)] [string] $ApiKey,

  [Parameter(ParameterSetName = 'Explicit')] [string[]] $ComputerName,
  [Parameter(ParameterSetName = 'AD')]       [switch]   $FromAD,
  [Parameter(ParameterSetName = 'AD')]       [string]   $ADFilter = 'Enabled -eq $true',
  [Parameter(ParameterSetName = 'Local')]    [switch]   $Local,
  [Parameter(ParameterSetName = 'Queue')]    [switch]   $FromQueue,

  [switch] $IncludeSoftware,
  [System.Management.Automation.PSCredential] $Credential
)

$ErrorActionPreference = 'Stop'

# Chassis (Win32_SystemEnclosure.ChassisTypes) -> tipo do nosso enum
function Get-TipoEquipamento([int[]] $chassis) {
  $c = if ($chassis) { $chassis[0] } else { 0 }
  switch ($c) {
    { $_ -in 8, 9, 10, 11, 12, 14, 18, 21, 31 } { return 'notebook' }
    { $_ -in 3, 4, 5, 6, 7, 15, 16, 35, 36 }    { return 'desktop' }
    { $_ -in 17, 23, 28 }                        { return 'servidor' }
    default                                      { return 'outro' }
  }
}

# Mapeia letra de unidade (C, D...) -> {Tipo, Modelo} do disco físico por trás dela.
# Usa Get-PhysicalDisk + Get-Partition (módulo Storage); em alguns hosts remotos via
# WinRM esse provider falha (exige DCOM) — nesse caso volta {} e os campos ficam nulos.
function Get-MapaTipoMidia($cimArgs) {
  $mapa = @{}
  try {
    $fisicos = Get-PhysicalDisk @cimArgs -ErrorAction Stop
    $particoes = Get-Partition @cimArgs -ErrorAction Stop
    foreach ($part in $particoes) {
      if (-not $part.DriveLetter) { continue }
      $disco = $fisicos | Where-Object { $_.DeviceId -eq [string]$part.DiskNumber } | Select-Object -First 1
      if ($disco) {
        $tipo = switch ("$($disco.MediaType)") {
          'SSD' { 'SSD' }
          'HDD' { 'HDD' }
          default { 'Desconhecido' }
        }
        $mapa["$($part.DriveLetter):"] = @{ Tipo = $tipo; Modelo = $disco.FriendlyName }
      }
    }
  }
  catch {
    # Sem suporte remoto (comum via WinRM) — segue sem tipo/modelo de mídia.
  }
  return $mapa
}

# Coleta softwares instalados via registro (evita Win32_Product, que é lento/perigoso)
function Get-SoftwaresInstalados($cim) {
  $paths = @(
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
  )
  $alvo = $cim.ComputerName
  $sb = {
    param($p)
    Get-ItemProperty $p -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName } |
      Select-Object DisplayName, DisplayVersion, Publisher
  }
  try {
    if ($alvo -eq $env:COMPUTERNAME -or $alvo -eq 'localhost') {
      $itens = & $sb $paths
    }
    else {
      $invoke = @{ ComputerName = $alvo; ScriptBlock = $sb; ArgumentList = (, $paths) }
      if ($Credential) { $invoke.Credential = $Credential }
      $itens = Invoke-Command @invoke
    }
    return @($itens | ForEach-Object {
        @{ nome = $_.DisplayName; versao = $_.DisplayVersion; fabricante = $_.Publisher }
      })
  }
  catch { return @() }
}

# Coleta um host e devolve o payload (ou $null se inacessível)
function Get-Payload([string] $maquina, [bool] $isLocal) {
  $sessArgs = @{}
  if (-not $isLocal) {
    $sessArgs.ComputerName = $maquina
    if ($Credential) { $sessArgs.Credential = $Credential }
  }
  $sess = if ($isLocal) { $null } else { New-CimSession @sessArgs }

  $cimArgs = @{}
  if ($sess) { $cimArgs.CimSession = $sess }

  try {
    $cs   = Get-CimInstance Win32_ComputerSystem @cimArgs
    $os   = Get-CimInstance Win32_OperatingSystem @cimArgs
    $cpu  = Get-CimInstance Win32_Processor @cimArgs | Select-Object -First 1
    $bios = Get-CimInstance Win32_BIOS @cimArgs
    $encl = Get-CimInstance Win32_SystemEnclosure @cimArgs | Select-Object -First 1
    $video = Get-CimInstance Win32_VideoController @cimArgs | Select-Object -First 1
    $board = Get-CimInstance Win32_BaseBoard @cimArgs | Select-Object -First 1
    $disks = Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' @cimArgs
    $mapaMidia = Get-MapaTipoMidia $cimArgs
    $net  = Get-CimInstance Win32_NetworkAdapterConfiguration -Filter 'IPEnabled=True' @cimArgs |
              Select-Object -First 1

    $ipv4 = $null
    if ($net.IPAddress) { $ipv4 = $net.IPAddress | Where-Object { $_ -notmatch ':' } | Select-Object -First 1 }

    $payload = @{
      tipo          = Get-TipoEquipamento $encl.ChassisTypes
      hostname      = $cs.Name
      dominio       = $cs.Domain
      fabricante    = $cs.Manufacturer
      modelo        = $cs.Model
      usuarioLogado = $cs.UserName
      numserie      = $bios.SerialNumber
      ip            = $ipv4
      mac           = $net.MACAddress
      so            = $os.Caption
      soVersao      = $os.Version
      soBuild       = $os.BuildNumber
      metodoColeta  = if ($isLocal) { 'manual' } else { 'winrm' }
      hardware      = @{
        cpuModelo  = $cpu.Name
        cpuNucleos = $cpu.NumberOfCores
        ramTotalMb = [math]::Round($cs.TotalPhysicalMemory / 1MB)
        placaMae   = "$($board.Manufacturer) $($board.Product)".Trim()
        bios       = $bios.SMBIOSBIOSVersion
        placaVideo = $video.Name
      }
      discos        = @($disks | ForEach-Object {
          $midia = $mapaMidia[$_.DeviceID]
          @{ modelo = $_.DeviceID
            tamanhoMb = [math]::Round($_.Size / 1MB)
            livreMb   = [math]::Round($_.FreeSpace / 1MB)
            tipoMidia = $midia.Tipo
            modeloFisico = $midia.Modelo }
        })
    }

    if ($IncludeSoftware) {
      $ctx = if ($isLocal) { @{ ComputerName = $env:COMPUTERNAME } } else { $sess }
      $payload.softwares = Get-SoftwaresInstalados $ctx
    }

    return $payload
  }
  finally {
    if ($sess) { Remove-CimSession $sess }
  }
}

# Coleta um host e faz POST na ingestão. Retorna $true/$false.
function Send-Coleta([string] $maquina, [bool] $isLocal) {
  try {
    $payload = Get-Payload $maquina $isLocal
    $json = $payload | ConvertTo-Json -Depth 6
    Invoke-RestMethod -Uri $ApiUrl -Method Post -Body $json `
      -ContentType 'application/json; charset=utf-8' `
      -Headers @{ 'X-Api-Key' = $ApiKey } | Out-Null
    return $true
  }
  catch {
    Write-Host "   $maquina FALHA: $($_.Exception.Message)" -ForegroundColor Yellow
    return $false
  }
}

# Expande um CIDR (ex.: 10.75.32.0/21) na lista de IPs de host, excluindo
# endereço de rede e broadcast. Prefixo entre /16 (65534 hosts) e /30, pra
# evitar um scan gigantesco por engano.
function Expand-Cidr([string] $cidr) {
  if ($cidr -notmatch '^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})/(\d{1,2})$') {
    throw "CIDR inválido: '$cidr' (use o formato 10.75.32.0/21)"
  }
  $octetos = 1..4 | ForEach-Object { [int]$matches[$_] }
  if ($octetos | Where-Object { $_ -gt 255 }) { throw "CIDR inválido: '$cidr'" }
  $prefixo = [int]$matches[5]
  if ($prefixo -lt 16 -or $prefixo -gt 30) {
    throw "Prefixo /$prefixo nao suportado, use entre /16 e /30 (ex.: 10.75.32.0/21)"
  }

  [uint32] $ip = 0
  foreach ($o in $octetos) { $ip = ($ip -shl 8) -bor [uint32] $o }
  [uint32] $mascara = [uint32]::MaxValue -shl (32 - $prefixo)
  [uint32] $rede = $ip -band $mascara
  [uint32] $broadcast = $rede -bor (-bnot $mascara)

  for ($atual = $rede + 1; $atual -lt $broadcast; $atual++) {
    $b = [BitConverter]::GetBytes([uint32] $atual)
    [Array]::Reverse($b)
    $b -join '.'
  }
}

# Ping assíncrono em paralelo — para sub-redes grandes (ex.: /21 = ~2000 IPs),
# testar sequencialmente levaria dezenas de minutos.
function Test-HostsAlive([string[]] $ips, [int] $timeoutMs = 500) {
  $sondas = $ips | ForEach-Object {
    $ping = [System.Net.NetworkInformation.Ping]::new()
    [PSCustomObject]@{ Ip = $_; Ping = $ping; Task = $ping.SendPingAsync($_, $timeoutMs) }
  }
  [System.Threading.Tasks.Task]::WaitAll(@($sondas.Task))
  foreach ($s in $sondas) {
    if ($s.Task.Result.Status -eq 'Success') { $s.Ip }
    $s.Ping.Dispose()
  }
}

# Resolve hostname (DNS reverso) para IPs vivos, em paralelo. WinRM por IP puro
# exige TrustedHosts (NTLM); indo por hostname, Kerberos autentica sozinho em
# domínio. Sem PTR no DNS, cai de volta pro IP.
function Resolve-Hostnames([string[]] $ips, [int] $timeoutMs = 8000) {
  $tarefas = $ips | ForEach-Object {
    [PSCustomObject]@{ Ip = $_; Task = [System.Net.Dns]::GetHostEntryAsync($_) }
  }
  # WaitAll lança AggregateException se qualquer tarefa falhar (comum: IP sem
  # PTR no DNS) — ignora, o status de cada tarefa é checado individualmente abaixo.
  try { [System.Threading.Tasks.Task]::WaitAll(@($tarefas.Task), $timeoutMs) | Out-Null } catch {}
  $mapa = @{}
  foreach ($t in $tarefas) {
    $mapa[$t.Ip] = if ($t.Task.IsCompleted -and $t.Task.Status -eq 'RanToCompletion' -and $t.Task.Result.HostName) {
      $t.Task.Result.HostName
    }
    else {
      $t.Ip
    }
  }
  return $mapa
}

# Consome a fila de solicitações de coleta (modo -FromQueue).
function Invoke-Fila {
  $base = $ApiUrl -replace '/coleta/?$', ''
  $hdr = @{ 'X-Api-Key' = $ApiKey }

  $pend = @(Invoke-RestMethod -Uri "$base/buscas/pendentes" -Headers $hdr -Method Get)
  Write-Host "Fila: $($pend.Count) solicitação(ões) pendente(s)" -ForegroundColor Cyan

  foreach ($s in $pend) {
    $patch = "$base/buscas/$($s.id)"
    try {
      Invoke-RestMethod -Uri $patch -Method Patch -Headers $hdr `
        -ContentType 'application/json' -Body (@{ status = 'processando' } | ConvertTo-Json) | Out-Null

      if ($s.tipoAlvo -eq 'subrede') {
        $candidatos = @(Expand-Cidr $s.alvo)
        Write-Host "  #$($s.id) [$($s.alvo)] varrendo $($candidatos.Count) IP(s)..." -ForegroundColor DarkGray
        $ipsVivos = @(Test-HostsAlive $candidatos)
        Write-Host "  #$($s.id) [$($s.alvo)] $($ipsVivos.Count) IP(s) vivos, resolvendo hostname..." -ForegroundColor DarkGray
        $mapaHost = Resolve-Hostnames $ipsVivos
        $alvos = @($ipsVivos | ForEach-Object { $mapaHost[$_] })
      }
      else {
        $alvos = @($s.alvo)
      }

      $enviados = 0; $vivos = $alvos.Count
      foreach ($m in $alvos) {
        # Alvo que é a própria máquina do coletor -> coleta local (sem WinRM).
        $isLocal = ($s.tipoAlvo -eq 'host') -and
          ($m -in @('localhost', '127.0.0.1', $env:COMPUTERNAME, "$env:COMPUTERNAME.$env:USERDNSDOMAIN"))
        if (Send-Coleta $m $isLocal) { $enviados++ }
      }

      $resumo = "$enviados de $vivos host(s) coletado(s)"
      Invoke-RestMethod -Uri $patch -Method Patch -Headers $hdr `
        -ContentType 'application/json' -Body (@{ status = 'concluida'; resultado = $resumo } | ConvertTo-Json) | Out-Null
      Write-Host "  #$($s.id) [$($s.alvo)] -> $resumo" -ForegroundColor Green
    }
    catch {
      $err = $_.Exception.Message
      try {
        Invoke-RestMethod -Uri $patch -Method Patch -Headers $hdr `
          -ContentType 'application/json' -Body (@{ status = 'erro'; resultado = $err } | ConvertTo-Json) | Out-Null
      }
      catch {}
      Write-Host "  #$($s.id) [$($s.alvo)] FALHA: $err" -ForegroundColor Yellow
    }
  }
}

# --- Fluxo principal ---
if ($PSCmdlet.ParameterSetName -eq 'Queue') {
  Invoke-Fila
}
else {
  $alvos = @()
  switch ($PSCmdlet.ParameterSetName) {
    'Local'    { $alvos = @($env:COMPUTERNAME) }
    'AD'       {
      Import-Module ActiveDirectory
      $alvos = (Get-ADComputer -Filter $ADFilter -Properties Name | Select-Object -Expand Name)
    }
    'Explicit' {
      if (-not $ComputerName) { throw 'Informe -ComputerName, -FromAD, -Local ou -FromQueue.' }
      $alvos = $ComputerName
    }
  }

  Write-Host "Alvos: $($alvos.Count) máquina(s)" -ForegroundColor Cyan

  $isLocal = ($PSCmdlet.ParameterSetName -eq 'Local')
  $ok = 0; $falhas = 0
  foreach ($maquina in $alvos) {
    Write-Host "-> $maquina ..." -NoNewline
    if (Send-Coleta $maquina $isLocal) {
      Write-Host ' OK' -ForegroundColor Green
      $ok++
    }
    else { $falhas++ }
  }

  Write-Host "`nConcluído: $ok enviados, $falhas falhas." -ForegroundColor Cyan
}
