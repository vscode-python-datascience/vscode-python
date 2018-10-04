// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { IDisposable } from '@phosphor/disposable';
import { ChildProcess, spawn } from 'child_process';
import * as tk from 'tree-kill';
import { URL } from 'url';
import { createDeferred, Deferred } from '../../utils/async';
import { ILogger } from '../common/types';

export interface IConnectionInfo {
    baseUrl: string;
    token: string;
}

// This class communicates with an instance of jupyter that's running in the background
export class JupyterProcess implements IDisposable {

    private static urlPattern = /http:\/\/localhost:[0-9]+\/\?token=[a-z0-9]+/g;

    public isDisposed: boolean = false;

    private startPromise: Deferred<IConnectionInfo> | undefined;
    private process: ChildProcess | undefined;
    private logger: ILogger | undefined;

    public start(notebookdir: string, logger: ILogger) {
        this.logger = logger;

        // Compute args based on if inside a workspace or not
        const args: string [] = ['notebook', '--no-browser', `--notebook-dir=${notebookdir}`];

        // Setup our start promise
        this.startPromise = createDeferred<IConnectionInfo>();

        // Spawn a jupyter process in the same directory as our notebook
        this.process = spawn('jupyter', args, {detached: false, cwd: notebookdir});

        // Listen on stderr for its connection information
        // tslint:disable-next-line:no-any
        this.process.stderr.on('data', (data: any) => this.extractConnectionInformation(data));
        // tslint:disable-next-line:no-any
        this.process.stdout.on('data', (data: any) => this.output(data));
    }

    // Returns the information necessary to talk to this instance
    public getConnectionInformation() : Promise<IConnectionInfo> {
        if (this.startPromise) {
            return this.startPromise!.promise;
        }

        return Promise.resolve({ baseUrl: '', token: ''});
    }

    public dispose() {
        if (!this.isDisposed && this.process) {
            this.isDisposed = true;
            if (!this.process.killed) {
                tk(this.process.pid);
            }
        }
    }

    // tslint:disable-next-line:no-any
    private output(data: any) {
        if (this.logger) {
            this.logger.logInformation(data.toString('utf8'));
        }
    }

    // tslint:disable-next-line:no-any
    private extractConnectionInformation(data: any) {
        this.output(data);

        // Look for a Jupyter Notebook url in the string received.
        const urlMatch = JupyterProcess.urlPattern.exec(data);

        if (urlMatch && this.startPromise) {
            const url = new URL(urlMatch[0]);
            this.startPromise.resolve({ baseUrl: `${url.protocol}//${url.host}/`, token: `${url.searchParams.get('token')}` });
        }

        // Do we need to worry about this not working? Timeout?

    }
}
