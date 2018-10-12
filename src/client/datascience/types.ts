// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { nbformat } from '@jupyterlab/coreutils';
import { CodeLens, CodeLensProvider, Event, Range, TextDocument } from 'vscode';
import { ICommandManager } from '../common/application/types';

// Main interface
export const IDataScience = Symbol('IDataScience');
export interface IDataScience {
    activate(): Promise<void>;
}

export const IDataScienceCommandListener = Symbol('IDataScienceCommandListener');
export interface IDataScienceCommandListener {
    register(commandManager: ICommandManager);
}

// Factory for jupyter servers
export const IJupyterServerProvider = Symbol('IJupyterServerFactory');
export interface IJupyterServerProvider {
    start(notebookFile? : string): Promise<IJupyterServer>;
    isSupported() : Promise<boolean>;
}

// Talks to a jupyter kernel to retrieve data for cells
export const IJupyterServer = Symbol('IJupyterServer');
export interface IJupyterServer {
    onStatusChanged: Event<boolean>;
    getCurrentState() : Promise<ICell[]>;
    execute(code: string, file: string, line: number) : Promise<ICell>;
}

export const IHistoryProvider = Symbol('IHistoryProvider');
export interface IHistoryProvider {
    getOrCreateHistory() : Promise<IHistory>;
}

export const IHistory = Symbol('IHistory');
export interface IHistory {
    show() : Promise<void>;
    addCode(code: string, file: string, line: number) : Promise<void>;
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
    getFileName() : string;
    getVersion() : number;
    getCodeLenses() : CodeLens[];
    addFile(document: TextDocument);
    runCell(range: Range);
}

// Basic structure for a cell from a notebook
export interface ICell {
    input: string;
    output: nbformat.IMimeBundle;
    executionCount: number;
    id: string;
}
