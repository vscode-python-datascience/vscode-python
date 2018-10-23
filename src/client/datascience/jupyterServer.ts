// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { nbformat } from '@jupyterlab/coreutils';
import { Kernel, KernelMessage, ServerConnection, Session } from '@jupyterlab/services';
import { IDisposable } from '@phosphor/disposable';
import * as fssync from 'fs';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Observable } from 'rxjs/Observable';
import * as temp from 'temp';
import * as tp from 'typed-promisify';
import * as uuid from 'uuid/v4';
import * as vscode from 'vscode';
import '../common/extensions';
import { IPythonExecutionService } from '../common/process/types';
import { ILogger } from '../common/types';
import { createDeferred } from '../common/utils/async';
import * as localize from '../common/utils/localize';
import { JupyterProcess } from './jupyterProcess';
import { CellState, ICell, IJupyterServer } from './types';
import { RegExpValues } from './constants';

// This code is based on the examples here:
// https://www.npmjs.com/package/@jupyterlab/services

export class JupyterServer implements IJupyterServer {
    private static trackingTemps: boolean = false;
    public isDisposed: boolean = false;
    private session: Session.ISession | undefined;
    private tempFile: temp.OpenFile | undefined;
    private process: JupyterProcess;
    private onStatusChangedEvent : vscode.EventEmitter<boolean> = new vscode.EventEmitter<boolean>();
    private logger: ILogger;

