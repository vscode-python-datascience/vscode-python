// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

//import { EventEmitter } from 'events';
//import { EOL } from 'os';
//import { Range, Position, TextDocument, workspace } from 'vscode';

//// IANHU MOVE:
//export interface JupyterSettings {
    //appendResults: boolean;
    //languages: JupyterLanguageSetting[];
//}

//export interface JupyterLanguageSetting {
    //languageId: string;
    //defaultKernel?: string;
    //cellIdentificationPattern?: string;
    //startupCode?: string[];
//}

//export interface LanguageProvider {
    //cellIdentifier: RegExp;
    //getSelectedCode(selectedCode: string, currentCell?: Range): Promise<string>;
    //getFirstLineOfExecutableCode(document: TextDocument, range: Range): Promise<Position>;
//}

//export class LanguageProviders extends EventEmitter {
    //constructor() {
        //super();
    //}
    //private static languageProviders: LanguageProviders = new LanguageProviders();
    //raiseLanguageProvderRegistered(language: string) {
        //this.emit('onLanguageProviderRegistered', language);
    //}
    //public static getInstance(): LanguageProviders {
        //return LanguageProviders.languageProviders;
    //}
    //private static providers: Map<string, LanguageProvider> = new Map<string, LanguageProvider>();
    //public static registerLanguageProvider(language: string, provider: LanguageProvider) {
        //if (typeof language !== 'string' || language.length === 0) {
            //throw new Error(`Argument 'language' is invalid`);
        //}
        //if (typeof provider !== 'object' || language === null) {
            //throw new Error(`Argument 'provider' is invalid`);
        //}
        //let languageRegistered = LanguageProviders.providers.has(language);
        //LanguageProviders.providers.set(language, provider);
        //if (!languageRegistered) {
            //LanguageProviders.getInstance().raiseLanguageProvderRegistered(language);
        //}
    //}
    //public static cellIdentifier(language: string): RegExp {
        //let settings = LanguageProviders.getLanguageSetting(language);
        //if (settings && settings.cellIdentificationPattern && settings.cellIdentificationPattern.length > 0) {
            //return new RegExp(settings.cellIdentificationPattern, 'i');
        //}
        //return LanguageProviders.providers.has(language) ?
            //LanguageProviders.providers.get(language).cellIdentifier : null;
    //}
    //public static getSelectedCode(language: string, selectedCode: string, currentCell?: Range): Promise<string> {
        //return LanguageProviders.providers.has(language) ?
            //LanguageProviders.providers.get(language).getSelectedCode(selectedCode, currentCell) :
            //Promise.resolve(selectedCode);
    //}
    //public static getFirstLineOfExecutableCode(language: string, defaultRange: Range, document: TextDocument, range: Range): Promise<Position> {
        //return LanguageProviders.providers.has(language) ?
            //LanguageProviders.providers.get(language).getFirstLineOfExecutableCode(document, range) :
            //Promise.resolve(defaultRange.start);
    //}
    //private static getLanguageSetting(language: string): JupyterLanguageSetting {
        //let jupyterConfig = workspace.getConfiguration('jupyter');
        //let langSettings = jupyterConfig.get('languages') as JupyterLanguageSetting[];
        //let lowerLang = language.toLowerCase();
        //return langSettings.find(setting => setting.languageId.toLowerCase() === lowerLang);
    //}

    //public static getDefaultKernel(language: string): string {
        //let langSetting = LanguageProviders.getLanguageSetting(language);
        //return langSetting ? langSetting.defaultKernel : null;
    //}
    //public static getStartupCode(language: string): string {
        //let langSetting = LanguageProviders.getLanguageSetting(language);
        //if (!langSetting || langSetting.startupCode.length === 0) {
            //return null;
        //}
        //return langSetting.startupCode.join(EOL);
    //}
//}
