// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as fs from 'async-file';
import * as fssync from 'fs';
import * as path from 'path';
import * as temp from 'temp';
import * as tp from 'typed-promisify';
import * as vscode from 'vscode';
import { ContentsManager, Session, Kernel, KernelMessage, ServerConnection } from '@jupyterlab/services';
import { IJupyterServer, ICell } from './types';
import { IFileSystem } from '../common/platform/types';
import { JupyterProcess } from './jupyterProcess';
import { IDisposable } from '@phosphor/disposable';

// This code is based on the examples here:
// https://www.npmjs.com/package/@jupyterlab/services

export class JupyterServer implements IJupyterServer, IDisposable {
    private session: Session.ISession;
    private static trackingTemps: boolean = false;
    private tempFile: temp.OpenFile;
    private fileSystem: IFileSystem;
    private process: JupyterProcess;
    public isDisposed: boolean = false;

    constructor(fileSystem: IFileSystem) {
        this.fileSystem = fileSystem;
        this.process = new JupyterProcess();
    }

    public async start(notebookFile? : string) : Promise<boolean> {

        try {
            // First generate a temporary notebook. We need this as input to the session
            this.tempFile = await this.generateTempFile(notebookFile)

            // start our process in the same directory as our ipynb file.
            this.process.start(path.dirname(this.tempFile.path));

            // Wait for connection information. We'll stick that into the options
            const connInfo = await this.process.getConnectionInformation();

            // Create our session options using this temporary notebook and our connection info
            let options: Session.IOptions = {
                path: this.tempFile.path,
                kernelName: "python",
                serverSettings: ServerConnection.makeSettings(
                    {
                        baseUrl: connInfo.baseUrl,
                        token: connInfo.token,
                        pageUrl: '',
                        // A web socket is required to allow token authentication
                        wsUrl: connInfo.baseUrl.replace('http', 'ws'),
                        init: { cache: "no-store", credentials: "same-origin" }
                    })
            }

            // Start a new session
            this.session = await Session.startNew(options);

            return true;
        } catch (err) {

            // For now just put up a message
            if (vscode.window) {
                vscode.window.showErrorMessage(err);
            }

            return false;
        }

    }

    public async getCurrentState() : Promise<ICell[]> {
        return [];
    }

    public async execute(code: string, file: string, line: number) : Promise<ICell> {
        // If we have a session, execute the code now.
        if (this.session) {
            const id = await this.makeId(file, line);
            const request = this.session.kernel.requestExecute(
                {
                    // Replace windows line endings with unix line endings.
                    code : code.replace('\r\n', '\n'),
                    stop_on_error: false,
                    allow_stdin: false
                }
            );

            return await this.awaitExecuteResponse(code, id, request);
        }
    }

    public async dispose() {
        if (!this.isDisposed) {
            this.isDisposed = true;
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

    private async readNotebook(notebookFile: string) : Promise<ICell[]> {
        const manager = new ContentsManager();
        const contents = await manager.get(notebookFile, { type: 'notebook' });
        return [];
    }

    private async awaitExecuteResponse(code: string, id: string, request: Kernel.IFuture) : Promise<ICell> {

        // Start out empty;
        let cell: ICell = {
            input: code,
            output: "",
            id: id
        }
        request.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
            console.log(msg.content);
            if (KernelMessage.isExecuteResultMsg(msg)) {
                const resultMsg: KernelMessage.IExecuteResultMsg = msg;
                console.log("is execution result for " + resultMsg.content.data);
            }
        }

        // Wait for the request to finish
        await request.done;

        // Cell should be filled in now.
        return cell;
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
            if (await fs.exists(notebookFile)) {
                await fssync.copyFile(notebookFile, file.path, () => {});
            }
        }

        return file;
    }
}
