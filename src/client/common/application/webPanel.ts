// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as fs from 'async-file';
import * as path from 'path';
import { ViewColumn, WebviewPanel, window, Uri } from 'vscode';
import { IWebPanelMessageListener, IWebPanel } from './types';
import * as localize from '../../../utils/localize';
import { IServiceContainer } from '../../ioc/types';
import { IDisposableRegistry } from '../types';

export class WebPanel implements IWebPanel {

    private listener: IWebPanelMessageListener;
    private panel: WebviewPanel;
    private loadPromise: Promise<void>;
    private disposableRegistry: IDisposableRegistry;
    private rootPath: string;

    constructor(serviceContainer: IServiceContainer, listener: IWebPanelMessageListener, title: string, htmlPath:string) {
        this.disposableRegistry = serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
        this.listener = listener;
        this.rootPath = path.dirname(htmlPath);
        this.panel = window.createWebviewPanel(
            title.toLowerCase().replace(' ', ''),
            title,
            ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [Uri.file(this.rootPath)]
            });
        this.loadPromise = this.load(htmlPath);
    }

    public async show() {
        await this.loadPromise;
        if (this.panel) {
            this.panel.reveal(ViewColumn.Two);
        }
    }

    public isVisible() : boolean {
        return this.panel ? this.panel.visible : false;
    }

    private async load(htmlPath: string) {
        if (await fs.exists(htmlPath)) {
            // vscode:resource URIs should already be translated. This means
            // the contents of the file should be loadable inside of the webview as is
            this.panel.webview.html = await fs.readFile(htmlPath, 'utf8');

            // Reset when the current panel is closed
            this.disposableRegistry.push(this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.listener.onDisposed();
            }));

            this.panel.webview.onDidReceiveMessage(message => {
                // Pass the message onto our listener
                this.listener.onMessage(message.command, message);
            });
        }
        else {
            // Indicate that we can't load the file path
            const badPanelString = localize.DataScience.badWebPanelFormatString();
            this.panel.webview.html = badPanelString.format(htmlPath);
        }
    }
}
