"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/**
 * Coluna padrão que pbi.filtrar(valores) filtra quando o JS não informa tabela/coluna.
 */
class FiltroCardSettings extends FormattingSettingsCard {
    tabela = new formattingSettings.TextInput({
        name: "tabela",
        displayName: "Tabela",
        value: "fVendas",
        placeholder: "ex.: fVendas"
    });

    coluna = new formattingSettings.TextInput({
        name: "coluna",
        displayName: "Coluna",
        value: "Campanha",
        placeholder: "ex.: Campanha"
    });

    name: string = "filtro";
    displayName: string = "Filtro";
    slices: Array<FormattingSettingsSlice> = [this.tabela, this.coluna];
}

/**
 * Configuração opcional de Inteligência Artificial (Google Gemini / Endpoint customizado)
 * para uso via pbi.perguntarIA(prompt, opcoesOuContexto).
 */
class IACardSettings extends FormattingSettingsCard {
    chave = new formattingSettings.TextInput({
        name: "apiKey",
        displayName: "Chave da API (Gemini / Token)",
        value: "",
        placeholder: "Cole sua Gemini API Key..."
    });

    modelo = new formattingSettings.TextInput({
        name: "modelo",
        displayName: "Modelo Gemini",
        value: "gemini-3.5-flash-lite",
        placeholder: "ex.: gemini-3.5-flash-lite ou gemini-3.5-flash"
    });

    endpoint = new formattingSettings.TextInput({
        name: "endpoint",
        displayName: "Endpoint Customizado (Opcional)",
        value: "",
        placeholder: "Vazio = API oficial do Google, ou URL Cloud Function"
    });

    instrucao = new formattingSettings.TextInput({
        name: "instrucao",
        displayName: "Instrução de Sistema",
        value: "Você é um analista de dados executivo. Responda em português do Brasil de forma direta, analítica e orientada a negócios.",
        placeholder: "Instrução base para a IA..."
    });

    name: string = "ia";
    displayName: string = "IA (Gemini)";
    slices: Array<FormattingSettingsSlice> = [this.chave, this.modelo, this.endpoint, this.instrucao];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    filtroCard = new FiltroCardSettings();
    iaCard = new IACardSettings();

    cards = [this.filtroCard, this.iaCard];
}
