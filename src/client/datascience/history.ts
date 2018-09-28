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

export class History implements IWebPanelMessageListener {
    private static activeHistory: History = undefined;
    private webPanel : IWebPanel;
    private jupyterServer: IJupyterServer;
    private loadPromise: Promise<void>;

    constructor(serviceContainer: IServiceContainer) {
        // Load on a background thread.
        this.loadPromise = this.load(serviceContainer);
    }

    public static getActive(serviceContainer: IServiceContainer) {
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
        return this.webPanel.show();
    }

    private async loadJupyterServer(serviceContainer: IServiceContainer) : Promise<void> {
        // Startup our jupyter server
        const provider = serviceContainer.get<IJupyterServerProvider>(IJupyterServerProvider);
        this.jupyterServer = await provider.start();
    }

    private async loadWebPanel(serviceContainer: IServiceContainer) : Promise<void> {
        // Create our web panel (it's the UI that shows up for the history)
        const provider = serviceContainer.get<IWebPanelProvider>(IWebPanelProvider);
        this.webPanel = provider.create();

        // Load the HTML so we can stick it into the webview panel
        const extensionContext = serviceContainer.get<IExtensionContext>(IExtensionContext);

        // Figure out the name of our index.html. Should be in our output directory
        const htmlFilePath = path.join(extensionContext.extensionPath, "client", "datascience", "history-react", "index.html");

        // Load our html from our index.html
        const fileContents = await fs.readFile(htmlFilePath);
        this.webPanel.load(fileContents);
    }

    private async load(serviceContainer: IServiceContainer) : Promise<void> {
        // Wait for the jupyter server to startup and create our panel
        await Promise.all([
            this.loadWebPanel(serviceContainer), 
            this.loadJupyterServer(serviceContainer)
        ]);
    }
}