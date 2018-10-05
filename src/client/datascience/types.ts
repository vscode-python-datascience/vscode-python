// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { CodeLens, CodeLensProvider } from 'vscode';

// Main interface
export const IDataScience = Symbol('IDataScience');
export interface IDataScience {
    activate(): Promise<void>;
    executeDataScience(): Promise<void>;
}

// Factory for jupyter servers
export const IJupyterServerProvider = Symbol('IJupyterServerFactory');
export interface IJupyterServerProvider {
    start(notebookFile: string | undefined): Promise<IJupyterServer>;
}

// Talks to a jupyter kernel to retrieve data for cells
export const IJupyterServer = Symbol('IJupyterServer');
export interface IJupyterServer {
}

// Wraps the VS Code api for creating a web panel
export const IWebPanelProvider = Symbol('IWebPanelProvider');
export interface IWebPanelProvider {
    create(): IWebPanel;
}

// Wraps the VS Code webview panel
export const IWebPanel = Symbol('IWebPanel');
export interface IWebPanel {
}

// Wraps the vscode API in order to send messages back and forth from a webview
export const IPostOffice = Symbol('IPostOffice');
export interface IPostOffice {
    // tslint:disable-next-line:no-any
    post(message: string, params: any[] | undefined);
    // tslint:disable-next-line:no-any
    listen(message: string, listener: (args: any[] | undefined) => void);
}

// Wraps the vscode CodeLensProvider base class
export const IDataScienceCodeLensProvider = Symbol('IDataScienceCodeLensProvider');
export interface IDataScienceCodeLensProvider extends CodeLensProvider {
}

// Wraps the Code Watcher API
export const ICodeWatcher = Symbol('ICodeWatcher');
export interface ICodeWatcher {
    fileName: string;
    documentVersion: number;
    getCodeLenses() : CodeLens[];
    addFile(fileName: string, documentVersion: number);
    addCodeLenses(newLenses: CodeLens[]);
}

// Basic structure for a cell from a notebook
export interface ICell {
    input: string;
    output: string;
    id: number;
}
