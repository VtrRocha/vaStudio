---
name: va-studio
description: Cria dashboards e visuais modernos em HTML5 + CSS3 + JavaScript dentro do Power BI — medida DAX que devolve a interface completa renderizada pelo visual personalizado "VA Studio" (.pbiviz), com suporte a filtro cruzado bidirecional com a página (pbi.filtrar), persistência de seleção (pbi.estado), download de relatórios/arquivos (pbi.baixar) e análise executiva em tempo real com IA Gemini (pbi.perguntarIA). Use SEMPRE que o usuário pedir visuais/dashboards interativos em HTML/JS, filtros por clique, tabelas interativas com busca/ordenação, segmentadores em botões, cartões KPI modernos ou inteligência artificial embutida no visual.
---

# 🚀 VA Studio — Visuais HTML5 + CSS3 + JS no Power BI

O Power BI não tem visual nativo que execute JavaScript. O *HTML Content* (visual de terceiros, da AppSource) mostra HTML e CSS, mas não executa `<script>`. O **VA Studio** recebe uma medida DAX de texto, injeta o HTML/CSS e executa o JavaScript com acesso à API global `pbi`. Toda a regra de negócio e agregação de dados fica no DAX; o JS cuida da renderização, animações e interações.

Arquivos desta skill:

| Arquivo | Finalidade |
|---|---|
| `assets/dist/vaStudio.pbiviz` | Visual compilado, pronto para importar no Power BI. |
| `assets/visual/` | Código-fonte do visual (TypeScript), para recompilar ou alterar. |
| `assets/exemplos/01-card-kpi-executivo.dax` | Cartão executivo moderno com valor, meta, % atingimento e barra de progresso responsiva. |
| `assets/exemplos/02-tabela-com-busca-e-filtro.dax` | Tabela interativa com busca em tempo real e clique para filtro cruzado na página. |
| `assets/exemplos/03-segmentador-botoes.dax` | Segmentador em estilo pílula/botões para substituir segmentações padrão do Power BI. |
| `assets/exemplos/04-painel-analise-ia.dax` | Painel executivo integrado ao Gemini para gerar pareceres automatizados em tempo real. |

Os exemplos usam nomes de um modelo fictício. O bloco **O QUE TROCAR** no topo de cada um lista o que substituir pelos nomes do modelo do usuário.

Arquivos opcionais, que **não fazem parte do repositório público** e só existem em instalações com o pacote completo. Confira se a pasta existe antes de citar ou usar; se não existir, siga só com este arquivo e os exemplos:

| Arquivo | Finalidade |
|---|---|
| `references/visual.md` | API global `pbi` em detalhe, arquitetura do visual, empacotamento com `pbiviz` e configuração de cards. |
| `references/medida-html-js.md` | Padrões do bloco de dados DAX, CSS, regras de escape (sem aspas duplas no JS), performance e boas práticas. |
| `references/ia-gemini.md` | Guia de integração do visual com a API do Google Gemini (`pbi.perguntarIA`). |
| `references/mapa.md` | Guia para mapas de positivação (SVG do Brasil/estados, cidades e coordenadas). |
| `scripts/preview.ps1` | Valida a sintaxe do JS com `node --check` e gera print no Edge headless direto da porta do Power BI Desktop. |

---

## 🛠️ Fluxo de Trabalho Recomendado

### 1. Conectar e Inspecionar o Modelo de Dados
- Use o MCP `powerbi-modeling-mcp` (`ListLocalInstances` → `Connect`) ou ferramentas locais (DAX Studio / ADOMD) para inspecionar tabelas, colunas e medidas. **Nunca assuma nomes.**
- **Datas:** Verifique se as colunas de data contêm hora (`COUNTROWS(FILTER(VALUES(col), col <> INT(col)))`). Se sim, use uma coluna de data pura para agrupamentos.
- **Volume:** Em bases com milhares de registros, nunca envie linhas brutas no DAX. Envie **resumos** (Top N, agregações por período, totais).

