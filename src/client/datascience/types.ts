import { ICommandManager } from "../common/application/types";

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

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
}

// Talks to a jupyter kernel to retrieve data for cells
export const IJupyterServer = Symbol('IJupyterServer');
export interface IJupyterServer {
    getCurrentState() : Promise<ICell[]>;
    execute(code: string, file: string, line: number) : Promise<ICell>;
}

// Wraps the vscode API in order to send messages back and forth from a webview
export const IPostOffice = Symbol('IPostOffice');
export interface IPostOffice {
    // tslint:disable-next-line:no-any
    post(message: string, params: any[] | undefined);
    // tslint:disable-next-line:no-any
    listen(message: string, listener: (args: any[] | undefined) => void);
}

// Basic structure for a cell from a notebook
export interface ICell {
    input: string;
    output: string;
    id: string;
}
