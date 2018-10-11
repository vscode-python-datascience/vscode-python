// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { Kernel, KernelMessage, ServerConnection, Session } from '@jupyterlab/services';
import { IDisposable } from '@phosphor/disposable';
import * as fssync from 'fs';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as temp from 'temp';
import * as tp from 'typed-promisify';
import * as vscode from 'vscode';
import * as localize from '../../utils/localize';
import '../common/extensions';
import { IFileSystem } from '../common/platform/types';
import { IPythonExecutionService } from '../common/process/types';
import { ILogger } from '../common/types';
import { parseExecuteMessage } from './jupyterExecuteParser';
import { JupyterProcess } from './jupyterProcess';
import { ICell, IJupyterServer } from './types';

// This code is based on the examples here:
// https://www.npmjs.com/package/@jupyterlab/services

export class JupyterServer implements IJupyterServer, IDisposable {
    private static trackingTemps: boolean = false;
    private static textPlainMimeType : string = 'text/plain';
    public isDisposed: boolean = false;
    private session: Session.ISession | undefined;
    private tempFile: temp.OpenFile | undefined;
    private fileSystem: IFileSystem;
    private process: JupyterProcess;
    private onStatusChangedEvent : vscode.EventEmitter<boolean> = new vscode.EventEmitter<boolean>();
    private logger: ILogger;

    constructor(fileSystem: IFileSystem, logger: ILogger, pythonService: IPythonExecutionService) {
        this.fileSystem = fileSystem;
        this.logger = logger;
        this.process = new JupyterProcess(pythonService);
    }

    public async start(notebookFile? : string) : Promise<boolean> {

        try {
            // First generate a temporary notebook. We need this as input to the session
            this.tempFile = await this.generateTempFile(notebookFile);

            // start our process in the same directory as our ipynb file.
            this.process.start(path.dirname(this.tempFile.path), this.logger);

            // Wait for connection information. We'll stick that into the options
            const connInfo = await this.process.getConnectionInformation();

            // Create our session options using this temporary notebook and our connection info
            const options: Session.IOptions = {
                path: this.tempFile.path,
                kernelName: 'python',
                serverSettings: ServerConnection.makeSettings(
                    {
                        baseUrl: connInfo.baseUrl,
                        token: connInfo.token,
                        pageUrl: '',
                        // A web socket is required to allow token authentication
                        wsUrl: connInfo.baseUrl.replace('http', 'ws'),
                        init: { cache: 'no-store', credentials: 'same-origin' }
                    })
            };

            // Start a new session
            this.session = await Session.startNew(options);

            // Setup the default imports (this should be configurable in the future)
            this.execute(
                'import pandas as pd\r\nimport numpy\r\n%matplotlib inline\r\nimport matplotlib.pyplot as plt',
                'foo.py',
                -1).ignoreErrors();

            return true;
        } catch (err) {

            // For now just put up a message
            if (vscode.window) {
                vscode.window.showErrorMessage(err);
            }

            return false;
        }

    }

    public getCurrentState() : Promise<ICell[]> {
        return Promise.resolve([]);
    }

    public async execute(code: string, file: string, line: number) : Promise<ICell> {
        // If we have a session, execute the code now.
        if (this.session) {
            const id = await this.makeId(file, line);

            if (id) {
                const request = this.session.kernel.requestExecute(
                    {
                        // Replace windows line endings with unix line endings.
                        code : code.replace('\r\n', '\n'),
                        stop_on_error: false,
                        allow_stdin: false
                    },
                    true
                );

                return this.awaitExecuteResponse(code, id, request);
            }
        }

        return Promise.reject(localize.DataScience.sessionDisposed);
    }

    public get onStatusChanged() : vscode.Event<boolean> {
        return this.onStatusChangedEvent.event.bind(this.onStatusChangedEvent);
    }

    public async dispose() {
        if (!this.isDisposed) {
            this.isDisposed = true;
            this.onStatusChangedEvent.dispose();
            if (this.session) {
                await this.session.shutdown();
                this.session.dispose();
            }
            if (this.process) {
                this.process.dispose();
            }
        }
    }

