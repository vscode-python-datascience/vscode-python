// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as nls from 'vscode-nls';
import { IServiceContainer } from '../ioc/types';
import { IJupyterServer, IJupyterServerProvider } from './types';
import * as fs from "async-file";
import * as path from "path";
import { IExtensionContext } from '../common/types';
import { IWebPanel, IWebPanelProvider, IWebPanelMessageListener } from '../common/application/types';
import * as localize from '../../utils/localize';

export class History implements IWebPanelMessageListener {
    private static activeHistory: History = undefined;
    private webPanel : IWebPanel;
    private jupyterServer: IJupyterServer;
    private loadPromise: Promise<void>;

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
        await this.webPanel.show();
    }

    public async onMessage(message: string, payload: any) {

    }

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
        const extensionContext = serviceContainer.get<IExtensionContext>(IExtensionContext);

        // Figure out the name of our index.html. Should be in our output directory
        const htmlFilePath = path.join(__dirname, "history-react", "index.html");

        // Use this html file to create our web view panel. It should contain all of the necessary
        // script to communicate with this class.
        this.webPanel = provider.create(this, localize.DataScience.historyTitle(), htmlFilePath);
    }

    private async load(serviceContainer: IServiceContainer) : Promise<void> {
        // Wait for the jupyter server to startup and create our panel
        await Promise.all([
            this.loadWebPanel(serviceContainer),
            this.loadJupyterServer(serviceContainer)
        ]);
    }
}
