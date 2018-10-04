// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { spawn, ChildProcess, execSync, exec } from 'child_process';
import { URL } from 'url';
import { IDisposable } from '@phosphor/disposable';
import { createDeferred, Deferred } from '../../utils/async';
import * as tk from 'tree-kill';

export interface IConnectionInfo {
    baseUrl: string;
    token: string;
}

// This class communicates with an instance of jupyter that's running in the background
export class JupyterProcess implements IDisposable {

    private startPromise: Deferred<IConnectionInfo> | undefined;
    private process: ChildProcess | undefined;
    private static urlPattern = /http:\/\/localhost:[0-9]+\/\?token=[a-z0-9]+/g;

    public isDisposed: boolean = false;

    public start(notebookdir: string) {
        // Compute args based on if inside a workspace or not
        let args: string [] = ['notebook', '--no-browser', `--notebook-dir=${notebookdir}`];

        // Setup our start promise
        this.startPromise = createDeferred<IConnectionInfo>();

        // Spawn a jupyter process in the same directory as our notebook
        this.process = spawn('jupyter', args, {detached: false, cwd: notebookdir});

        // Listen on stderr for its connection information
        this.process.stderr.on('data', (data: any) => this.extractConnectionInformation(data));
        this.process.stdout.on('data', (data: any) => this.output(data));
    }

    // Returns the information necessary to talk to this instance
    public async getConnectionInformation() : Promise<IConnectionInfo> {
        if (this.startPromise) {
            return await this.startPromise!.promise;
        }

        return { baseUrl: '', token: ''};
    }

    public dispose() {
        if (!this.isDisposed && this.process) {
            this.isDisposed = true;
            if (!this.process.killed) {
                tk(this.process.pid);
            }
        }
    }

    private output(data: any) {
        console.log(data.toString('utf8'));
    }

    private extractConnectionInformation(data: any) {
        console.log(data.toString('utf8'));
        // Look for a Jupyter Notebook url in the string received.
        let urlMatch = JupyterProcess.urlPattern.exec(data);

        if(urlMatch && this.startPromise) {
            const url = new URL(urlMatch[0]);
            this.startPromise.resolve({ baseUrl: `${url.protocol}//${url.host}/`, token: `${url.searchParams.get("token")}` });
        }

        // Do we need to worry about this not working? Timeout?

    }
}