    constructor(logger: ILogger, pythonService: IPythonExecutionService) {
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
            this.executeSilently(
                'import pandas as pd\r\nimport numpy\r\n%matplotlib inline\r\nimport matplotlib.pyplot as plt'
                ).ignoreErrors();

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

    public execute(code : string, file: string, line: number) : Promise<ICell[]> {
        // Create a deferred that we'll fire when we're done
        const deferred = createDeferred<ICell[]>();

        // Attempt to evaluate this cell in the jupyter notebook
        const observable = this.executeObservable(code, file, line);
        let output: ICell[];

        observable.subscribe(
            (cells: ICell[]) => {
                output = cells;
            },
            (error) => {
                deferred.resolve(output);
            },
            () => {
                deferred.resolve(output);
            });

        // Wait for the execution to finish
        return deferred.promise;
    }

    public executeObservable(code: string, file: string, line: number) : Observable<ICell[]> {
        // If we have a session, execute the code now.
        if (this.session) {

            // Replace windows line endings with unix line endings.
            let copy = code.replace('\r\n', '\n');

            // Determine if we have a markdown cell/ markdown and code cell combined/ or just a code cell
            const split = copy.split('\n')
            const firstLine = split[0];
            if (RegExpValues.PythonMarkdownCellMarker.test(firstLine)) {
                // We have at least one markdown. We might have to split it if there any lines that don't begin
                // with #
                const firstNonMarkdown = split.findIndex((l : string) => !l.trim().startsWith('#'));
                if (firstNonMarkdown >= 0) {
                    // We need to combine results
                    return this.combineObservables(
                        this.executeMarkdownObservable(split.slice(0, firstNonMarkdown).join('\n'), file, line),
                        this.executeCodeObservable(split.slice(firstNonMarkdown).join('\n'), file, line + firstNonMarkdown));
                }
                else {
                    // Just a normal markdown case
                    return this.combineObservables(
                        this.executeMarkdownObservable(code, file, line));
                }
            } else {
                // Normal code case
                return this.combineObservables(
                    this.executeCodeObservable(code, file, line));
            }
        }

        // Can't run because no session
        return new Observable<ICell[]>(subscriber => {
            subscriber.error(localize.DataScience.sessionDisposed());
            subscriber.complete();
        });
    }

    public async executeSilently(code: string) : Promise<void> {
        // If we have a session, execute the code now.
        if (this.session) {
                const request = this.session.kernel.requestExecute(
                    {
                        // Replace windows line endings with unix line endings.
                        code : code.replace('\r\n', '\n'),
                        stop_on_error: false,
                        allow_stdin: false,
                        silent: true
                    },
                    true
                );

                await this.generateExecuteObservable(code, 'file', 0, '0', request).toPromise();

                return;
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

    public restartKernel = () => {
        if (this.session && this.session.kernel) {
            this.session.kernel.restart().ignoreErrors();
        }
    }

    public async translateToNotebook (cells: ICell[]) : Promise<nbformat.INotebookContent | undefined> {

        if (this.process) {

            // First we need the python version we're running
            const pythonVersion = await this.process.getPythonVersionString();

            // Pull off the first number. Should be  3 or a 2
            const first = pythonVersion.substr(0, 1);

            // Use this to build our metadata object
            const metadata : nbformat.INotebookMetadata = {
                kernelspec: {
                    display_name: `Python ${first}`,
                    language: 'python',
                    name: `python${first}`
                },
                language_info: {
                    name: 'python',
                    codemirror_mode: {
                        name: 'ipython',
                        version: parseInt(first, 10)
                    }
                },
                orig_nbformat : 2,
                file_extension: '.py',
                mimetype: 'text/x-python',
                name: 'python',
                npconvert_exporter: 'python',
                pygments_lexer: `ipython${first}`,
                version: pythonVersion
            };

            // Combine this into a JSON object
            return {
                cells: cells.map((cell : ICell) => this.pruneCell(cell)),
                nbformat: 4,
                nbformat_minor: 2,
                metadata: metadata
            };
        }
    }

    public async launchNotebook(file: string) : Promise<boolean> {
        if (this.process) {
            await this.process.spawn(file);
            return true;
        }
        return false;
    }

    private pruneCell(cell : ICell) : nbformat.IBaseCell {
        return cell.data;
    }

    private combineObservables = (...args : Observable<ICell>[]) : Observable<ICell[]> =>{
        return new Observable<ICell[]>(subscriber => {
            // When all complete, we have our results
            const results : ICell[] = [];

            args.forEach(o => {
                o.subscribe(c => {
                    results.push(c);
                    if (results.length == args.length) {
                        subscriber.next(results);
                        subscriber.complete();
                    }
                },
                e => {
                    subscriber.error(e);
                })
            })
        })
    }

    private executeCodeObservable = (code: string, file: string, line: number) : Observable<ICell> => {

        // Send an execute request with this code
        const id = uuid();
        const request = this.session.kernel.requestExecute(
            {
                code : code,
                stop_on_error: false,
                allow_stdin: false
            },
            true
        );

        return this.generateExecuteObservable(code, file, line, id, request);
    }

    private executeMarkdownObservable = (code: string, file: string, line: number) : Observable<ICell> => {

        return new Observable<ICell>(subscriber => {
            // Generate markdown by stripping out the comment and markdown header
            const markdown = code.split('\n').slice(1).map(s => `${s.trim().slice(1)}\n`);

            const cell: ICell = {
                id: uuid(),
                file: file,
                line: line,
                state: CellState.finished,
                data : {
                    cell_type : 'markdown',
                    source: markdown,
                    metadata:{}
                }
            };

            subscriber.next(cell);
            subscriber.complete();
        })
    }

    private generateExecuteObservable(code: string, file: string, line: number, id: string, request: Kernel.IFuture) : Observable<ICell> {
        return new Observable<ICell>(subscriber => {
            // Start out empty;
            const cell: ICell = {
                data : {
                    source: code.split('\n'),
                    cell_type: 'code',
                    outputs: [],
                    metadata: {},
                    execution_count: 0,
                },
                id: id,
                file: file,
                line: line,
                state: CellState.init
            };

            // Tell our listener.
            subscriber.next(cell);

            // Transition to the busy stage
            cell.state = CellState.executing;
            subscriber.next(cell);

            // Listen to the reponse messages and update state as we go
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

                // Set execution count, all messages should have it
                if (msg.content.execution_count) {
                    cell.data.execution_count = msg.content.execution_count as number;
                }
            };

            // Create completion and error functions so we can bind our cell object
            const completion = () => {
                cell.state = CellState.finished;
                subscriber.next(cell);
                subscriber.complete();
            };
            const error = () => {
                cell.state = CellState.error;
                subscriber.next(cell);
                subscriber.complete();
            };

            // When the request finishes we are done
            request.done.then(completion, error);
        });
    }

    private addToCellData = (cell: ICell, output : nbformat.IUnrecognizedOutput | nbformat.IExecuteResult | nbformat.IDisplayData | nbformat.IStream | nbformat.IError) => {
        const data : nbformat.ICodeCell = cell.data as nbformat.ICodeCell;
        data.outputs = [...data.outputs, output];
        cell.data = data;
    }

    private handleExecuteResult(msg: KernelMessage.IExecuteResultMsg, cell: ICell) {
        this.addToCellData(cell, { output_type : 'execute_result', data: msg.content.data, metadata : msg.content.metadata, execution_count : msg.content.execution_count });
    }

    private handleExecuteInput(msg: KernelMessage.IExecuteInputMsg, cell: ICell) {
        cell.data.execution_count = msg.content.execution_count;
    }

    private handleStatusMessage(msg: KernelMessage.IStatusMsg) {
        if (msg.content.execution_state === 'busy') {
            this.onStatusChangedEvent.fire(true);
        } else {
            this.onStatusChangedEvent.fire(false);
        }
    }

    private handleStreamMesssage(msg: KernelMessage.IStreamMsg, cell: ICell) {
        const output : nbformat.IStream = {
            output_type : 'stream',
            name : msg.content.name,
            text : msg.content.text
        };
        this.addToCellData(cell, output);
    }

    private handleDisplayData(msg: KernelMessage.IDisplayDataMsg, cell: ICell) {
        const output : nbformat.IDisplayData = {
            output_type : 'display_data',
            data: msg.content.data,
            metadata : msg.content.metadata
        };
        this.addToCellData(cell, output);
    }

    private handleError(msg: KernelMessage.IErrorMsg, cell: ICell) {
        const output : nbformat.IError = {
            output_type : 'error',
            ename : msg.content.ename,
            evalue : msg.content.evalue,
            traceback : msg.content.traceback
        };
        this.addToCellData(cell, output);
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
