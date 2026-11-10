---
name: powerbi-html-js-visual
description: Cria dashboards e visuais em HTML + CSS + JavaScript dentro do Power BI — medida DAX que devolve a página inteira (dados embutidos, estilos e script) renderizada pelo visual personalizado "HTML JS Studio" (.pbiviz), com interação de filtros (pbi.filtrar filtra os outros visuais da página), hover, clique, busca, ordenação e exportação. Inclui compilar o visual com pbiviz e validar a medida fora do Power BI (node --check + print no Edge). Use SEMPRE que o usuário pedir visual/dashboard/painel "com JS", "HTML, CSS e JS", "medida que gera HTML", "visual interativo em HTML", "clicar e filtrar a página", "tooltip/hover em visual HTML", "mapa de positivação", reclamar que o HTML Content não roda script, ou quiser adaptar o dashboard de campanhas para outro painel — mesmo sem citar o nome do visual.
---

# Visuais HTML + CSS + JS no Power BI

O Power BI não tem visual nativo que execute JavaScript. O **HTML Content** da AppSource mostra HTML e CSS, mas **ignora `<script>`**. O **HTML JS Studio** recebe uma medida de texto, injeta o HTML e executa os scripts. Toda a regra de negócio fica no DAX; o JS só desenha e cuida da interação.

Arquivos desta skill (leia conforme a necessidade):

| Arquivo | Quando ler |
|---|---|
| `references/visual.md` | Sempre que precisar da API `pbi` exposta ao JS. Também quando for compilar, alterar ou importar o visual, ou se o `.pbiviz` não existir na máquina. |
| `references/medida-html-js.md` | **Sempre**, antes de escrever a medida: padrões do bloco de dados, CSS, JS, regras de escape no DAX, performance e armadilhas. |
| `references/mapa.md` | Quando pedirem mapa, região, cidade, estado ou "positivação". Scripts em `scripts/mapa/` e modelo em `assets/dax/mapa-positivacao.dax`. |
| `assets/visual/` | Código-fonte completo do visual. |
| `assets/dax/ola-mundo.dax` | Menor exemplo funcional (KPI + botões que filtram). |
| `assets/dax/dashboard-campanhas.dax` | Dashboard testado: KPIs, calendário mensal, dias da semana, tabela com busca/ordenação/exportação e seleção que filtra a página. **Parta dele.** |
| `assets/dax/dashboard-campanhas-completo.dax` | Variante com barra superior, alternância Venda/Pedidos e comparativo semanal. |
| `scripts/preview.ps1` | Exporta a medida do Desktop aberto, checa a sintaxe do JS e tira print no Edge headless. |

## Fluxo

### 1. Conectar e ler o modelo
Use o MCP `powerbi-modeling-mcp`: `ListLocalInstances` → `Connect` → listar tabelas, colunas e medidas. **Nunca assuma nomes.** Verifique:
- **As colunas de data têm hora?** Teste com `COUNTROWS(FILTER(VALUES(col), col <> INT(col)))`. Se tiverem, crie uma coluna só com a data para agrupar por dia.
- **Volume:** linhas totais e itens distintos da dimensão principal. Com milhares de itens, a medida manda **resumos** (top N, últimos N dias), nunca linhas brutas.

Mudanças no modelo (uma coluna nova, por exemplo) não podem alterar números existentes. Compare um total antes e depois e diga ao usuário o que foi criado.

### 2. Garantir o visual
Procure um `**/dist/htmlJsStudio*.pbiviz`. Se não houver, compile a partir de `assets/visual/` com `npm ci` e `npm run package` (detalhes em `references/visual.md`). Mantenha o **mesmo GUID** para o Power BI tratar o pacote como o mesmo visual.

### 3. Planejar o painel com o usuário
Liste as perguntas de negócio que o painel responde e o que cada bloco mostra (KPIs, calendário, barras por dia da semana, tabela…). Defina:
- que coluna o clique vai filtrar: `pbi.filtrar([valor])`, com o padrão configurado em Formatar → Filtro, ou `pbi.filtrar([v],'tabela','coluna')`;
- o que é calculado no DAX (toda regra e agregação) e o que o JS faz (desenhar, alternar métrica, buscar, ordenar, destacar).

