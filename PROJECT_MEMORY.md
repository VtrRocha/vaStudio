# Memória Contínua do Projeto: VA Studio

## 📌 Objetivo Central
> Visual personalizado oficial para o Power BI Desktop e Power BI Service (**VA Studio**) que renderiza interfaces completas em **HTML5 + CSS3 + JavaScript** a partir de medidas DAX, com suporte a **filtro cruzado bidirecional com a página (`pbi.filtrar`)**, download nativo de arquivos (`pbi.baixar`), persistência de seleções (`pbi.estado`) e **análise executiva automatizada com IA Gemini em tempo real (`pbi.perguntarIA`)**.

## 🛠 Decisões Técnicas e Regras de Negócio
- **Compatibilidade e GUID:** Mantido o GUID `htmlJsStudioECDA55D8A9E74168A5FFE5D14050141E` no `pbiviz.json` para que relatórios já desenvolvidos possam atualizar para o VA Studio sem perder vínculos de visual.
- **Execução Dinâmica de Script:** Scripts recebidos via DAX são desmembrados e recriados via `document.createElement('script')`, contornando o bloqueio padrão do Power BI em `innerHTML`.
- **Isolamento e Segurança de Sintaxe:** Todo o JavaScript DAX deve ser encapsulado em IIFE `(function(){ ... })();` utilizando exclusivamente `var` e `function` para evitar erros de redeclaração (`SyntaxError`) ao atualizar filtros.
- **Convenção de Strings no DAX:** Proibido uso de aspas duplas no corpo JS/HTML da medida; strings usam aspas simples (`'`) e blocos dinâmicos usam template literals (crase `` ` ``).
- **Tratamento de Números e Nulos:** Valores numéricos enviados ao JS são obrigatoriamente protegidos com `FORMAT(COALESCE(x, 0), "0")` ou `"0.00"` para evitar quebras por valores em branco.
- **Integração com IA (Google Gemini):** Acesso à API do Gemini via `pbi.perguntarIA()`, configurável no painel Formatar (chave direta ou proxy corporativo), com failover automático entre modelos flash, supressão de raciocínio longo (`thinkingLevel: "LOW"`) e métricas de telemetria em `pbi.usoIA`.
- **Validação Automatizada:** Teste e renderização headless via `scripts/preview.ps1` com checagem de sintaxe (`node --check`) e captura de tela pelo Microsoft Edge.

## 📝 Changelog / Registro de Evoluções
- **10/11/2026**: Inicialização do repositório `vaStudio`, compilação da versão 1.1.0 (`dist/vaStudio.pbiviz`), organização da biblioteca de exemplos DAX (`exemplos/01` a `04`) e documentação oficial (`README.md`).
- **10/11/2026**: Adição da pasta de skill original (`skill`) do visual, mantendo a estrutura original (`instalar.ps1` e `SKILL.md`).

