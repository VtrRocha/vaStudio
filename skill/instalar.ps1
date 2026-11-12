<#
  Instala a skill "va-studio" no Claude Code a partir deste repositório.
  Monta em %USERPROFILE%\.claude\skills\va-studio:
    SKILL.md
    assets\dist\vaStudio.pbiviz   (visual compilado)
    assets\exemplos\*.dax         (medidas de exemplo)
    assets\visual\                (código-fonte do visual, sem node_modules)
    references\ e scripts\        (só se existirem em skill\ neste repositório)

  O script NÃO apaga nada no destino. Ele confere todas as origens antes de
  copiar e só sobrescreve os arquivos que o repositório fornece. O que já
  estiver instalado e não existir aqui (por exemplo references\ e scripts\)
  continua onde está.

  Uso (na raiz do repositório):  .\skill\instalar.ps1
  Depois abra uma nova sessão do Claude Code. Para atualizar, rode de novo.
#>
param([string]$Destino = (Join-Path $env:USERPROFILE '.claude\skills\va-studio'))
$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent

# Origem (relativa à raiz do repositório) -> pasta de destino (relativa à skill).
# Pastas são copiadas inteiras para dentro da pasta de destino.
$itens = @(
    @{ De = 'skill\SKILL.md';       Para = '' }
    @{ De = 'dist\vaStudio.pbiviz'; Para = 'assets\dist' }
    @{ De = 'exemplos\*.dax';       Para = 'assets\exemplos' }
    @{ De = 'src';                  Para = 'assets\visual' }
    @{ De = 'style';                Para = 'assets\visual' }
    @{ De = 'assets';               Para = 'assets\visual' }
    @{ De = 'capabilities.json';    Para = 'assets\visual' }
    @{ De = 'pbiviz.json';          Para = 'assets\visual' }
    @{ De = 'package.json';         Para = 'assets\visual' }
    @{ De = 'package-lock.json';    Para = 'assets\visual' }
    @{ De = 'tsconfig.json';        Para = 'assets\visual' }
    @{ De = 'eslint.config.mjs';    Para = 'assets\visual' }
)
# Opcionais: entram só se alguém os tiver colocado em skill\ neste repositório.
foreach ($opcional in 'references', 'scripts') {
    if (Test-Path (Join-Path $PSScriptRoot $opcional)) {
        $itens += @{ De = "skill\$opcional"; Para = '' }
    }
}

# 1. Confere as origens ANTES de tocar no destino.
$faltando = @($itens | Where-Object { -not (Test-Path (Join-Path $raiz $_.De)) } | ForEach-Object { $_.De })
if ($faltando.Count -gt 0) {
    throw "Nada foi alterado em '$Destino'. Arquivos não encontrados no repositório: $($faltando -join ', ')"
}

# 2. Copia por cima, sem apagar o que já existe.
foreach ($item in $itens) {
    $pasta = if ($item.Para) { Join-Path $Destino $item.Para } else { $Destino }
    New-Item -ItemType Directory -Force $pasta | Out-Null
    Copy-Item -Path (Join-Path $raiz $item.De) -Destination $pasta -Recurse -Force
}

"Skill instalada em $Destino"
foreach ($opcional in 'references', 'scripts') {
    if (-not (Test-Path (Join-Path $Destino $opcional))) {
        "Aviso: a pasta '$opcional' não faz parte deste repositório e não existe no destino. A skill funciona sem ela, usando o SKILL.md e os exemplos."
    }
}
"Abra uma nova sessão do Claude Code e peça, por exemplo: 'crie um dashboard com HTML, CSS e JS para o painel X'."
