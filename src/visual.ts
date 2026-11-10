"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import FilterAction = powerbi.FilterAction;

import { VisualFormattingSettingsModel } from "./settings";

export interface OpcoesIA {
    dados?: any;
    instrucao?: string;
    modelo?: string;
    apiKey?: string;
    endpoint?: string;
    temperatura?: number;
    json?: boolean;
}

/**
 * Visual que renderiza o HTML devolvido por uma medida e executa os <script> dele.
 * O JS da medida recebe o objeto global `pbi` para conversar com o Power BI:
 *   pbi.filtrar(valores, tabela?, coluna?)       -> filtra os outros visuais (como uma segmentação)
 *   pbi.limpar()                                 -> remove o filtro aplicado por este visual
 *   pbi.baixar(conteudo, nome, tipo?)            -> salva um arquivo (csv/txt/json...) via serviço de download do Power BI
 *   pbi.perguntarIA(prompt, opcoesOuContexto?)   -> consulta a API do Gemini (com retry/fallback automático) e devolve Promise<string>
 *   pbi.iaConfigurada()                          -> true se houver chave/endpoint configurado em Formatar > IA (Gemini)
 *   pbi.usoIA                                    -> telemetria de consumo de tokens e requisições por modelo
 *   pbi.aoRedimensionar(fn)                      -> registra callback único para resize
 *   pbi.estado                                   -> objeto que sobrevive entre atualizações
 *   pbi.largura / pbi.altura                     -> tamanho atual do visual
 *   evento "pbi-resize" na window                -> disparado quando o visual muda de tamanho
 */
export class Visual implements IVisual {
    private host!: IVisualHost;
    private events!: IVisualEventService;
    private target!: HTMLElement;
    private ultimoHtml: string | null = null;
    private resizeCallback: (() => void) | null = null;
    private formattingSettings!: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    constructor(options?: VisualConstructorOptions) {
        if (options) {
            this.host = options.host;
            this.events = options.host.eventService;
            this.target = options.element;
            this.target.classList.add("hjv-root");
        }
        this.formattingSettingsService = new FormattingSettingsService();
        this.exporApi();
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);
        try {
            const dataView = options.dataViews && options.dataViews[0];
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);

            const api = this.api();
            api.largura = options.viewport.width;
            api.altura = options.viewport.height;

            const valor = dataView && dataView.single ? dataView.single.value : null;
            const html = valor === null || valor === undefined ? "" : String(valor);

            if (!html) {
                this.ultimoHtml = null;
                this.resizeCallback = null;
                // eslint-disable-next-line powerbi-visuals/no-inner-outer-html -- texto fixo do próprio visual
                this.target.innerHTML = "<div class='hjv-vazio'>Arraste para <b>HTML</b> uma medida que retorne HTML (com CSS e JS).</div>";
            } else if (html !== this.ultimoHtml) {
                this.ultimoHtml = html;
                this.renderizar(html);
            } else {
                // Mesmo HTML: só avisa o JS da medida que o tamanho mudou.
                if (typeof this.resizeCallback === "function") {
                    try {
                        this.resizeCallback();
                    } catch (err) {
                        this.mostrarErro("Erro no resize da medida", err);
                    }
                }
                window.dispatchEvent(new Event("pbi-resize"));
            }