    private async makeId(file: string, line: number) {
        let hash = await this.fileSystem.getFileHash(file);
        hash += line.toString();
        return hash;
    }

    // private async readNotebook(notebookFile: string) : Promise<ICell[]> {
    //     const manager = new ContentsManager();
    //     const contents = await manager.get(notebookFile, { type: 'notebook' });
    //     return [];
    // }

    private async awaitExecuteResponse(code: string, id: string, request: Kernel.IFuture) : Promise<ICell> {

        // Start out empty;
        const cell: ICell = {
            input: code,
            output: {},
            id: id
        };

        // Listen to the request messages
        request.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
            if (KernelMessage.isExecuteResultMsg(msg)) {
                this.handleExecuteResult(msg as KernelMessage.IExecuteResultMsg, cell);
            } else if (KernelMessage.isExecuteInputMsg(msg)) {
                this.handleExecuteInput(msg as KernelMessage.IExecuteInputMsg, cell);
            } else if (KernelMessage.isStatusMsg(msg)) {
                this.handleStatusMessage(msg as KernelMessage.IStatusMsg);
            } else if (KernelMessage.isStreamMsg(msg)) {
                this.handleStreamMesssage(msg as KernelMessage.IStreamMsg, cell);
            } else if (KernelMessage.isDisplayDataMsg(msg)) {
                this.handleDisplayData(msg as KernelMessage.IDisplayDataMsg, cell);
            } else if (KernelMessage.isErrorMsg(msg)) {
                this.handleError(msg as KernelMessage.IErrorMsg, cell);
            } else {
                this.logger.logWarning(`Unknown message ${msg.header.msg_type} : hasData=${'data' in msg.content}`);
            }
        };

        // Wait for the request to finish
        await request.done;

        // Cell should be filled in now.
        return cell;
    }

    private handleExecuteResult(msg: KernelMessage.IExecuteResultMsg, cell: ICell) {
        parseExecuteMessage(msg, cell);
    }

    private handleExecuteInput(msg: KernelMessage.IExecuteInputMsg, cell: ICell) {
        cell.input = msg.content.code;
    }

    private handleStatusMessage(msg: KernelMessage.IStatusMsg) {
        if (msg.content.execution_state === 'busy') {
            this.onStatusChangedEvent.fire(true);
        } else {
            this.onStatusChangedEvent.fire(false);
        }
    }

    private handleTextPlain(text: string, cell: ICell) {
        if (cell.output.hasOwnProperty(JupyterServer.textPlainMimeType)) {
            cell.output[JupyterServer.textPlainMimeType] = `${cell.output[JupyterServer.textPlainMimeType].toString()}\n${text}`;
        } else {
            cell.output[JupyterServer.textPlainMimeType] = text;
        }
    }

    private handleStreamMesssage(msg: KernelMessage.IStreamMsg, cell: ICell) {
        // Stream/concat the text together
        this.handleTextPlain((msg.content.text), cell);
    }

    private handleDisplayData(msg: KernelMessage.IDisplayDataMsg, cell: ICell) {
        cell.output = msg.content.data;
    }

    private handleError(msg: KernelMessage.IErrorMsg, cell: ICell) {
        // Stream/concat the text together
        this.handleTextPlain((msg.content.evalue), cell);
    }

    private async generateTempFile(notebookFile?: string) : Promise<temp.OpenFile> {
        // Make sure we cleanup these temp files.
        if (!JupyterServer.trackingTemps) {
            JupyterServer.trackingTemps = true;
            temp.track();
        }

        // Create a temp file on disk
        const asyncOpen = tp.promisify(temp.open);
        const file: temp.OpenFile = await asyncOpen({ suffix: '.ipynb'});

        // Copy the notebook file into it if necessary
        if (notebookFile && file) {
            if (await fs.pathExists(notebookFile)) {
                fssync.copyFileSync(notebookFile, file.path);
            }
        }

        return file;
    }
}
