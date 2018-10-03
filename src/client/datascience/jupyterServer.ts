// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as fs from 'async-file';
import * as temp from 'temp';
import * as path from 'path';
import { ContentsManager, Session, Kernel, KernelMessage } from '@jupyterlab/services';
import { IJupyterServer, ICell } from './types';
import { IFileSystem } from '../common/platform/types';

// This code is based on the examples here:
// https://www.npmjs.com/package/@jupyterlab/services

export class JupyterServer implements IJupyterServer {
    private session: Session.ISession;
    private static trackingTemps: boolean = false;
    private tempFile: temp.OpenFile;
    private fileSystem: IFileSystem;

    constructor(fileSystem: IFileSystem) {
        this.fileSystem = fileSystem;
    }

    public async start(notebookFile? : string) : Promise<boolean> {
        // First generate a temporary notebook. We need this as input to the session
        this.tempFile = await this.generateTempFile(notebookFile)

        // Create our session options using this temporary notebook
        let options: Session.IOptions = {
            path: this.tempFile.path,
            kernelName: "python"
        }

        // Start a new session
        this.session = await Session.startNew(options);

        return true;
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

            return await this.awaitExecuteResponse(id, request);
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

    private async awaitExecuteResponse(id: string, request: Kernel.IFuture) : Promise<ICell> {

        // Start out empty;
        let cell: ICell = {
            input: "",
            output: "",
            id: id
        }
        request.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
            if (KernelMessage.isExecuteResultMsg(msg)) {
                console.log("is execution result")
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

        let file: temp.OpenFile;
        // Create a temp file on disk named .ipynb
        temp.open({ suffix: '.ipynb'}, (err: any, result:temp.OpenFile) => {
            if (!err) {
                file = result;
            }
        });

        // Copy the notebook file into it if necessary
        if (notebookFile && file) {
            if (await fs.exists(notebookFile)) {
                await this.copyFileAsync(notebookFile, file.path);
            }
        }

        return file;
    }

    private async copyFileAsync(source: string, target: string) {
        var rd = fs.createReadStream(source);
        var wr = fs.createWriteStream(target);
        try {
            return await new Promise(function(resolve, reject) {
                rd.on('error', reject);
                wr.on('error', reject);
                wr.on('finish', resolve);
                rd.pipe(wr);
            });
        } catch (error) {
            rd.destroy();
            wr.end();
            throw error;
        }
    }

}
