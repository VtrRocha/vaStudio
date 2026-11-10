<#
  Instala a skill "powerbi-html-js-visual" no Claude Code a partir deste repositório.
  Monta a pasta da skill em %USERPROFILE%\.claude\skills\powerbi-html-js-visual com:
    SKILL.md, references\ (docs), assets\visual (código do visual), assets\dax, assets\mapa e scripts\.

  Uso (na raiz do repositório):  .\claude-skill\instalar.ps1
  Depois abra uma nova sessão do Claude Code. Para atualizar, rode de novo.
#>
param([string]$Destino = (Join-Path $env:USERPROFILE '.claude\skills\powerbi-html-js-visual'))
$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent

if (Test-Path $Destino) { Remove-Item $Destino -Recurse -Force }
$pastas = 'references', 'assets\visual\src', 'assets\visual\style', 'assets\visual\assets', 'assets\dax', 'assets\mapa', 'scripts\mapa'
foreach ($p in $pastas) { New-Item -ItemType Directory -Force (Join-Path $Destino $p) | Out-Null }

Copy-Item (Join-Path $PSScriptRoot 'SKILL.md') $Destino
Copy-Item (Join-Path $raiz 'docs\*.md') (Join-Path $Destino 'references')
foreach ($f in 'capabilities.json', 'pbiviz.json', 'package.json', 'package-lock.json', 'tsconfig.json', 'eslint.config.mjs') {
    Copy-Item (Join-Path $raiz "visual\$f") (Join-Path $Destino 'assets\visual')
}
Copy-Item (Join-Path $raiz 'visual\src\*') (Join-Path $Destino 'assets\visual\src')
Copy-Item (Join-Path $raiz 'visual\style\*') (Join-Path $Destino 'assets\visual\style')
Copy-Item (Join-Path $raiz 'visual\assets\*') (Join-Path $Destino 'assets\visual\assets')
Copy-Item (Join-Path $raiz 'examples\dax\*.dax') (Join-Path $Destino 'assets\dax')
Copy-Item (Join-Path $raiz 'examples\mapa\*') (Join-Path $Destino 'assets\mapa')
Copy-Item (Join-Path $raiz 'scripts\preview.ps1') (Join-Path $Destino 'scripts')
Copy-Item (Join-Path $raiz 'scripts\mapa\*') (Join-Path $Destino 'scripts\mapa')

"Skill instalada em $Destino"
"Abra uma nova sessão do Claude Code e peça, por exemplo: 'crie um dashboard com HTML, CSS e JS para o painel X'."