### 2. Garantir o Visual no Relatório
- O visual compilado está em `assets/dist/vaStudio.pbiviz`.
- Caso precise recompilar: em `assets/visual/`, execute `npm ci` e depois `npm run package`. Mantenha o mesmo GUID no `pbiviz.json` para o Power BI tratar o pacote como o mesmo visual.

### 3. Planejar a Medida DAX
Defina com clareza:
- Quais indicadores e tabelas serão agregados no DAX.
- Qual coluna será filtrada no clique: `pbi.filtrar([valor], 'tabela', 'coluna')`.
- O que o JS executará: renderizar cards, filtrar localmente via busca, ordenar, disparar download ou acionar IA.

### 4. Escrever a Medida DAX
Siga a estrutura padrão:
1. **Cálculos/Agregações:** Variáveis com `SUM`, `CALCULATE`, `TOPN`, etc.
2. **Dados (`VAR _dados`):** `"var D={k:{...},t:[...]};"` montado com `CONCATENATEX`. Números sempre com `FORMAT(COALESCE(x,0),"0")` ou `"0.00"`. Datas em formato ISO `"yyyy-MM-dd"`. Textos escapados com `SUBSTITUTE`.
3. **Estilos (`VAR _css`):** `<style>` com variáveis CSS em `:root`, layout flex/grid responsivo.
4. **Estrutura (`VAR _html`):** Tags HTML com IDs semânticos para o JS preencher.
5. **Script (`VAR _js`):** Função autoexecutável `(function(){ ... })();`, **apenas com `var` e `function`**. Use aspas simples (`'`) e template literals (`` ` ``) para strings e HTML. **Nunca use aspas duplas no JS** para não conflitar com a string do DAX.
6. **Retorno:**
   ```dax
   RETURN IF(
       ISBLANK([TotalPrincipal]),
       "<div class='vazio'>Sem dados para o filtro selecionado.</div>",
       _css & _html & "<script>(function(){" & _dados & _js & "})();</script>"
   )
   ```

**Escape os textos do modelo.** Texto de coluna dentro de uma string JS passa por `SUBSTITUTE(SUBSTITUTE(SUBSTITUTE([Texto], "\", "\\"), "'", "\'"), "<", "\x3C")`. Texto que vai para a tela usa `textContent`, ou uma função `escapar()` antes do `innerHTML` (veja os exemplos 02 e 04). Sem isso, um valor do banco quebra o script ou vira código dentro do visual.

**Barra invertida no DAX não é escape.** O texto vai para o JS exatamente como foi escrito: uma quebra de linha em regex é `/\n/g`, e `/\\n/g` procura uma barra seguida de "n". O único escape do DAX é `""` para uma aspa dupla.

### 5. Validar fora do Power BI (opcional)
Só se `scripts/preview.ps1` existir nesta instalação:
```powershell
& "<skill>\scripts\preview.ps1" -Porta <porta> -Medida "NomeDaMedida" -Pasta "C:\temp\preview"
```
Confira os logs de sintaxe e o arquivo `.png` gerado. Sem o script, extraia o conteúdo do `<script>` e valide com `node --check`.

### 6. Como Adicionar ao Relatório
1. No Power BI Desktop, vá no painel **Visualizações** → clique nos três pontinhos (**`...`**) → **Importar um visual de um arquivo**.
2. Selecione o arquivo `vaStudio.pbiviz`.
3. Adicione o visual **VA Studio** à página e arraste a medida criada para o campo **HTML**.
4. Lembre o usuário de salvar o arquivo (Ctrl+S): medidas criadas via MCP só vão para o `.pbix` ao salvar.

---

## 📚 API Global `pbi` (Disponível no JavaScript)

Dentro da tag `<script>` da medida, use o objeto `pbi` (ou fallback seguro `var api = window.pbi || { estado: {}, filtrar: function(){}, limpar: function(){} };`):

- **`pbi.filtrar(valores, tabela?, coluna?)`**: Aplica filtro cruzado no relatório (ex: `pbi.filtrar(['Sudeste'], 'dRegiao', 'NomeRegiao')`). Sem `tabela` e `coluna`, usa o que estiver em **Formatar > Filtro**, que vem vazio: passe sempre os dois argumentos ou oriente o usuário a preencher os campos.
- **`pbi.limpar()`**: Remove o filtro cruzado aplicado pelo visual.
- **`pbi.estado`**: Objeto para persistir seleções, abas ou busca entre atualizações de filtro do relatório.
- **`pbi.baixar(conteudo, nomeArquivo, tipo?)`**: Salva um arquivo pelo serviço de download do Power BI. `tipo` é o tipo de arquivo (`'csv'` é o padrão; também `'txt'`, `'json'`), **não** um MIME type. Devolve `Promise<boolean>`: `false` quando o download foi bloqueado ou cancelado, então ofereça sempre uma alternativa de copiar e colar.
- **`pbi.perguntarIA(prompt, opcoes?)`**: Chama a IA Gemini com os dados resumidos do visual e devolve `Promise<string>`. Exige a chave da API em **Formatar > IA (Gemini)**; sem ela a Promise é rejeitada. A resposta é texto com markdown: escape o HTML antes de usar `innerHTML` (veja o exemplo 04).
- **`pbi.iaConfigurada()`**: Retorna `true` se houver chave ou endpoint de IA configurado no painel Formatar.
- **`pbi.versao`**: Versão do visual carregado no relatório.
- **`pbi.largura` / `pbi.altura`**: Dimensões atuais do visual em pixels.
- **`pbi.aoRedimensionar(callback)`**: Registra callback disparado ao redimensionar o visual.

A chave do Gemini fica gravada no relatório e é enviada pelo navegador de quem o abre. Para relatórios compartilhados, recomende o campo **Endpoint Customizado** (um proxy do usuário que guarda a chave no servidor).

---

## ⚠️ Diagnóstico e Solução de Problemas

| Sintoma | Causa Comum | Solução Recomendada |
|---|---|---|
| Clique/Hover não funcionam | Usuário está usando o visual *HTML Content*, que não roda JS | Substituir pelo **VA Studio** (`vaStudio.pbiviz`). |
| Erro `SyntaxError` ao filtrar/atualizar | Uso de `let` ou `const` no topo do script | Usar sempre `var` encapsulado dentro de IIFE `(function(){ ... })();`. |
| Medida quebra ao colar no Power BI | Uso de aspas duplas `"` dentro do JS/HTML | Substituir por aspas simples `'` ou crases de template literal `` ` ``. |
| Números aparecem como `NaN` ou quebram o JS | Valor em branco do DAX virou string vazia | Sempre tratar números com `FORMAT(COALESCE(x,0),"0")`. |
| Medida lenta ou excedendo tamanho | Envio de linhas detalhadas em vez de resumos | Utilizar `TOPN`, agregações por período e manter caracteres em dezenas de milhares. |
| Layout de altura fixa corta ou fica em branco | Uso de `height: 100%` sem referência de pai | Usar `#app { height: 100vh; overflow: hidden; }` e containers com `min-height: 0;`. |
| "Filtro não configurado" | `pbi.filtrar(valores)` sem tabela/coluna e campos de Formatar > Filtro vazios | Passar `'tabela', 'coluna'` no JS ou preencher Formatar > Filtro. |
| "Chave da API do Gemini não configurada" | Campo Formatar > IA (Gemini) > Chave da API vazio | Colar a chave no painel Formatar ou configurar o Endpoint Customizado. |
| Texto da IA num bloco só, com `**` à mostra | Regex `/\\n/g` (barra dupla) e markdown não convertido | Usar `/\n/g` e converter `**negrito**`, como no exemplo 04. |
| `pbi.baixar` devolve `false` | Tipo passado como MIME (`text/csv`), download bloqueado pelo administrador ou cancelado | Passar `'csv'`; no Serviço, pedir ao admin a opção "Permitir downloads de visuais personalizados". |
