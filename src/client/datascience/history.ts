// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as path from 'path';
import * as localize from '../../utils/localize';
import { IWebPanel, IWebPanelMessageListener, IWebPanelProvider } from '../common/application/types';
import { IServiceContainer } from '../ioc/types';
import { IJupyterServer, IJupyterServerProvider, ICell } from './types';
import { HistoryMessages } from './constants';

export class History implements IWebPanelMessageListener {
    private static activeHistory: History;
    private webPanel : IWebPanel | undefined;
    // tslint:disable-next-line: no-unused-variable
    private jupyterServer: IJupyterServer | undefined;
    private loadPromise: Promise<void>;
    private cells: ICell[] = [];

    constructor(serviceContainer: IServiceContainer) {
        // Load on a background thread.
        this.loadPromise = this.load(serviceContainer);
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
        if (this.jupyterServer) {
            // First attempt to evaluate this cell in the jupyter notebook
            const newCell = await this.jupyterServer.execute(code, file, line);

            // Save the new cell in our current state
            this.cells.push(newCell);

            // Send our new state to our panel
            if (this.webPanel) {
                this.webPanel.postMessage({type: HistoryMessages.UpdateState, payload: this.cells});
            }
        }
    }

    // tslint:disable-next-line: no-any no-empty
    public async onMessage(message: string, payload: any) {
    }

    // tslint:disable-next-line: no-any no-empty
    public onDisposed() {
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
