// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as fs from 'fs-extra';
import * as path from 'path';
import { Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import '../../common/extensions';

import * as localize from '../../../utils/localize';
import { IServiceContainer } from '../../ioc/types';
import { IDisposableRegistry } from '../types';
import { IWebPanel, IWebPanelMessageListener, IWebPanelMessage  } from './types';

export class WebPanel implements IWebPanel {

    private listener: IWebPanelMessageListener;
    private panel: WebviewPanel | undefined;
    private loadPromise: Promise<void>;
    private disposableRegistry: IDisposableRegistry;
    private rootPath: string;

    constructor(serviceContainer: IServiceContainer, listener: IWebPanelMessageListener, title: string, mainScriptPath: string) {
        this.disposableRegistry = serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
        this.listener = listener;
        this.rootPath = path.dirname(mainScriptPath);
        this.panel = window.createWebviewPanel(
            title.toLowerCase().replace(' ', ''),
            title,
            ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [Uri.file(this.rootPath)]
            });
        this.loadPromise = this.load(mainScriptPath);
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

    public postMessage(message: IWebPanelMessage) {
        if (this.panel && this.panel.webview) {
            this.panel.webview.postMessage(message);
        }
    }

    private async load(mainScriptPath: string) {
        if (this.panel) {
            if (await fs.pathExists(mainScriptPath)) {

                // Call our special function that sticks this script inside of an html page
                // and translates all of the paths to vscode-resource URIs
                this.panel.webview.html = this.generateReactHtml(mainScriptPath);

                // Reset when the current panel is closed
                this.disposableRegistry.push(this.panel.onDidDispose(() => {
                    this.panel = undefined;
                    this.listener.onDisposed();
                }));

                this.disposableRegistry.push(this.panel.webview.onDidReceiveMessage(message => {
                    // Pass the message onto our listener
                    this.listener.onMessage(message.command, message).ignoreErrors();
                }));
            } else {
                // Indicate that we can't load the file path
                const badPanelString = localize.DataScience.badWebPanelFormatString();
                this.panel.webview.html = badPanelString.format(mainScriptPath);
            }
        }
    }

    private generateReactHtml(mainScriptPath: string) {
        const uriBasePath = Uri.file(`${path.dirname(mainScriptPath)}/`);
        const uriPath = Uri.file(mainScriptPath);
        const uriBase = uriBasePath.with({ scheme: 'vscode-resource'});
        const uri = uriPath.with({ scheme: 'vscode-resource' });

        return `<!doctype html>
        <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
                <meta name="theme-color" content="#000000">
                <title>React App</title>
                <base href="${uriBase}"/>
            </head>
            <body>
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="root"></div>
                <script type="text/javascript">
                    function resolvePath(relativePath) {
                        if (relativePath && relativePath[0] == '.' && relativePath[1] != '.') {
                            return "${uriBase}" + relativePath.substring(1);
                        }

                        return "${uriBase}" + relativePath;
                    }
                </script>
            <script type="text/javascript" src="${uri}"></script></body>
        </html>`;
    }
}