            this.events.renderingFinished(options);
        } catch (error) {
            this.mostrarErro("Erro ao atualizar o visual", error);
            this.events.renderingFailed(options, String(error));
        }
    }

    private renderizar(html: string) {
        this.resizeCallback = null;
        const container = document.createElement("div");
        container.className = "hjv-conteudo";
        // eslint-disable-next-line powerbi-visuals/no-inner-outer-html -- injetar o HTML da medida é a função do visual (ver SECURITY.md)
        container.innerHTML = html;

        // Scripts inseridos via innerHTML não rodam: separa e executa depois que o HTML estiver na tela.
        const scripts = Array.from(container.querySelectorAll("script"));
        scripts.forEach(s => s.parentNode?.removeChild(s));

        // eslint-disable-next-line powerbi-visuals/no-inner-outer-html -- apenas limpa o conteúdo anterior
        this.target.innerHTML = "";
        this.target.appendChild(container);

        scripts.forEach(antigo => {
            const novo = document.createElement("script");
            Array.from(antigo.attributes).forEach(a => novo.setAttribute(a.name, a.value));
            novo.text = antigo.text;
            try {
                container.appendChild(novo);
            } catch (error) {
                this.mostrarErro("Erro no JavaScript da medida", error);
            }
        });
    }

    private api(): any {
        return (window as any).pbi;
    }

    private exporApi() {
        const visual = this;
        const anterior = (window as any).pbi;
        const usoInicial = anterior && anterior.usoIA ? anterior.usoIA : {
            ultimoPromptTokens: 0,
            ultimoOutputTokens: 0,
            ultimoTotalTokens: 0,
            tokensAcumulados: 0,
            orcamentoTokensSessao: 100000,
            requisicoesTotal: 0,
            modelos: {},
            alertaNivel: "ok",
            alertaMensagem: ""
        };
        (window as any).pbi = {
            versao: "1.1.0.0",
            estado: anterior && anterior.estado ? anterior.estado : {},
            usoIA: usoInicial,
            largura: 0,
            altura: 0,
            filtrar(valores: any[] | null, tabela?: string, coluna?: string) {
                visual.aplicarFiltro(valores, tabela, coluna);
            },
            limpar() {
                visual.aplicarFiltro(null);
            },
            abrirLink(url: string) {
                visual.host.launchUrl(url);
            },
            baixar(conteudo: string, nome: string, tipo?: string, descricao?: string) {
                return visual.baixar(conteudo, nome, tipo || "csv", descricao || nome);
            },
            aoRedimensionar(fn: (() => void) | null) {
                visual.resizeCallback = typeof fn === "function" ? fn : null;
            },
            iaConfigurada() {
                return visual.iaConfigurada();
            },
            perguntarIA(prompt: string, opcoesOuContexto?: string | OpcoesIA) {
                return visual.perguntarIA(prompt, opcoesOuContexto);
            }
        };
        if (!anterior) {
            window.addEventListener("error", e => this.mostrarErro("Erro no JavaScript da medida", e.error || e.message));
        }
    }

    private aplicarFiltro(valores: any[] | null, tabela?: string, coluna?: string) {
        const card = this.formattingSettings ? this.formattingSettings.filtroCard : null;
        const t = tabela || (card ? card.tabela.value : "");
        const c = coluna || (card ? card.coluna.value : "");

        if (!valores || valores.length === 0) {
            this.host.applyJsonFilter(null as any, "general", "filter", FilterAction.remove);
            return;
        }
        if (!t || !c) {
            this.mostrarErro("Filtro não configurado", "Informe tabela e coluna em Formatar > Filtro, ou passe em pbi.filtrar(valores, 'tabela', 'coluna').");
            return;
        }
        const filtro: any = {
            // eslint-disable-next-line powerbi-visuals/no-http-string -- identificador do esquema de filtro do Power BI (não é uma requisição)
            $schema: "http://powerbi.com/product/schema#basic",
            target: { table: t, column: c },
            filterType: 1,
            operator: "In",
            values: valores
        };
        this.host.applyJsonFilter(filtro, "general", "filter", FilterAction.merge);
    }

    private baixar(conteudo: string, nome: string, tipo: string, descricao: string): Promise<boolean> {
        // Devolve false quando não baixou (sem serviço, bloqueado, cancelado ou erro) para o JS da medida oferecer outra saída.
        const servico = this.host.downloadService;
        if (!servico || typeof servico.exportVisualsContent !== "function") {
            return Promise.resolve(false);
        }
        const status = typeof servico.exportStatus === "function"
            ? Promise.resolve(servico.exportStatus())
            : Promise.resolve(powerbi.PrivilegeStatus.Allowed);
        return status
            .then(s => s === powerbi.PrivilegeStatus.Allowed
                ? Promise.resolve(servico.exportVisualsContent(conteudo, nome, tipo, descricao)).then(ok => !!ok)
                : false)
            .catch(() => false);
    }

    private iaConfigurada(): boolean {
        const ia = this.formattingSettings ? this.formattingSettings.iaCard : null;
        if (!ia) return false;
        const ch = ia.chave && ia.chave.value ? ia.chave.value.trim() : "";
        const ep = ia.endpoint && ia.endpoint.value ? ia.endpoint.value.trim() : "";
        return !!(ch || ep);
    }

    private async descobrirModelosDisponiveis(chaveApi: string): Promise<string[]> {
        try {
            const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(chaveApi));
            if (!resp.ok) return [];
            const data = await resp.json();
            if (!data || !Array.isArray(data.models)) return [];
            const nomes: string[] = [];
            for (const m of data.models) {
                const metodos: string[] = m.supportedGenerationMethods || [];
                const id = String(m.name || "").replace(/^models\//, "");
                if (metodos.indexOf("generateContent") >= 0 && /^gemini/i.test(id) && !/tts|image|embedding|veo|imagen|audio|robotics|computer-use/i.test(id)) {
                    nomes.push(id);
                }
            }
            nomes.sort((a, b) => {
                const score = (s: string) => (s.indexOf("flash-lite") >= 0 ? 0 : s.indexOf("flash") >= 0 ? 1 : 2);
                return score(a) - score(b);
            });
            return nomes;
        } catch {
            return [];
        }
    }

    private async perguntarIA(prompt: string, opcoesOuContexto?: string | OpcoesIA): Promise<string> {
        if (!prompt || !String(prompt).trim()) {
            throw new Error("O prompt para a IA não pode estar vazio.");
        }

        const ia = this.formattingSettings ? this.formattingSettings.iaCard : null;
        const opcoes: OpcoesIA = typeof opcoesOuContexto === "object" && opcoesOuContexto !== null && !Array.isArray(opcoesOuContexto)
            && ("dados" in opcoesOuContexto || "instrucao" in opcoesOuContexto || "modelo" in opcoesOuContexto || "apiKey" in opcoesOuContexto || "endpoint" in opcoesOuContexto || "temperatura" in opcoesOuContexto || "json" in opcoesOuContexto)
            ? (opcoesOuContexto as OpcoesIA)
            : { dados: opcoesOuContexto };

        const chaveApi = (opcoes.apiKey || (ia && ia.chave ? ia.chave.value : "") || "").trim();
        const modeloEscolhido = (opcoes.modelo || (ia && ia.modelo ? ia.modelo.value : "") || "auto").trim();
        const endpoint = (opcoes.endpoint || (ia && ia.endpoint ? ia.endpoint.value : "") || "").trim();
        const instrucao = (opcoes.instrucao !== undefined ? opcoes.instrucao : (ia && ia.instrucao ? ia.instrucao.value : "")).trim();
        const temperatura = typeof opcoes.temperatura === "number" ? opcoes.temperatura : 0.2;

        let textoFinal = String(prompt).trim();
        if (opcoes.dados !== undefined && opcoes.dados !== null && opcoes.dados !== "") {
            const serializado = typeof opcoes.dados === "string" ? opcoes.dados : JSON.stringify(opcoes.dados);
            textoFinal += "\n\nContexto de dados do painel:\n" + serializado;
        }

        if (endpoint) {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (chaveApi) {
                headers["Authorization"] = chaveApi.startsWith("Bearer ") ? chaveApi : "Bearer " + chaveApi;
                headers["x-api-key"] = chaveApi;
            }
            const resp = await fetch(endpoint, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    prompt: String(prompt).trim(),
                    textoCompleto: textoFinal,
                    dados: opcoes.dados,
                    instrucao,
                    modelo: modeloEscolhido,
                    temperatura,
                    json: !!opcoes.json
                })
            });
            const raw = await resp.text();
            if (!resp.ok) {
                throw new Error("Erro HTTP " + resp.status + " no endpoint de IA: " + raw.slice(0, 300));
            }
            try {
                const data = JSON.parse(raw);
                if (typeof data === "string") return data;
                if (data.resposta) return String(data.resposta);
                if (data.text) return String(data.text);
                if (data.output) return String(data.output);
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                    const todasParts = data.candidates[0].content.parts;
                    const semThought = todasParts.filter((p: any) => !p.thought && typeof p.text === "string");
                    const finais = semThought.length > 0 ? semThought : todasParts;
                    return finais.map((p: any) => p.text || "").join("");
                }
                return raw;
            } catch {
                return raw;
            }
        }

        if (!chaveApi) {
            throw new Error("Chave da API do Gemini não configurada. Preencha em Formatar > IA (Gemini) > Chave da API ou informe na tela.");
        }

        const payload: any = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: textoFinal }]
                }
            ],
            generationConfig: {
                temperature: temperatura
            }
        };

        if (instrucao) {
            payload.systemInstruction = {
                parts: [{ text: instrucao }]
            };
        }

        if (opcoes.json) {
            payload.generationConfig.responseMimeType = "application/json";
        }

        const candidatosPadrao = [
            "gemini-3.5-flash-lite",
            "gemini-3.5-flash",
            "gemini-3.6-flash",
            "gemini-3.8-flash",
            "gemini-3.7-flash"
        ];

        const filaModelos: string[] = [];
        if (modeloEscolhido && modeloEscolhido !== "auto" && !/gemma/i.test(modeloEscolhido)) {
            filaModelos.push(modeloEscolhido);
        }
        for (const m of candidatosPadrao) {
            if (filaModelos.indexOf(m) < 0) filaModelos.push(m);
        }

        let ultimoErro = "";
        let buscouDinamico = false;

        for (let i = 0; i < filaModelos.length; i++) {
            const mod = filaModelos[i];
            const url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + encodeURIComponent(mod)
                + ":generateContent?key="
                + encodeURIComponent(chaveApi);

            const bodyMod = JSON.parse(JSON.stringify(payload));
            if (/^gemini-3/i.test(mod)) {
                bodyMod.generationConfig = bodyMod.generationConfig || {};
                bodyMod.generationConfig.thinkingConfig = { thinkingLevel: "LOW" };
            }

            const resp = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyMod)
            });
            const raw = await resp.text();

            if (resp.ok) {
                const data = JSON.parse(raw);
                const uso = (window as any).pbi && (window as any).pbi.usoIA;
                if (uso && data && data.usageMetadata) {
                    const u = data.usageMetadata;
                    const pTok = Number(u.promptTokenCount || 0);
                    const cTok = Number(u.candidatesTokenCount || 0) + Number(u.thoughtsTokenCount || 0);
                    const tTok = Number(u.totalTokenCount || (pTok + cTok));
                    uso.ultimoPromptTokens = pTok;
                    uso.ultimoOutputTokens = cTok;
                    uso.ultimoTotalTokens = tTok;
                    uso.tokensAcumulados = Number(uso.tokensAcumulados || 0) + tTok;
                    uso.requisicoesTotal = Number(uso.requisicoesTotal || 0) + 1;
                    uso.modelos = uso.modelos || {};
                    const mInfo = uso.modelos[mod] || { reqs: 0, tokens: 0, limiteRpd: 20, esgotado: false };
                    mInfo.reqs += 1;
                    mInfo.tokens += tTok;
                    uso.modelos[mod] = mInfo;
                }
                const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
                if (parts && parts.length) {
                    (window as any).pbi.ultimoModeloUsado = mod;
                    const semThought = parts.filter((p: any) => !p.thought && typeof p.text === "string");
                    const finais = semThought.length > 0 ? semThought : parts;
                    return finais.map((p: any) => p.text || "").join("");
                }
            }

            let detalhe = raw.slice(0, 200);
            try {
                const errJson = JSON.parse(raw);
                if (errJson && errJson.error && errJson.error.message) {
                    detalhe = errJson.error.message;
                }
            } catch {
                // ignora erro de parse
            }
            if (resp.status === 429) {
                const uso = (window as any).pbi && (window as any).pbi.usoIA;
                if (uso) {
                    uso.modelos = uso.modelos || {};
                    const mInfo = uso.modelos[mod] || { reqs: 20, tokens: 0, limiteRpd: 20, esgotado: true };
                    mInfo.esgotado = true;
                    mInfo.reqs = Math.max(mInfo.reqs, mInfo.limiteRpd || 20);
                    uso.modelos[mod] = mInfo;
                }
            }
            ultimoErro = "Erro HTTP " + resp.status + " (" + mod + "): " + detalhe;

            if (resp.status === 401 || resp.status === 403 || (resp.status === 400 && /API_KEY|key/i.test(detalhe))) {
                throw new Error(ultimoErro);
            }

            if (!buscouDinamico && (resp.status === 404 || resp.status === 503 || resp.status === 429)) {
                buscouDinamico = true;
                const descobertos = await this.descobrirModelosDisponiveis(chaveApi);
                for (const dm of descobertos) {
                    if (filaModelos.indexOf(dm) < 0) {
                        filaModelos.push(dm);
                    }
                }
            }
        }

        throw new Error(ultimoErro || "Não foi possível obter resposta dos modelos Gemini no momento.");
    }

    private mostrarErro(titulo: string, erro: any) {
        let caixa = this.target.querySelector(".hjv-erro") as HTMLElement;
        if (!caixa) {
            caixa = document.createElement("div");
            caixa.className = "hjv-erro";
            this.target.appendChild(caixa);
        }
        caixa.textContent = titulo + ": " + (erro && erro.message ? erro.message : String(erro));
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
