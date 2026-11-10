# 🚀 VA Studio — Visual Personalizado para Power BI (HTML, CSS & JavaScript)

Visual personalizado oficial (`.pbiviz`) para o **Power BI Desktop e Power BI Service** que renderiza telas completas em **HTML5 + CSS3 + JavaScript** a partir de uma medida DAX, com suporte a **filtro cruzado bidirecional com a página (`pbi.filtrar`)**, download de arquivos e **análise executiva com IA Gemini (`pbi.perguntarIA`)**.

---

## 📦 Como Instalar no Power BI em 1 Minuto

1. Baixe o arquivo compilado pronto para uso:
   👉 **[`dist/vaStudio.pbiviz`](dist/vaStudio.pbiviz)**
2. No **Power BI Desktop**, vá no painel de **Visualizações**:
   * Clique nos três pontinhos (**`...`**) > **Importar um visual de um arquivo**.
   * Selecione o arquivo `vaStudio.pbiviz`.
3. O ícone do **VA Studio** aparecerá no seu painel de visuais pronto para ser adicionado a qualquer página!

---

## 💡 Por que usar o VA Studio?

O visual nativo *HTML Content* da Microsoft exibe apenas HTML/CSS estático e **bloqueia totalmente scripts JavaScript**.

Com o **VA Studio**, sua medida DAX ganha vida e controle total da página:

| Funcionalidade | HTML Content Nativo | VA Studio |
| :--- | :---: | :---: |
| **Renderização HTML5 e CSS3 moderno** | ✅ | ✅ |
| **Execução de JavaScript (`<script>`)** | ❌ | ✅ |
| **Filtro Cruzado com o Relatório (`pbi.filtrar`)** | ❌ | ✅ |
| **Persistência de Seleção ao Atualizar (`pbi.estado`)** | ❌ | ✅ |
| **Exportação / Download de Arquivos (`pbi.baixar`)** | ❌ | ✅ |
| **Análise em Tempo Real com IA Gemini (`pbi.perguntarIA`)** | ❌ | ✅ |

---

## 🛠️ Como Utilizar em um Relatório

1. Crie uma **Medida DAX** que retorne uma string contendo seu HTML, CSS e JavaScript.
2. Adicione o visual **VA Studio** na página do relatório.
3. Arraste a sua medida para o campo **HTML** do visual.

---

## 📚 Biblioteca Global `pbi` (JavaScript)

Dentro da tag `<script>` da sua medida, o objeto global `pbi` já está disponível:

### 1. `pbi.filtrar(valores, tabela?, coluna?)`
Aplica filtro cruzado em todos os outros visuais da página do Power BI.
```javascript
// Filtra a dimensão dCliente pela coluna NomeCliente
pbi.filtrar(['Cliente Exemplo'], 'dCliente', 'NomeCliente');

// Filtro múltiplo
pbi.filtrar(['Região A', 'Região B'], 'dRegiao', 'NomeRegional');
```

### 2. `pbi.limpar()`
Remove o filtro aplicado pelo visual, restaurando o contexto original do relatório.
```javascript
pbi.limpar();
```

### 3. `pbi.estado`
Objeto de memória que sobrevive às atualizações de filtro do relatório (ideal para guardar itens selecionados ou paginação).
```javascript
// Salva o item selecionado
pbi.estado = { clienteSelecionado: 'Cliente ABC' };

// Ao recarregar a tela, lê o item gravado
var selecionado = pbi.estado.clienteSelecionado;
```

### 4. `pbi.baixar(conteudo, nomeArquivo, tipoMime?)`
Dispara o download nativo de arquivos no navegador do usuário.
```javascript
var csv = "Cliente;Venda\nCliente A;1500\nCliente B;2300";
pbi.baixar(csv, "relatorio-clientes.csv", "text/csv;charset=utf-8");
```

### 5. `pbi.perguntarIA(prompt, opcoes?)`
Consulta a IA Gemini em tempo real enviando os indicadores da página.
```javascript
pbi.perguntarIA("Analise estes indicadores e resuma os principais riscos: " + dadosContexto)
   .then(function(resposta) {
       document.getElementById('parecer').innerHTML = resposta;
   });
```

---

## 📁 Modelos Prontos para Copiar e Colar (`exemplos/`)

Na pasta **[`exemplos/`](exemplos/)** você encontra códigos DAX prontos:

* **[`01-card-kpi-executivo.dax`](exemplos/01-card-kpi-executivo.dax)**: Cartão executivo moderno com valor principal, meta, percentual de atingimento e barra de progresso responsiva.
* **[`02-tabela-com-busca-e-filtro.dax`](exemplos/02-tabela-com-busca-e-filtro.dax)**: Tabela interativa com campo de pesquisa em tempo real e clique na linha para filtrar a página do Power BI.
* **[`03-segmentador-botoes.dax`](exemplos/03-segmentador-botoes.dax)**: Segmentador de botões em pílula modernos para substituir segmentações padrão.
* **[`04-painel-analise-ia.dax`](exemplos/04-painel-analise-ia.dax)**: Painel executivo integrado ao Gemini para gerar parecer de negócio automático.

---

## ⚡ Regras de Ouro para Desenvolver Medidas no VA Studio

1. **Evite aspas duplas dentro do HTML/JS**: No DAX, utilize aspas simples (`'`) para atributos e strings JavaScript (ex.: `<div class='card'>` ou `var nome = 'teste'`). Isso evita conflito com as aspas do DAX.
2. **Encapsule o código JS em uma IIFE**:
   ```html
   <script>
   (function() {
       // Seu código aqui
   })();
   </script>
   ```
3. **Passe dados de forma segura**: Trate valores nulos ou vazios no DAX com `COALESCE(medida, 0)` ou `FORMAT(medida, "0")`.
4. **Envie resumos, não dados brutos**: O Power BI foi feito para resumir dados. Agrupe no DAX com `TOPN(50, SUMMARIZE(...))` em vez de enviar milhares de linhas para a tela.

---

## 💻 Para Desenvolvedores (Compilação do Código-Fonte)

Caso queira customizar o código-fonte TypeScript do visual:

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento (live reload)
npm start

# 3. Compilar novo pacote .pbiviz em dist/
npm run package
```

---

## 👤 Autor e Desenvolvimento
Criado e mantido por **Vitor Assunção Rocha** ([@VtrRocha](https://github.com/VtrRocha)).  
Desenvolvido para empoderar equipes de BI e Analytics com interfaces 100% livres, modernas e interativas no Power BI.

---

## 📄 Licença
Distribuído sob a licença **MIT**. Uso livre para projetos corporativos e relatórios analíticos.