### 4. Escrever a medida
Copie a estrutura de `assets/dax/dashboard-campanhas.dax` e adapte (detalhes em `references/medida-html-js.md`):
1. **Dados:** `VAR _dados = "var D={...};"` montado com `CONCATENATEX`. Números com `FORMAT(COALESCE(x,0),"0")`, datas como `"yyyy-MM-dd"` e textos escapados (`\` e `'`).
2. **CSS:** `<style>` com variáveis em `:root`, grid de 12 colunas e `@media` para telas estreitas.
3. **HTML:** esqueleto com ids que o JS preenche.
4. **JS:** dentro de `(function(){ ... })();`, só com `var`/`function`. Strings com aspas simples e trechos HTML em template literals (crase). **Nenhuma aspa dupla.**
5. **Retorno:** `RETURN IF(ISBLANK(...), "<div>Sem dados...</div>", _css & _html & "<script>(function(){" & _dados & _js & "})();</script>")`.

Antes de criar, teste a parte de dados com `DEFINE MEASURE ... EVALUATE { [medida] }`, medindo o tamanho em caracteres e o tempo. Crie a medida com `description` e `displayFolder: "Visuais HTML"`.

### 5. Validar fora do Power BI
```powershell
& "<skill>\scripts\preview.ps1" -Porta <porta> -Medida "<nome>" -Pasta "<pasta com caminho longo>"
& "<skill>\scripts\preview.ps1" ... -Estado "{sel:'<item>'}" -Nome selecionado
```
Abra os `.png` e confira:
- a sintaxe está OK;
- os números batem com uma consulta DAX;
- o estado selecionado muda os KPIs e os destaques;
- nada aparece cortado.

Diga ao usuário o que foi validado no Edge e o que só se confirma no Desktop: a execução dentro do sandbox do visual e o filtro cruzado.

### 6. Entregar
- O caminho do `.pbiviz` e os passos: Visualizações → **…** → **Importar um visual de um arquivo** → adicionar **HTML JS Studio** → arrastar a medida para **HTML**.
- O que cada bloco mostra, como interagir e o que ficou pendente de regra de negócio.
- Lembrar o usuário de salvar o arquivo (Ctrl+S): medidas criadas via MCP só vão para o `.tmdl`/`.pbix` ao salvar.
- No Serviço, o administrador do tenant pode bloquear visuais que não são da AppSource.

## Problemas já vistos
| Sintoma | Causa | Correção |
|---|---|---|
| Hover/clique não funcionam | Visual HTML Content (não roda JS) | Usar o HTML JS Studio |
| Usuário procura visual com nome sugerido e não acha | Nome de visual da loja chutado | Não sugerir nomes de AppSource sem pesquisar |
| `SyntaxError` no 2º update | `let`/`const` no topo, script reexecutado | `var` + IIFE |
| Medida quebra ao colar | Aspas duplas no JS/HTML | Aspas simples + template literals |
| JS com `undefined`/vírgula sobrando | Valor em branco virou texto vazio | `FORMAT(COALESCE(x,0),"0")` |
| Medida lenta / gigante | Linhas brutas ou datetime com hora | Top N, janela de dias, coluna de data sem hora |
| Print do Edge não gerado | Caminho curto 8.3 | Passar caminho longo em `-Pasta` |
| Visual de altura fixa corta embaixo ou fica "em branco" no Power BI, mas passa no Edge | `height:100%` sem referência dentro de `.hjv-conteudo` | `#app{height:100vh;overflow:hidden}`, grid com `minmax(0,1fr)`, cards `min-height:0` e só a lista rolando. Testar com `preview.ps1`, que já simula a caixa do visual |
| MCP mostra modelo "antigo" depois que o usuário mexeu no Desktop | Cache de metadados da conexão MCP | Confirmar com ADOMD (`INFO.TABLES()`, `INFO.MEASURES()`) e procurar a medida em **todas** as tabelas |
| Script TOM/ADOMD quebra com conversão de tipo estranha | PowerShell não diferencia maiúsculas (`$p` sobrescreve `$P`) | Nomes de variável realmente distintos |
| Porta do Desktop "sumiu" | O arquivo foi fechado e reaberto, e a porta mudou | `ListLocalInstances` de novo |
| Print do Edge trava o comando | `Start-Process -Wait` espera os processos filhos do Edge | `-PassThru` + `WaitForExit(40000)` (já no `preview.ps1`) |
| Pedem filtro de data/região dentro do visual | O JS não recalcula top N/distintos para um intervalo livre | Preferir **segmentação nativa**. Botões pré-calculados no DAX só se pedirem explicitamente (ver `references/medida-html-js.md`) |
| Seleção some após atualizar | Estado guardado em variável local | Guardar em `pbi.estado` |
| Bloco mostra valor maior que o do item selecionado | O bloco continuava mostrando todos os itens | Série por item (`d:[[offset,v,p]]`) e `serie()` no JS |
| Pedem "baixar para Excel" | — | Janela de copiar/colar (TSV), com `pbi.baixar(csv, nome)` dentro dela; CSV com `;` + BOM |
| "Download indisponível — o administrador restringiu os downloads" | Opção do tenant "Permitir downloads de visuais personalizados" desligada | Pedir ao admin para ligar a opção (de preferência para um grupo). A janela de copiar continua como reserva |
| "O botão de download não funcionou" | Relatório ainda com o visual antigo | Reimportar o `.pbiviz` **e salvar**. Conferir `pbi.versao` |
