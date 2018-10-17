// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Position, Range, Selection, TextEditor, Uri, ViewColumn } from 'vscode';
import { IApplicationShell, IDocumentManager, IWebPanel, IWebPanelMessageListener, IWebPanelProvider  } from '../common/application/types';
import * as localize from '../common/utils/localize';
import { IServiceContainer } from '../ioc/types';
import { HistoryMessages } from './constants';
import { ICell, IJupyterServer, IJupyterServerProvider  } from './types';

export class History implements IWebPanelMessageListener {
    private static activeHistory: History;
    private webPanel : IWebPanel | undefined;
    // tslint:disable-next-line: no-unused-variable
    private jupyterServer: IJupyterServer | undefined;
    private loadPromise: Promise<void>;
    private documentManager : IDocumentManager;
    private applicationShell : IApplicationShell;

    constructor(serviceContainer: IServiceContainer) {
        // Load on a background thread.
        this.loadPromise = this.load(serviceContainer);

        // Save our services
        this.documentManager = serviceContainer.get<IDocumentManager>(IDocumentManager);
        this.applicationShell = serviceContainer.get<IApplicationShell>(IApplicationShell);
    }

    public static getOrCreateActive(serviceContainer: IServiceContainer) {
        if (!(this.activeHistory)) {
            this.activeHistory = new History(serviceContainer);
        }
        return this.activeHistory;
    }

    public static setActive(active: History) {
        this.activeHistory = active;
    }

    public async show() : Promise<void> {
        // Make sure we're loaded first
        await this.loadPromise;

        // Then show our web panel.
        if (this.webPanel) {
            await this.webPanel.show();
        }
    }

    public async addCode(code: string, file: string, line: number) : Promise<void> {
        // Make sure we're loaded first.
        await this.loadPromise;

        if (this.jupyterServer) {
            // First attempt to evaluate this cell in the jupyter notebook
            const newCell = await this.jupyterServer.execute(code, file, line);

            // Send our new state to our panel
            if (this.webPanel) {
                this.webPanel.postMessage({type: HistoryMessages.AddCell, payload: newCell});
            }
        }
    }

    // tslint:disable-next-line: no-any no-empty
    public onMessage = (message: string, payload: any) => {
        switch (message) {
            case HistoryMessages.GotoCodeCell:
                this.gotoCode(payload.file, payload.line);
                break;

            case HistoryMessages.RestartKernel:
                this.restartKernel();
                break;

            case HistoryMessages.Export:
                this.export(payload);
                break;

            default:
                break;
        }
    }

    // tslint:disable-next-line: no-any no-empty
    public onDisposed() {
    }

    private gotoCode = (file: string, line: number) => {
        this.documentManager.showTextDocument(Uri.file(file), { viewColumn: ViewColumn.One }).then((editor: TextEditor) => {
            editor.revealRange(new Range(line, 0, line, 0));
            editor.selection = new Selection(new Position(line, 0), new Position(line, 0));
        });
    }

    private restartKernel = () => {
        if (this.jupyterServer) {
            this.jupyterServer.restartKernel();
        }
    }

    // tslint:disable-next-line: no-any no-empty
    private export = (payload: any) => {
        if (payload.contents) {
            // Should be an array of cells
            const cells = payload.contents as ICell[];
            if (cells && this.applicationShell) {

                const filtersKey = localize.DataScience.exportDialogFilter();
                const filtersObject = {};
                filtersObject[filtersKey] = ['ipynb'];

                // Bring up the open file dialog box
                this.applicationShell.showSaveDialog(
                    {
                        saveLabel: localize.DataScience.exportDialogTitle(),
                        filters: filtersObject
                    }).then(async (uri: Uri | undefined) => {
                        if (uri) {
                            await this.exportToFile(cells, uri.fsPath);
                        }
                    });
            }
        }
    }

    private exportToFile = async (cells: ICell[], file : string) => {
        // Take the list of cells, convert them to a notebook json format and write to disk
        if (this.jupyterServer) {
            const notebook = await this.jupyterServer.translateToNotebook(cells);

            try {
                // tslint:disable-next-line: no-any
                await fs.writeFile(file, JSON.stringify(notebook, (k: string, v: any) => v, '\n'), {encoding: 'utf8', flag: 'w'});
                this.applicationShell.showInformationMessage(localize.DataScience.exportDialogComplete().format(file), localize.DataScience.exportOpenQuestion()).then((str : string | undefined) => {
                    if (str && file && this.jupyterServer) {
                        // If the user wants to, open the notebook they just generated.
                        this.jupyterServer.launchNotebook(file).ignoreErrors();
                    }
                });
            } catch (exc) {
                this.applicationShell.showInformationMessage(localize.DataScience.exportDialogFailed().format(exc));
            }

        }
    }

    private async loadJupyterServer(serviceContainer: IServiceContainer) : Promise<void> {
        // Startup our jupyter server
        const provider = serviceContainer.get<IJupyterServerProvider>(IJupyterServerProvider);
        this.jupyterServer = await provider.start();
    }

    private async loadWebPanel(serviceContainer: IServiceContainer) : Promise<void> {
        // Create our web panel (it's the UI that shows up for the history)
        const provider = serviceContainer.get<IWebPanelProvider>(IWebPanelProvider);

        // Figure out the name of our main bundle. Should be in our output directory
        const mainScriptPath = path.join(__dirname, 'history-react', 'index_bundle.js');

        // Use this script to create our web view panel. It should contain all of the necessary
        // script to communicate with this class.
        this.webPanel = provider.create(this, localize.DataScience.historyTitle(), mainScriptPath);
    }

    private async load(serviceContainer: IServiceContainer) : Promise<void> {
        // Wait for the jupyter server to startup and create our panel
        await Promise.all([
            this.loadWebPanel(serviceContainer),
            this.loadJupyterServer(serviceContainer)
        ]);
    }
}
